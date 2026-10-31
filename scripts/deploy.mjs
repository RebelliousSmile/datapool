// Déploie datapool (site statique) sur un compte alwaysdata (SSH).
//
//   pnpm deploy:prod <cible> --check   build et staging locaux, sans contacter la cible
//   pnpm deploy:prod <cible>           prévisualisation (lectures distantes seulement)
//   pnpm deploy:prod <cible> --apply   synchronisation, bascule et contrôle HTTP
//
// Seul le contenu d'un commit part (git archive, en LF), jamais la copie de
// travail. Le site est construit dans un staging Linux natif (WSL) avec l'URL de
// l'API de la cible, complété d'un .htaccess (repli monopage, CSP), puis
// synchronisé dans <appDir>.new (défaut ~/www/datapool) et basculé sur <appDir>,
// racine du site statique alwaysdata. Aucun secret : le jeton se saisit dans
// le navigateur. Le .env de webpool (<webpoolEnvFile>) n'est que lu sur la
// cible, pour vérifier que l'API accepte l'origine du site.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORS_ORIGINS_READ,
  DEPLOY_PATHS,
  assertWslHome,
  buildHtaccess,
  contentSecurityPolicy,
  corsAllows,
  inlineScriptHashes,
  missingKeyHelp,
  parseArgs,
  parseItemized,
  shQuote,
  sshOptions,
  validateTarget,
  withRemoteLock,
} from './deploy-lib.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseArgs(process.argv.slice(2));

function git(args, extra = {}) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf-8', ...extra });
}

// --exec : aucun shell WSL ne réinterprète les arguments.
function wsl(args, extra = {}) {
  return execFileSync('wsl', ['--exec', ...args], { encoding: 'utf-8', ...extra });
}

// --- Cible ------------------------------------------------------------------

const targetsPath = join(repoRoot, 'deploy', 'targets.json');
if (!existsSync(targetsPath)) {
  throw new Error('deploy/targets.json absent : copier deploy/targets.example.json et le renseigner (fichier ignoré par git)');
}
const target = validateTarget(options.target, JSON.parse(readFileSync(targetsPath, 'utf-8'))[options.target]);

// --- Validations locales ----------------------------------------------------

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
if (branch !== 'main' && !options.anyBranch) {
  throw new Error(`Déploiement refusé : branche « ${branch} », attendu « main » (forcer avec --any-branch)`);
}
const commit = git(['rev-parse', 'HEAD']).trim();
const shortCommit = commit.slice(0, 7);
if (git(['status', '--porcelain']).trim()) {
  console.warn(`⚠ Copie de travail modifiée : ces changements ne partiront pas, seul le commit ${shortCommit} est envoyé.`);
}
const { version } = JSON.parse(git(['show', `${commit}:package.json`]));
console.log(`datapool v${version} — commit ${shortCommit} (${branch}) → cible ${target.name} (${target.remote}:~/${target.appDir}, API ${target.apiUrl})`);

// --- Staging Linux natif (WSL) et build ------------------------------------

const wslHome = assertWslHome(wsl(['printenv', 'HOME']).trim());
const stageDir = `${wslHome}/deploy-stage/datapool-${target.name}`;
const buildDir = `${stageDir}/build`;
// git archive applique la conversion de fin de ligne de la copie de travail :
// avec core.autocrlf=true (Windows), il produirait du CRLF.
const archive = execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', commit, '--', ...DEPLOY_PATHS], {
  cwd: repoRoot,
  maxBuffer: 64 * 1024 * 1024,
});
wsl(['bash', '-c', 'rm -rf "$1" && mkdir -p "$1" && tar -xf - -C "$1"', 'stage', stageDir], { input: archive });
// WSL hérite du PATH Windows : sans ~/.local/bin en tête, « pnpm » résoudrait
// vers le pnpm.exe Windows. L'URL de l'API est figée dans le bundle au build.
wsl([
  'bash', '-lc',
  'export PATH="$HOME/.local/bin:$PATH" && cd "$1" && pnpm install --frozen-lockfile && VITE_WEBPOOL_API_URL="$2" pnpm build',
  'build', stageDir, target.apiUrl,
], { stdio: 'inherit' });

const indexHtml = wsl(['cat', `${buildDir}/index.html`]);
const scriptHashes = inlineScriptHashes(indexHtml);
const csp = contentSecurityPolicy({ apiOrigin: target.apiOrigin, scriptHashes });
wsl(['bash', '-c', 'cat > "$1"', 'htaccess', `${buildDir}/.htaccess`], { input: buildHtaccess(csp) });
console.log(`Staging : ${buildDir} (${scriptHashes.length} script(s) en ligne dans la CSP)`);

if (options.check) {
  console.log('Validations locales OK — aucune connexion à la cible.');
  process.exit(0);
}

// --- Accès distant ----------------------------------------------------------

const keyPath = target.sshKey.replace(/^~/, wslHome);
try {
  wsl(['test', '-f', keyPath]);
} catch {
  throw new Error(missingKeyHelp({ keyPath, sshKey: target.sshKey, remote: target.remote, comment: `datapool-${target.name}` }));
}

const sshOpts = sshOptions(keyPath, wslHome);

function ssh(remoteCommand) {
  return wsl(['ssh', ...sshOpts, target.remote, remoteCommand]);
}

function rsync(destDir, { dryRun, linkDest }) {
  // -p : sans lui, --chmod n'est pas appliqué et --link-dest lie aussi des fichiers
  // aux droits différents (le lien dur partage l'inode, donc les droits de l'ancien)
  const args = ['rsync', '-rlpz', '--delete', '--checksum', '--chmod=D755,F644', '--itemize-changes'];
  if (dryRun) args.push('--dry-run');
  // relatif au répertoire de destination : les fichiers inchangés sont des liens durs
  if (linkDest) args.push(`--link-dest=../${basename(target.appDir)}`);
  args.push('-e', `ssh ${sshOpts.join(' ')}`, `${buildDir}/`, `${target.remote}:${destDir}/`);
  return wsl(args);
}

// --- État de la cible -------------------------------------------------------

const guardRaw = ssh(`cat ${target.guardPath} 2>/dev/null || true`).trim();
if (guardRaw) {
  const guard = JSON.parse(guardRaw);
  const expected = target.guard;
  if (guard.targetId !== expected.targetId || guard.phase !== expected.phase || guard.lifecycleRevision !== expected.lifecycleRevision) {
    throw new Error(`Garde distante incompatible : attendu ${JSON.stringify(expected)}, trouvé ${guardRaw}`);
  }
}

// Sans l'origine du site dans le CORS de l'API, l'interface se charge mais toutes
// ses requêtes échouent. Le fichier reste sur la cible ; seule cette clé en sort.
if (ssh(`test -f "$HOME"/${target.webpoolEnvFile} && echo present || echo absent`).trim() !== 'present') {
  throw new Error(`~/${target.webpoolEnvFile} absent sur la cible : déployer webpool d'abord (ou corriger webpoolEnvFile)`);
}
const corsOrigins = ssh(`NODEJS_VERSION=${target.nodeVersion} node -e ${shQuote(CORS_ORIGINS_READ)} "$HOME"/${target.webpoolEnvFile}`).trim();
if (!corsAllows(corsOrigins, target.siteOrigin)) {
  throw new Error([
    `WEBPOOL_API_CORS_ORIGINS de ~/${target.webpoolEnvFile} n'autorise pas ${target.siteOrigin} (valeur : « ${corsOrigins} »).`,
    "L'y ajouter (origines séparées par des virgules, sans / final), puis redémarrer le site de l'API.",
  ].join('\n'));
}
console.log(`CORS de webpool : ${target.siteOrigin} autorisée`);

const appExists = ssh(`test -d ${target.appDir} && echo present || echo absent`).trim() === 'present';
const lastRaw = ssh(`cat ${target.stateDir}/last-deploy.json 2>/dev/null || true`).trim();
const previousCommit = lastRaw ? JSON.parse(lastRaw).commit : null;
console.log(`En ligne : ${previousCommit ? previousCommit.slice(0, 7) : appExists ? 'version inconnue' : 'rien (premier déploiement)'}`);

// --- Prévisualisation -------------------------------------------------------

const changes = parseItemized(rsync(target.appDir, { dryRun: true, linkDest: false }));
const deletions = changes.filter(({ flags }) => flags === '*deleting').length;
console.log(`\n${changes.length} changement(s) par rapport à ~/${target.appDir} (${deletions} suppression(s)) :`);
for (const { flags, path } of changes.slice(0, 40)) console.log(`  ${flags} ${path}`);
if (changes.length > 40) console.log(`  … et ${changes.length - 40} autres`);
if (!guardRaw) console.log(`\nGarde absente : elle sera posée dans ~/${target.guardPath}.`);

if (!options.apply) {
  console.log('\nPrévisualisation seulement. Relancer avec --apply pour synchroniser et basculer.');
  process.exit(0);
}

// --- Application ------------------------------------------------------------

ssh(`mkdir -p ${target.stateDir}`);
if (!guardRaw) ssh(`printf '%s\\n' ${shQuote(JSON.stringify(target.guard))} > ${target.guardPath}`);

await withRemoteLock(ssh, target, async () => {
  // La version précédente n'est purgée qu'ici, au début du déploiement suivant :
  // la restauration reste possible jusque-là.
  ssh(`rm -rf ${target.oldDir} ${target.newDir}`);

  console.log(`\nSynchronisation vers ~/${target.newDir}...`);
  rsync(target.newDir, { dryRun: false, linkDest: appExists });

  // Preuve des droits sur tout l'arbre livré (répertoires 755, fichiers 644) :
  // un umask complaisant ne peut pas masquer un chemin trop permissif.
  const badModes = ssh(`find ${target.newDir} \\( -type d ! -perm 755 \\) -o \\( -type f ! -perm 644 \\) -print | head -5`).trim();
  if (badModes) throw new Error(`Droits inattendus après synchronisation :\n${badModes}`);
  ssh(`test -f ${target.newDir}/index.html && test -f ${target.newDir}/.htaccess`);

  console.log('Bascule...');
  ssh(`if [ -d ${target.appDir} ]; then mv ${target.appDir} ${target.oldDir}; fi && mv ${target.newDir} ${target.appDir}`);

  const record = { commit, version, previousCommit, apiUrl: target.apiUrl, at: new Date().toISOString() };
  ssh(`printf '%s\\n' ${shQuote(JSON.stringify(record))} > ${target.stateDir}/last-deploy.json`);

  if (appExists) {
    console.log('\nRestauration si besoin (jusqu\'au prochain déploiement) :');
    console.log(`  wsl ssh -i ${target.sshKey} ${target.remote} "mv ${target.appDir} ${target.appDir}.broken && mv ${target.oldDir} ${target.appDir}"`);
  }
});

// --- Contrôle HTTP ----------------------------------------------------------

// La racine et une route profonde (repli index.html) doivent répondre 200 avec la CSP.
console.log(`\nContrôle HTTP de ${target.siteUrl}...`);
for (const path of ['/', '/pools']) {
  const response = await fetch(`${target.siteUrl}${path}`, { redirect: 'manual' });
  if (response.status !== 200) throw new Error(`${target.siteUrl}${path} : HTTP ${response.status}, attendu 200`);
  if (response.headers.get('content-security-policy') !== csp) {
    throw new Error(`${target.siteUrl}${path} : Content-Security-Policy absente ou différente de celle du .htaccess (mod_headers ?)`);
  }
}

console.log(`\nDéployé : datapool v${version} (${shortCommit}) sur ${target.name} — ${target.siteUrl}`);

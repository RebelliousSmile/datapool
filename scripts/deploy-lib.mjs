// Fonctions pures du déploiement (scripts/deploy.mjs) : aucune n'appelle git, WSL
// ni le réseau, pour rester testables par vitest. withRemoteLock reçoit la
// fonction ssh en paramètre pour la même raison.

import { createHash } from 'node:crypto';

// Liste blanche de ce qui part en staging : de quoi installer les dépendances et
// construire le site. Seul le résultat du build (build/) part sur la cible.
export const DEPLOY_PATHS = ['src', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'vite.config.js', 'LICENSE'];

const SAFE_PATH = /^[A-Za-z0-9._/-]+$/;
const SAFE_HOST = /^[a-z0-9.-]+$/i;
const SAFE_USER = /^[a-z0-9._-]+$/i;

/** @type {Record<string, 'apply' | 'check' | 'anyBranch'>} */
const FLAGS = {
  '--apply': 'apply',
  '--check': 'check',
  '--any-branch': 'anyBranch',
};

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{ target: string | null, apply: boolean, check: boolean, anyBranch: boolean }} */
  const options = { target: null, apply: false, check: false, anyBranch: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg.startsWith('--')) {
      const key = FLAGS[arg];
      if (!key) throw new Error(`Option inconnue : ${arg}`);
      options[key] = true;
      continue;
    }
    if (options.target) throw new Error(`Une seule cible attendue, reçu « ${options.target} » et « ${arg} »`);
    options.target = arg;
  }
  if (!options.target) throw new Error('Cible manquante : pnpm deploy:prod <cible> [--check | --apply]');
  if (options.apply && options.check) throw new Error('--apply et --check sont incompatibles');
  return options;
}

/** @param {unknown} value */
export function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

// Relatif au home SSH : on ne devine pas /home/<compte>. Le chemin est ensuite
// interpolé sans guillemets dans des commandes distantes, d'où la liste blanche.
/** @param {string} field @param {string | undefined} value @returns {string} */
export function validateRemoteRelativePath(field, value) {
  if (value == null || !SAFE_PATH.test(value) || value.startsWith('/') || value.includes('..')) {
    throw new Error(`${field} doit être un chemin relatif au home SSH (reçu : ${value})`);
  }
  return value;
}

// URL https sans identifiants, ni requête, ni fragment : elle finit dans la CSP
// et dans le bundle.
/** @param {string} field @param {string} name @param {unknown} value */
function validateHttpsUrl(field, name, value) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw new Error(`${field} illisible pour « ${name} » : ${value}`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`${field} doit être une URL https sans identifiants, requête ni fragment (reçu : ${value})`);
  }
  return url;
}

/**
 * @param {string | null | undefined} name
 * @param {any} raw entrée de deploy/targets.json
 */
export function validateTarget(name, raw) {
  if (name == null || !/^[a-z0-9-]+$/.test(name)) throw new Error(`Nom de cible invalide : ${name}`);
  if (!raw || typeof raw !== 'object') throw new Error(`Cible « ${name} » absente de deploy/targets.json`);
  const { host, user, sshKey, lifecycleRevision } = raw;
  if (!SAFE_HOST.test(host ?? '')) throw new Error(`host invalide pour « ${name} » : ${host}`);
  if (!SAFE_USER.test(user ?? '')) throw new Error(`user invalide pour « ${name} » : ${user}`);
  if (!/^~\/\.ssh\/[A-Za-z0-9._-]+$/.test(sshKey ?? '')) {
    throw new Error(`sshKey doit être une clé de ~/.ssh côté WSL (reçu : ${sshKey})`);
  }
  // racine du site statique alwaysdata : chaque projet sous ~/www
  const appDir = validateRemoteRelativePath('appDir', raw.appDir ?? 'www/datapool');
  // la bascule déplace appDir : jamais le webroot lui-même
  if (/^www\/?$/i.test(appDir)) throw new Error(`appDir doit être un sous-répertoire de ~/www, pas ~/www (reçu : ${appDir})`);
  const siteUrl = validateHttpsUrl('siteUrl', name, raw.siteUrl);
  const apiUrl = validateHttpsUrl('apiUrl', name, raw.apiUrl);
  // .env de production de webpool, lu sur la cible pour vérifier son CORS
  const webpoolEnvFile = validateRemoteRelativePath('webpoolEnvFile', raw.webpoolEnvFile ?? 'www/webpool.env');
  const nodeVersion = String(raw.nodeVersion ?? '24');
  if (!/^\d+$/.test(nodeVersion)) throw new Error(`nodeVersion doit être une version majeure (reçu : ${nodeVersion})`);
  if (!Number.isInteger(lifecycleRevision) || lifecycleRevision < 1) {
    throw new Error(`lifecycleRevision doit être un entier ≥ 1 pour « ${name} »`);
  }

  const stateDir = `deploy/datapool-${name}`;
  return {
    name,
    remote: `${user}@${host}`,
    sshKey,
    appDir,
    newDir: `${appDir}.new`,
    oldDir: `${appDir}.old`,
    siteUrl: siteUrl.href.replace(/\/$/, ''),
    siteOrigin: siteUrl.origin,
    apiUrl: apiUrl.href.replace(/\/$/, ''),
    apiOrigin: apiUrl.origin,
    webpoolEnvFile,
    nodeVersion,
    stateDir,
    guardPath: `${stateDir}/guard.json`,
    lockPath: `${stateDir}/lock`,
    guard: { targetId: name, phase: 'production', lifecycleRevision },
  };
}

// HOME de WSL, interpolé dans un `rm -rf` de staging : refuser tout ce qui
// n'est pas /home/<utilisateur> ou /root.
/** @param {string | undefined} home */
export function assertWslHome(home) {
  if (!/^\/(?:root|home\/[A-Za-z0-9._-]+)$/.test(home ?? '')) {
    throw new Error(`HOME de WSL inattendu : « ${home} » (attendu /home/<utilisateur> ou /root)`);
  }
  return home;
}

/** @param {string} keyPath @param {string} wslHome */
export function sshOptions(keyPath, wslHome) {
  return [
    '-i', keyPath,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=4',
    '-o', 'ControlMaster=auto',
    '-o', `ControlPath=${wslHome}/.ssh/cm-%r@%h:%p`,
    '-o', 'ControlPersist=60s',
  ];
}

/** @param {{ keyPath: string, sshKey: string, remote: string, comment: string }} help */
export function missingKeyHelp({ keyPath, sshKey, remote, comment }) {
  return [
    `Clé SSH absente côté WSL : ${keyPath}`,
    `  wsl ssh-keygen -t ed25519 -N "" -C ${comment} -f ${sshKey}`,
    `  wsl ssh-copy-id -i ${sshKey}.pub ${remote}`,
  ].join('\n');
}

// Exécuté par node sur la cible (argument : le .env de webpool). N'écrit que
// WEBPOOL_API_CORS_ORIGINS : DATABASE_URL et les clés des providers ne sortent pas.
export const CORS_ORIGINS_READ = `
process.loadEnvFile(process.argv[1]);
process.stdout.write(process.env.WEBPOOL_API_CORS_ORIGINS ?? '');
`;

// Même découpage et même comparaison exacte que webpool (src/config.js, src/api/server.js).
/** @param {string} raw @param {string} origin */
export function corsAllows(raw, origin) {
  return raw.split(',').map((o) => o.trim()).filter(Boolean).includes(origin);
}

// Empreintes CSP des scripts en ligne de la page (thème avant rendu, amorce de
// SvelteKit) : sans elles, script-src 'self' bloquerait l'application.
/** @param {string} html */
export function inlineScriptHashes(html) {
  const hashes = [];
  for (const [, body] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

// Le jeton d'API vit dans le localStorage : aucune ressource tierce, et l'API
// est la seule origine contactée (données et vignettes de son cache).
// Les attributs style="" posés par Svelte imposent 'unsafe-inline' pour les styles.
/** @param {{ apiOrigin: string, scriptHashes: string[] }} policy */
export function contentSecurityPolicy({ apiOrigin, scriptHashes }) {
  return [
    "default-src 'none'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${apiOrigin}`,
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

// .htaccess de la racine du site : repli monopage vers index.html, en-têtes de
// sécurité et cache. Pas d'<IfModule> : sans mod_headers, mieux vaut une erreur
// visible qu'une page servie sans CSP.
/** @param {string} csp */
export function buildHtaccess(csp) {
  return [
    'Options -Indexes',
    'RewriteEngine On',
    'RewriteCond %{REQUEST_FILENAME} !-f',
    'RewriteRule ^ index.html [L]',
    '',
    `Header always set Content-Security-Policy "${csp}"`,
    'Header always set X-Content-Type-Options "nosniff"',
    'Header always set Referrer-Policy "no-referrer"',
    'Header always set X-Frame-Options "DENY"',
    '',
    '# fichiers nommés par empreinte : immuables ; index.html toujours revalidé',
    '<If "%{REQUEST_URI} =~ m#^/_app/immutable/#">',
    '  Header set Cache-Control "public, max-age=31536000, immutable"',
    '</If>',
    '<Else>',
    '  Header set Cache-Control "no-cache"',
    '</Else>',
    '',
  ].join('\n');
}

// Verrou distant par `mkdir` (atomique) : pris avant `body`, toujours rendu
// après, même si `body` échoue. Un verrou non rendu est signalé, pas masqué.
/**
 * @template T
 * @param {(command: string) => unknown} ssh
 * @param {{ lockPath: string, sshKey: string, remote: string }} target
 * @param {() => Promise<T>} body
 */
export async function withRemoteLock(ssh, { lockPath, sshKey, remote }, body) {
  try {
    await ssh(`mkdir ${lockPath}`);
  } catch {
    throw new Error(`Verrou déjà pris (~/${lockPath}) : un autre déploiement est en cours, ou un précédent a été interrompu`);
  }
  try {
    return await body();
  } finally {
    try {
      await ssh(`rmdir ${lockPath}`);
    } catch {
      console.error(`✖ Verrou non libéré : wsl ssh -i ${sshKey} ${remote} "rmdir ${lockPath}"`);
    }
  }
}

// Sortie de `rsync --itemize-changes` : « YXcstpoguax chemin », ou « *deleting chemin »
// pour ce que --delete retire.
/** @param {string} output */
export function parseItemized(output) {
  const changes = [];
  for (const line of output.split(/\r?\n/)) {
    const item = /^([<>ch.][fdLDS][^ ]{9}|\*deleting)\s+(.+)$/.exec(line);
    if (!item || item[2] === './') continue;
    changes.push({ flags: item[1], path: item[2] });
  }
  return changes;
}

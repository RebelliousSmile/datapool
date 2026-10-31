// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  assertWslHome,
  buildHtaccess,
  contentSecurityPolicy,
  corsAllows,
  inlineScriptHashes,
  parseArgs,
  parseItemized,
  shQuote,
  validateRemoteRelativePath,
  validateTarget,
  withRemoteLock,
} from '../scripts/deploy-lib.mjs';

const RAW = {
  host: 'ssh-compte.alwaysdata.net',
  user: 'compte',
  sshKey: '~/.ssh/webpool_ci',
  siteUrl: 'https://datapool.example.org/',
  apiUrl: 'https://api.example.org/api/v1',
  lifecycleRevision: 1,
};

describe('parseArgs', () => {
  it('exige une cible unique', () => {
    expect(() => parseArgs([])).toThrow(/Cible manquante/);
    expect(() => parseArgs(['ad', 'autre'])).toThrow(/Une seule cible/);
  });

  it('lit les options et ignore le séparateur --', () => {
    expect(parseArgs(['ad', '--', '--apply'])).toMatchObject({ target: 'ad', apply: true, check: false });
  });

  it('refuse une option inconnue et --apply avec --check', () => {
    expect(() => parseArgs(['ad', '--force'])).toThrow(/Option inconnue/);
    expect(() => parseArgs(['ad', '--apply', '--check'])).toThrow(/incompatibles/);
  });
});

describe('validateTarget', () => {
  it('applique les défauts et dérive les chemins de la cible', () => {
    expect(validateTarget('ad', RAW)).toMatchObject({
      remote: 'compte@ssh-compte.alwaysdata.net',
      appDir: 'www/datapool',
      newDir: 'www/datapool.new',
      oldDir: 'www/datapool.old',
      siteUrl: 'https://datapool.example.org',
      apiUrl: 'https://api.example.org/api/v1',
      apiOrigin: 'https://api.example.org',
      siteOrigin: 'https://datapool.example.org',
      webpoolEnvFile: 'www/webpool.env',
      nodeVersion: '24',
      lockPath: 'deploy/datapool-ad/lock',
      guard: { targetId: 'ad', phase: 'production', lifecycleRevision: 1 },
    });
  });

  it('refuse une cible absente, un hôte ou une clé douteux', () => {
    expect(() => validateTarget('ad', undefined)).toThrow(/absente/);
    expect(() => validateTarget('ad', { ...RAW, host: 'a;b' })).toThrow(/host invalide/);
    expect(() => validateTarget('ad', { ...RAW, sshKey: '/etc/key' })).toThrow(/sshKey/);
  });

  it('refuse ~/www comme appDir', () => {
    expect(validateTarget('ad', { ...RAW, appDir: 'www/autre' }).appDir).toBe('www/autre');
    expect(() => validateTarget('ad', { ...RAW, appDir: 'www' })).toThrow(/sous-répertoire/);
  });

  it('exige des URLs https sans identifiants, requête ni fragment', () => {
    expect(() => validateTarget('ad', { ...RAW, siteUrl: undefined })).toThrow(/siteUrl illisible/);
    for (const apiUrl of ['http://api.example.org/api/v1', 'https://u:p@api.example.org', 'https://api.example.org/?a=1', 'https://api.example.org/#x']) {
      expect(() => validateTarget('ad', { ...RAW, apiUrl })).toThrow(/apiUrl doit être/);
    }
  });

  it('refuse une révision de cycle de vie absente, une version de Node non majeure et un .env de webpool hors du home', () => {
    expect(() => validateTarget('ad', { ...RAW, lifecycleRevision: 0 })).toThrow(/lifecycleRevision/);
    expect(() => validateTarget('ad', { ...RAW, nodeVersion: '24.1' })).toThrow(/nodeVersion/);
    expect(() => validateTarget('ad', { ...RAW, webpoolEnvFile: '/etc/passwd' })).toThrow(/webpoolEnvFile/);
  });
});

describe('validateRemoteRelativePath', () => {
  it('refuse les chemins absolus, remontants ou à caractères shell', () => {
    for (const bad of ['/home/x', '../x', 'a b', 'a;rm']) {
      expect(() => validateRemoteRelativePath('appDir', bad)).toThrow();
    }
    expect(validateRemoteRelativePath('appDir', 'www/datapool')).toBe('www/datapool');
  });
});

describe('assertWslHome', () => {
  it("n'accepte que /home/<utilisateur> ou /root", () => {
    expect(assertWslHome('/home/moi')).toBe('/home/moi');
    for (const bad of ['', '/', '/home', '/home/a b', '/mnt/c/Users/x']) expect(() => assertWslHome(bad)).toThrow();
  });
});

describe('shQuote', () => {
  it('protège les apostrophes', () => {
    expect(shQuote(`a'b`)).toBe(`'a'\\''b'`);
  });
});

describe('corsAllows', () => {
  it("compare l'origine exacte, comme webpool", () => {
    expect(corsAllows(' https://a.org , https://datapool.example.org', 'https://datapool.example.org')).toBe(true);
    expect(corsAllows('https://datapool.example.org/', 'https://datapool.example.org')).toBe(false);
    expect(corsAllows('', 'https://datapool.example.org')).toBe(false);
  });
});

describe('CSP et .htaccess', () => {
  const sha = (body: string) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`;

  it('empreinte les seuls scripts en ligne, contenu exact', () => {
    const html = '<script>\n  a();\n</script><script src="/x.js"></script><script type="module">b()</script>';
    expect(inlineScriptHashes(html)).toEqual([sha('\n  a();\n'), sha('b()')]);
  });

  it("limite les connexions et images à l'API", () => {
    const csp = contentSecurityPolicy({ apiOrigin: 'https://api.example.org', scriptHashes: ["'sha256-x'"] });
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self' 'sha256-x'");
    expect(csp).toContain("connect-src 'self' https://api.example.org");
    expect(csp).toContain("img-src 'self' data: https://api.example.org");
    // aucun <style> en ligne ; attributs style="" tolérés (annonceur de SvelteKit)
    expect(csp).toContain("style-src 'self';");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toMatch(/style-src 'self' 'unsafe-inline'/);
  });

  it('pose le repli monopage et la CSP sans <IfModule>', () => {
    const htaccess = buildHtaccess("default-src 'none'");
    expect(htaccess).toContain('RewriteRule ^ index.html [L]');
    expect(htaccess).toContain(`Header always set Content-Security-Policy "default-src 'none'"`);
    expect(htaccess).not.toContain('IfModule');
  });

  it('pose HSTS et Permissions-Policy avec les autres en-têtes de sécurité', () => {
    const htaccess = buildHtaccess("default-src 'none'");
    expect(htaccess).toContain('Header always set Strict-Transport-Security "max-age=31536000"');
    expect(htaccess).toContain('Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"');
    expect(htaccess).toContain('Header always set X-Content-Type-Options "nosniff"');
  });
});

describe('withRemoteLock', () => {
  const target = { lockPath: 'deploy/datapool-ad/lock', sshKey: '~/.ssh/k', remote: 'u@h' };

  it('prend et rend le verrou, même si le corps échoue', async () => {
    const ssh = vi.fn();
    await expect(withRemoteLock(ssh, target, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(ssh.mock.calls).toEqual([['mkdir deploy/datapool-ad/lock'], ['rmdir deploy/datapool-ad/lock']]);
  });

  it('refuse un verrou déjà pris sans exécuter le corps', async () => {
    const body = vi.fn();
    const ssh = vi.fn(() => { throw new Error('exists'); });
    await expect(withRemoteLock(ssh, target, body)).rejects.toThrow(/Verrou déjà pris/);
    expect(body).not.toHaveBeenCalled();
  });
});

describe('parseItemized', () => {
  it('lit ajouts et suppressions, ignore ./ et les lignes parasites', () => {
    const output = '.d..t...... ./\n>f+++++++++ index.html\n*deleting   _app/old.js\nsent 10 bytes\n';
    expect(parseItemized(output)).toEqual([
      { flags: '>f+++++++++', path: 'index.html' },
      { flags: '*deleting', path: '_app/old.js' },
    ]);
  });
});

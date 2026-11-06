import { flushSync, mount, unmount, type Component } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountMenu from '../src/lib/components/AccountMenu.svelte';
import AppSearch from '../src/lib/components/AppSearch.svelte';
import ConnectForm from '../src/lib/components/ConnectForm.svelte';
import PasswordForm from '../src/lib/components/PasswordForm.svelte';
import PoolCard from '../src/lib/components/PoolCard.svelte';
import SearchResults from '../src/lib/components/SearchResults.svelte';
import { session } from '../src/lib/session.svelte.ts';
import { calls as navCalls } from './mocks/app-navigation';
import { page as appPage } from './mocks/app-state';

// Comptes, cartes de pools et recherche globale (interface, phase 5).
const API = 'http://api.test/api/v1';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let mounted: ReturnType<typeof mount>[] = [];
function render<P extends Record<string, unknown>>(component: Component<P>, props: P) {
  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(component, { target, props }));
  flushSync();
  return target;
}
beforeEach(() => {
  localStorage.clear();
  session.disconnect();
});
afterEach(() => {
  mounted.forEach((m) => unmount(m));
  mounted = [];
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  session.disconnect();
});
const clean = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input'));
};
const until = async (done: () => unknown) =>
  vi.waitFor(() => {
    flushSync();
    expect(done()).toBeTruthy();
  });
const submit = (el: Element) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
// fetch simulé : une réponse par « MÉTHODE /chemin » (sans la base ni la requête), 404 sinon.
// Les modes compte de ConnectForm visent l'URL d'API du build (par défaut 127.0.0.1).
function api(routes: Record<string, () => Response>) {
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${url.replace(/^https?:\/\/[^/]+\/api\/v1/, '').replace(/\?.*$/, '')}`;
    return routes[key]?.() ?? json({ error: { code: 'not_found', message: key } }, 404);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
const asAccount = async () => {
  api({ 'GET /me': () => json({ name: 'ana', scope: 'read', email: 'ana@ex.fr' }) });
  await session.connect({ baseUrl: API, token: 'wps_s' });
};

describe('ConnectForm, comptes', () => {
  const tabs = (el: Element) => [...el.querySelectorAll<HTMLButtonElement>('.auth-tabs button')];

  it('ouvre sur le compte et change de mode par les onglets et les liens', () => {
    const el = render(ConnectForm, {});
    expect(tabs(el).map((b) => b.textContent)).toEqual(['Compte', 'Activation', "Jeton d'API"]);
    expect(tabs(el)[0].getAttribute('aria-current')).toBe('page');
    expect([...el.querySelectorAll('input')].map((i) => i.type)).toEqual(['email', 'password']);
    expect(el.querySelector('input[type=password]')?.getAttribute('autocomplete')).toBe('current-password');

    el.querySelector<HTMLButtonElement>('.auth-alt .link-btn')!.click();
    flushSync();
    expect(tabs(el)[1].getAttribute('aria-current')).toBe('page');
    expect(el.querySelectorAll('input')).toHaveLength(3);
    const pwd = el.querySelector<HTMLInputElement>('input[type=password]')!;
    expect(pwd.minLength).toBe(12);
    expect(pwd.getAttribute('autocomplete')).toBe('new-password');
    expect(clean(el.querySelector('.jack-submit'))).toBe('Activer le compte');

    el.querySelector<HTMLButtonElement>('.auth-alt .link-btn')!.click();
    flushSync();
    expect(tabs(el)[0].getAttribute('aria-current')).toBe('page');
    tabs(el)[2].click();
    flushSync();
    expect(clean(el.querySelector('.auth-alt'))).toMatch(/jeton brut reste accepté/);
    expect(clean(el.querySelector('.jack-status'))).toMatch(/en attente du jeton/);
  });

  it('connecte un compte par e-mail et mot de passe', async () => {
    const fetchFn = api({
      'POST /account/login': () => json({ token: 'wps_s1', expires_at: '2026-12-06T00:00:00Z' }),
      'GET /me': () => json({ name: 'ana', scope: 'read', email: 'ana@ex.fr' }),
    });
    const el = render(ConnectForm, {});
    const [email, pwd] = el.querySelectorAll('input');
    type(email, ' ana@ex.fr ');
    type(pwd, 'secret');
    submit(el);
    await until(() => session.me);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"email":"ana@ex.fr","password":"secret"}' });
    expect(session.isAccount).toBe(true);
  });

  it('active un compte avec le code d’invitation', async () => {
    const fetchFn = api({
      'POST /account/activate': () => json({ token: 'wps_s2', expires_at: '2026-12-06T00:00:00Z' }),
      'GET /me': () => json({ name: 'ana', scope: 'read', email: 'ana@ex.fr' }),
    });
    const el = render(ConnectForm, {});
    tabs(el)[1].click();
    flushSync();
    const [email, code, pwd] = el.querySelectorAll('input');
    type(email, 'ana@ex.fr');
    type(code, ' wpi_code ');
    type(pwd, 'x'.repeat(12));
    submit(el);
    await until(() => session.me);
    expect(JSON.parse(fetchFn.mock.calls[0][1]!.body as string)).toEqual({ email: 'ana@ex.fr', code: 'wpi_code', password: 'x'.repeat(12) });
  });

  it('signale des identifiants refusés', async () => {
    api({ 'POST /account/login': () => json({ error: { code: 'unauthorized', message: 'Identifiants refusés' } }, 401) });
    const el = render(ConnectForm, {});
    submit(el);
    await until(() => el.querySelector('[role=alert]'));
    expect(el.querySelector('[role=alert]')?.textContent).toBe('Identifiants refusés');
    expect(el.querySelector('input[type=email]')?.getAttribute('aria-invalid')).toBe('true');
    // changer de mode efface l'erreur
    tabs(el)[1].click();
    flushSync();
    expect(el.querySelector('[role=alert]')).toBeNull();
  });
});

describe('AccountMenu', () => {
  it('montre l’e-mail et la page du compte pour une session de compte', async () => {
    await asAccount();
    const el = render(AccountMenu, {});
    expect(el.querySelector('.who')?.textContent).toContain('ana@ex.fr');
    const link = el.querySelector<HTMLAnchorElement>('a.menu-item')!;
    expect(link.getAttribute('href')).toBe('/compte');
    el.querySelector<HTMLButtonElement>('.avatar')!.click();
    flushSync();
    expect(el.querySelector('.menu')?.hasAttribute('hidden')).toBe(false);
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    flushSync();
    expect(el.querySelector('.menu')?.hasAttribute('hidden')).toBe(true);
  });

  it('montre le scope pour un jeton brut et déconnecte', async () => {
    api({ 'GET /me': () => json({ name: 'robot', scope: 'admin' }) });
    await session.connect({ baseUrl: API, token: 'wp_x' });
    const el = render(AccountMenu, {});
    expect(el.querySelector('.who')?.textContent).toContain('client admin');
    expect(el.querySelector('a.menu-item')).toBeNull();
    el.querySelector<HTMLButtonElement>('button.menu-item')!.click();
    await until(() => session.me === null);
  });
});

describe('PasswordForm', () => {
  const fill = (el: Element, current: string, password: string, confirm: string) => {
    const [a, b, c] = el.querySelectorAll('input');
    type(a, current);
    type(b, password);
    type(c, confirm);
  };

  it('refuse deux saisies différentes sans appeler l’API', async () => {
    await asAccount();
    const fetchFn = api({});
    const el = render(PasswordForm, {});
    fill(el, 'ancien', 'x'.repeat(12), 'y'.repeat(12));
    submit(el);
    flushSync();
    expect(el.querySelector('[role=alert]')?.textContent).toMatch(/diffèrent/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('signale un mot de passe actuel incorrect, puis une autre erreur', async () => {
    await asAccount();
    let status = 403;
    api({ 'PUT /account/password': () => json({ error: { code: 'forbidden', message: 'non' } }, status) });
    const el = render(PasswordForm, {});
    fill(el, 'faux', 'x'.repeat(12), 'x'.repeat(12));
    submit(el);
    await until(() => el.querySelector('[role=alert]'));
    expect(el.querySelector('[role=alert]')?.textContent).toBe('Mot de passe actuel incorrect.');
    status = 400;
    submit(el);
    await until(() => el.querySelector('[role=alert]')?.textContent === 'non');
  });

  it('change le mot de passe et vide les champs', async () => {
    await asAccount();
    const fetchFn = api({ 'PUT /account/password': () => json({ ok: true }) });
    const el = render(PasswordForm, {});
    fill(el, 'ancien', 'x'.repeat(12), 'x'.repeat(12));
    submit(el);
    await until(() => el.querySelector('[role=status]'));
    expect(fetchFn.mock.calls[0][1]!.body).toBe(`{"current":"ancien","password":"${'x'.repeat(12)}"}`);
    expect([...el.querySelectorAll('input')].map((i) => i.value)).toEqual(['', '', '']);
    expect(el.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
  });
});

describe('PoolCard', () => {
  const pool = {
    slug: 'chats',
    label: 'Chats',
    refreshed_at: '2026-11-05T10:00:00Z',
    items: 120,
    public: true,
    preview: ['/m/1.webp', '/m/2.webp', '/m/3.webp'],
    usage_commercial: [
      { usage: 'libre' as const, urls: 80 },
      { usage: null, urls: 40 },
    ],
  };
  const mediaUrl = (p: string) => `${API}${p}`;

  it('rend la mosaïque, la répartition par usage et le pied', () => {
    const el = render(PoolCard, { pool, mediaUrl });
    expect(el.querySelector('h2 a')?.getAttribute('href')).toBe('/pools/chats');
    expect(el.querySelector('h2 .chip')?.textContent).toBe('public');
    expect([...el.querySelectorAll('.mosaic img')].map((i) => i.getAttribute('src'))).toEqual([
      `${API}/m/1.webp`,
      `${API}/m/2.webp`,
      `${API}/m/3.webp`,
    ]);
    expect(el.querySelectorAll('.mosaic .icon')).toHaveLength(1);
    expect(el.querySelectorAll('.stackbar .seg-u')).toHaveLength(2);
    expect(el.querySelector('.stackbar')?.getAttribute('aria-label')).toBe('Libre : 80, À qualifier : 40');
    expect(clean(el.querySelector('.foot'))).toMatch(/^120 liens /);
    expect(el.querySelector('li')?.classList.contains('empty')).toBe(false);
  });

  it('remplace une vignette cassée par une icône', () => {
    const el = render(PoolCard, { pool, mediaUrl });
    el.querySelector('.mosaic img')!.dispatchEvent(new Event('error'));
    flushSync();
    expect(el.querySelectorAll('.mosaic img')).toHaveLength(2);
    expect(el.querySelectorAll('.mosaic .icon')).toHaveLength(2);
  });

  it('marque un pool vide, jamais matérialisé', () => {
    const el = render(PoolCard, {
      pool: { ...pool, items: 0, public: false, refreshed_at: null, preview: [], usage_commercial: [] },
      mediaUrl: () => null,
    });
    expect(el.querySelector('li')?.classList.contains('empty')).toBe(true);
    expect(el.querySelector('.stackbar')).toBeNull();
    expect(el.querySelector('h2 .chip')).toBeNull();
    expect(clean(el.querySelector('.foot'))).toBe('0 lien jamais matérialisé');
  });
});

describe('SearchResults', () => {
  const hit = (n: number, extra = {}) => ({
    url: `https://ex${n}.test/a`,
    domain: `ex${n}.test`,
    title: `Titre ${n}`,
    usage_commercial: 'libre',
    description: n === 1 ? 'Une description' : null,
    media_type: 'page',
    source: 'other',
    thumbnail: null,
    favicon: null,
    pools: [
      { slug: 'chats', label: 'Chats', rank: n },
      { slug: 'faune', label: 'Faune', rank: 10 + n },
    ],
    ...extra,
  });

  it('demande deux caractères au moins', async () => {
    await asAccount();
    const fetchFn = api({});
    const el = render(SearchResults, { q: ' a ' });
    expect(el.textContent).toMatch(/2 caractères au moins/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('liste les liens avec leurs pools et pagine', async () => {
    await asAccount();
    const fetchFn = api({
      'GET /search': () => json({ q: 'chat', total: 60, limit: 50, offset: 0, items: [hit(1), hit(2, { title: null, url: 'javascript:x' })] }),
    });
    const el = render(SearchResults, { q: ' chat ' });
    await until(() => el.querySelector('li.item'));
    expect(fetchFn.mock.calls[0][0]).toBe(`${API}/search?q=chat&limit=50&offset=0`);
    expect(clean(el.querySelector('.search-count'))).toBe('60 liens pour « chat »');
    const items = el.querySelectorAll('li.item');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.item-rank')?.textContent).toBe('1');
    expect(items[0].querySelector('a.item-title')?.getAttribute('href')).toBe('https://ex1.test/a');
    expect(items[0].querySelector('.item-desc')?.textContent).toBe('Une description');
    expect([...items[0].querySelectorAll('.hit-pools a')].map((a) => [a.getAttribute('href'), a.textContent])).toEqual([
      ['/pools/chats', 'Chats #1'],
      ['/pools/faune', 'Faune #11'],
    ]);
    // schéma dangereux : pas de lien, l'URL tient lieu de titre
    expect(items[1].querySelector('a.item-title')).toBeNull();
    expect(items[1].querySelector('.item-title.untitled')?.textContent).toBe('javascript:x');

    [...el.querySelectorAll<HTMLButtonElement>('.pager button')].find((b) => b.textContent?.trim() === '2')!.click();
    await until(() => fetchFn.mock.calls.length === 2);
    expect(fetchFn.mock.calls[1][0]).toBe(`${API}/search?q=chat&limit=50&offset=50`);
  });

  it('signale l’absence de résultat', async () => {
    await asAccount();
    api({ 'GET /search': () => json({ q: 'zzz', total: 1, limit: 50, offset: 0, items: [] }) });
    const el = render(SearchResults, { q: 'zzz' });
    await until(() => el.querySelector('.search-count'));
    expect(clean(el.querySelector('.search-count'))).toBe('1 lien pour « zzz »');
    expect(el.textContent).toMatch(/Aucun lien ne correspond/);
  });
});

describe('AppSearch', () => {
  beforeEach(() => {
    navCalls.length = 0;
  });

  it('reprend le terme de l’URL et mène aux résultats', () => {
    appPage.url = new URL('http://localhost/resultats?q=chat');
    const el = render(AppSearch, {});
    const input = el.querySelector('input')!;
    expect(input.value).toBe('chat');
    type(input, '  chats & chiens ');
    submit(el);
    expect(navCalls.at(-1)?.url).toBe('/resultats?q=chats%20%26%20chiens');
  });

  it('laisse le champ vide hors de /resultats', () => {
    appPage.url = new URL('http://localhost/pools?q=chat');
    const el = render(AppSearch, {});
    expect(el.querySelector('input')!.value).toBe('');
  });

  it('ignore un terme vide', () => {
    appPage.url = new URL('http://localhost/pools');
    const el = render(AppSearch, {});
    type(el.querySelector('input')!, '   ');
    submit(el);
    expect(navCalls).toHaveLength(0);
  });

  it('place le curseur sur « / », sauf depuis un champ ou avec un modificateur', () => {
    appPage.url = new URL('http://localhost/pools');
    const el = render(AppSearch, {});
    const input = el.querySelector('input')!;
    const other = document.createElement('textarea');
    document.body.append(other);
    other.focus();
    other.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(document.activeElement).toBe(other);
    other.blur();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(document.activeElement).not.toBe(input);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(input);
  });
});

import { createRawSnippet, flushSync, mount, unmount, type Component } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { session } from '../src/lib/session.svelte.ts';
import Layout from '../src/routes/+layout.svelte';
import ComptePage from '../src/routes/compte/+page.svelte';
import PoolsPage from '../src/routes/pools/+page.svelte';
import ResultatsPage from '../src/routes/resultats/+page.svelte';
import { page as appPage } from './mocks/app-state';

// Pages de la phase 5 : liste des pools, résultats de recherche, compte.
// Rendues avec les substituts de $app/* (test/mocks) et une API simulée.
const API = 'http://api.test/api/v1';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let mounted: ReturnType<typeof mount>[] = [];
function render<P extends Record<string, unknown>>(component: Component<P>, props = {} as P) {
  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(component, { target, props }));
  flushSync();
  return target;
}
const until = async (done: () => unknown) =>
  vi.waitFor(() => {
    flushSync();
    expect(done()).toBeTruthy();
  });
const clean = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input'));
  flushSync();
};
// fetch simulé : une réponse par « MÉTHODE /chemin » (sans base ni requête), 404 sinon.
function api(routes: Record<string, () => Response>) {
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${url.replace(/^https?:\/\/[^/]+\/api\/v1/, '').replace(/\?.*$/, '')}`;
    return routes[key]?.() ?? json({ error: { code: 'not_found', message: key } }, 404);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
const connect = async (token: string, me: Record<string, unknown>, routes: Record<string, () => Response> = {}) => {
  const fn = api({ 'GET /me': () => json(me), ...routes });
  await session.connect({ baseUrl: API, token });
  return fn;
};

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

describe('page /pools', () => {
  const pool = (slug: string, label: string, items: number) => ({
    slug,
    label,
    items,
    public: false,
    refreshed_at: '2026-11-05T10:00:00Z',
    preview: [],
    usage_commercial: [],
  });
  const pools = (...items: ReturnType<typeof pool>[]) => ({ 'GET /pools': () => json({ items }) });
  const read = { name: 'ana', scope: 'read' };

  it('affiche une carte par pool, avec le total des pools et des liens', async () => {
    await connect('wp_x', read, pools(pool('chats', 'Chats', 120), pool('faune', 'Faune', 1)));
    const el = render(PoolsPage);
    await until(() => el.querySelector('.pool-card'));
    expect(el.querySelector('h1')?.textContent).toBe('Pools');
    expect(clean(el.querySelector('.meta'))).toBe('2 pools accessibles 121 liens');
    expect([...el.querySelectorAll('.pool-card h2 a')].map((a) => a.getAttribute('href'))).toEqual(['/pools/chats', '/pools/faune']);
  });

  it('écrit au singulier pour un seul pool', async () => {
    await connect('wp_x', read, pools(pool('chats', 'Chats', 1)));
    const el = render(PoolsPage);
    await until(() => el.querySelector('.pool-card'));
    expect(clean(el.querySelector('.meta'))).toBe('1 pool accessible 1 lien');
  });

  it('filtre les pools par nom ou par slug, sans tenir compte de la casse', async () => {
    await connect('wp_x', read, pools(pool('chats', 'Chats', 5), pool('lieux-spb', 'Saint-Pétersbourg', 7)));
    const el = render(PoolsPage);
    await until(() => el.querySelector('.pool-card'));
    const filter = el.querySelector<HTMLInputElement>('#pool-filter')!;

    type(filter, ' SAINT ');
    expect([...el.querySelectorAll('.pool-card h2 a')].map((a) => a.textContent)).toEqual(['Saint-Pétersbourg']);

    type(filter, 'lieux');
    expect(el.querySelectorAll('.pool-card')).toHaveLength(1);

    type(filter, 'zzz');
    expect(el.querySelectorAll('.pool-card')).toHaveLength(0);
    expect(el.textContent).toMatch(/Aucun pool ne correspond/);
  });

  it('signale un compte sans aucun pool accordé', async () => {
    await connect('wp_x', read, pools());
    const el = render(PoolsPage);
    await until(() => el.querySelector('.page-head'));
    expect(el.querySelectorAll('.pool-card')).toHaveLength(0);
    expect(el.textContent).toMatch(/Aucun pool accessible/);
  });

  it('affiche l’erreur de l’API', async () => {
    await connect('wp_x', read, { 'GET /pools': () => json({ error: { code: 'internal', message: 'base indisponible' } }, 500) });
    const el = render(PoolsPage);
    await until(() => el.querySelector('[role=alert]'));
    expect(el.querySelector('[role=alert]')?.textContent).toMatch(/base indisponible/);
    expect(el.querySelector('.pool-card')).toBeNull();
  });
});

describe('page /resultats', () => {
  const emptySearch = (q: string) => ({ 'GET /search': () => json({ q, total: 0, limit: 50, offset: 0, items: [] }) });

  it('cherche le terme de l’URL et le rappelle dans l’en-tête', async () => {
    appPage.url = new URL('http://localhost/resultats?q=chats');
    const fetchFn = await connect('wps_s', { name: 'ana', scope: 'read' }, emptySearch('chats'));
    const el = render(ResultatsPage);
    await until(() => el.querySelector('.search-count'));
    expect(document.title).toBe('Recherche · datapool');
    expect(el.querySelector('h1')?.textContent).toBe('Recherche');
    expect(el.querySelector('.search-head .meta strong')?.textContent).toBe('chats');
    expect(fetchFn.mock.calls.at(-1)?.[0]).toBe(`${API}/search?q=chats&limit=50&offset=0`);
  });

  it('demande un terme quand l’URL n’en porte pas', async () => {
    appPage.url = new URL('http://localhost/resultats');
    const fetchFn = await connect('wps_s', { name: 'ana', scope: 'read' });
    const callsBefore = fetchFn.mock.calls.length;
    const el = render(ResultatsPage);
    expect(el.textContent).toMatch(/2 caractères au moins/);
    expect(fetchFn.mock.calls.length).toBe(callsBefore);
  });
});

describe('page /compte', () => {
  it('propose le changement de mot de passe à une session de compte', async () => {
    await connect('wps_s', { name: 'ana', scope: 'read', email: 'ana@ex.fr' });
    const el = render(ComptePage);
    expect(el.querySelector('h1')?.textContent).toBe('Mon compte');
    expect(clean(el.querySelector('.meta'))).toBe('ana ana@ex.fr client read');
    expect(el.querySelector('form')).not.toBeNull();
    expect(el.textContent).not.toMatch(/Connecté par jeton d'API/);
  });

  it('explique qu’un jeton d’API n’a pas de mot de passe', async () => {
    await connect('wp_x', { name: 'robot', scope: 'admin' });
    const el = render(ComptePage);
    expect(clean(el.querySelector('.meta'))).toBe('robot client admin');
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toMatch(/Connecté par jeton d'API : pas de mot de passe à changer/);
    expect(el.textContent).toMatch(/webpool account invite/);
  });
});

describe('layout', () => {
  const children = createRawSnippet(() => ({ render: () => '<p>contenu</p>' }));

  it('monte la recherche globale dans l’en-tête, atteinte par la touche « / »', async () => {
    localStorage.setItem('datapool.connection', JSON.stringify({ baseUrl: API, token: 'wps_s' }));
    api({ 'GET /me': () => json({ name: 'ana', scope: 'read' }) });
    const el = render(Layout, { children });
    await until(() => el.querySelector('.app-header'));
    const input = el.querySelector<HTMLInputElement>('.app-header [role=search] input');
    expect(input).not.toBeNull();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(document.activeElement).toBe(input);
  });
});

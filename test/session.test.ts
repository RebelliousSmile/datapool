import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readConnection, session } from '../src/lib/session.svelte.ts';

const conn = { baseUrl: 'http://api.test/api/v1', token: 'wp_x' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('readConnection', () => {
  const storage = (v: string | null) => ({ getItem: () => v });
  it('ne lit que des connexions bien formées', () => {
    expect(readConnection(storage(JSON.stringify(conn)))).toEqual(conn);
    expect(readConnection(storage(null))).toBeNull();
    expect(readConnection(storage('{pas du json'))).toBeNull();
    expect(readConnection(storage(JSON.stringify({ baseUrl: 1, token: 'x' })))).toBeNull();
  });
});

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
    session.disconnect();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('vérifie le jeton avant de l’enregistrer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ name: 'moi', scope: 'admin' })));
    await session.connect(conn);
    expect(session.me).toEqual({ name: 'moi', scope: 'admin' });
    expect(session.isAdmin).toBe(true);
    expect(session.client).not.toBeNull();
    expect(readConnection(localStorage)).toEqual(conn);
  });

  it('n’enregistre pas un jeton refusé', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'unauthorized', message: 'Jeton absent, invalide ou révoqué' } }, 401)));
    await expect(session.connect(conn)).rejects.toThrow('Jeton absent');
    expect(session.me).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('reprend la connexion enregistrée, et l’oublie si le jeton est révoqué', async () => {
    localStorage.setItem('datapool.connection', JSON.stringify(conn));
    vi.stubGlobal('fetch', vi.fn(async () => json({ name: 'c', scope: 'read' })));
    await session.restore();
    expect(session.me?.name).toBe('c');
    expect(session.isAdmin).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'unauthorized', message: 'révoqué' } }, 401)));
    await session.restore();
    expect(session.me).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('garde la connexion enregistrée quand l’API est injoignable', async () => {
    localStorage.setItem('datapool.connection', JSON.stringify(conn));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(session.restore()).rejects.toThrow('API injoignable');
    expect(readConnection(localStorage)).toEqual(conn);
  });

  it('se déconnecte sur un 401 en cours de session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ name: 'moi', scope: 'read' })));
    await session.connect(conn);
    const old = session.client!;
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'unauthorized', message: 'révoqué' } }, 401)));
    await expect(old.billing()).rejects.toMatchObject({ status: 401 });
    expect(session.client).toBeNull();
    expect(session.me).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(session.notice).toMatch(/reconnectez-vous/);

    // reconnecté : un 401 tardif de l'ancien client ne déconnecte pas le nouveau
    vi.stubGlobal('fetch', vi.fn(async () => json({ name: 'moi', scope: 'read' })));
    await session.connect({ ...conn, token: 'wp_y' });
    expect(session.notice).toBe('');
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'unauthorized', message: 'révoqué' } }, 401)));
    await old.billing().catch(() => null);
    expect(session.me?.name).toBe('moi');
  });

  it('ne fait rien sans connexion enregistrée', async () => {
    const fetchFn = vi.fn();
    vi.stubGlobal('fetch', fetchFn);
    await session.restore();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

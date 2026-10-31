import { describe, expect, it, vi } from 'vitest';
import { ApiError, buildUrl, createClient } from '../src/lib/api/client';
import {
  fmtDate,
  fmtDuration,
  fmtNumber,
  fmtScore,
  pageList,
  safeHref,
  splitUrl,
  urlStatusLabel,
  usageLabel,
  usageOf,
  usageSegments,
} from '../src/lib/format';
import { fetchAllLinks, formatLinks, type CopyLink } from '../src/lib/copy';

describe('buildUrl', () => {
  it('ignore les valeurs vides et répète les tableaux', () => {
    expect(buildUrl('http://h/api/v1/', '/admin/urls', { q: 'a b', status: '', theme: undefined, facet: ['x:1', 'y:2'], limit: 50 }))
      .toBe('http://h/api/v1/admin/urls?q=a+b&facet=x%3A1&facet=y%3A2&limit=50');
  });
});

describe('createClient', () => {
  const conn = { baseUrl: 'http://h/api/v1', token: 'wp_x' };

  it('envoie le jeton et encode les segments', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ slug: 'a/b' }), { status: 200 }));
    await createClient(conn, fetchFn as unknown as typeof fetch).pool('a/b');
    expect(fetchFn).toHaveBeenCalledWith('http://h/api/v1/pools/a%2Fb', {
      headers: { Authorization: 'Bearer wp_x' },
      signal: expect.any(AbortSignal),
    });
  });

  it("remonte l'erreur JSON de l'API", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({ error: { code: 'not_found', message: 'Pool inconnu : z' } }), { status: 404 });
    const err = await createClient(conn, fetchFn as typeof fetch).pool('z').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: 'not_found', message: 'Pool inconnu : z' });
  });

  it('appelle la bonne route pour chaque ressource', async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => {
      calls.push(url.replace('http://h/api/v1', ''));
      return new Response(JSON.stringify({}), { status: 200 });
    }) as unknown as typeof fetch;
    const api = createClient(conn, fetchFn);
    await api.me();
    await api.pools();
    await api.poolItems('p', { limit: 10, offset: 20 });
    await api.stats();
    await api.urls({ theme: 't' });
    await api.url(7);
    await api.themes();
    await api.domains({ to_qualify: true });
    await api.queries({ status: 'active' });
    await api.runs({ limit: 15 });
    const blob = await api.exportPool('p', 'csv');
    expect(await blob.text()).toBe('{}');
    expect(calls).toEqual([
      '/me',
      '/pools',
      '/pools/p/items?limit=10&offset=20',
      '/admin/stats',
      '/admin/urls?theme=t',
      '/admin/urls/7',
      '/admin/themes',
      '/admin/domains?to_qualify=true',
      '/admin/queries?status=active',
      '/admin/runs?limit=15',
      '/admin/pools/p/export?format=csv',
    ]);
  });

  it('recherches : GET, POST en JSON, DELETE', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url: url.replace('http://h/api/v1', ''), init });
      return new Response(JSON.stringify({}), { status: 200 });
    }) as unknown as typeof fetch;
    const api = createClient(conn, fetchFn);
    await api.billing();
    await api.billingEntries({ community: 'atelier' });
    await api.requests({ status: 'queued' });
    await api.adminRequests({ limit: 5 });
    await api.createRequest({ query: 'q', provider: 'brave', pages: 2 });
    await api.cancelRequest(12);
    await api.members('a b');
    await api.setMember('atelier', 'bob', { monthly_limit: 10 });
    await api.removeMember('atelier', 'bob');
    await api.acceptInvitation('atelier');
    await api.declineInvitation('a b');
    await api.leaveCommunity('atelier');
    expect(calls.map((c) => c.url)).toEqual([
      '/billing',
      '/billing/entries?community=atelier',
      '/requests?status=queued',
      '/admin/requests?limit=5',
      '/requests',
      '/requests/12',
      '/communities/a%20b/members',
      '/communities/atelier/members/bob',
      '/communities/atelier/members/bob',
      '/communities/atelier/invitation',
      '/communities/a%20b/invitation',
      '/communities/atelier/membership',
    ]);
    expect(calls.slice(9).map((c) => c.init.method)).toEqual(['POST', 'DELETE', 'DELETE']);
    expect(calls[9].init).not.toHaveProperty('body');
    expect(calls[7].init).toMatchObject({ method: 'PUT', body: '{"monthly_limit":10}' });
    expect(calls[8].init).toMatchObject({ method: 'DELETE' });
    expect(calls[4].init).toEqual({
      method: 'POST',
      headers: { Authorization: 'Bearer wp_x', 'Content-Type': 'application/json' },
      body: '{"query":"q","provider":"brave","pages":2}',
      signal: expect.any(AbortSignal),
    });
    expect(calls[5].init).toEqual({ method: 'DELETE', headers: { Authorization: 'Bearer wp_x' }, signal: expect.any(AbortSignal) });
  });

  it("rend absolus les chemins de médias de l'API", () => {
    const api = createClient({ baseUrl: 'https://api.ex/api/v1', token: 'x' });
    expect(api.mediaUrl('/api/v1/media/a.webp')).toBe('https://api.ex/api/v1/media/a.webp');
    expect(api.mediaUrl(null)).toBeNull();
  });

  it('se contente du statut HTTP quand l’erreur n’est pas du JSON', async () => {
    const fetchFn = async () => new Response('<html>502</html>', { status: 502 });
    await expect(createClient(conn, fetchFn as typeof fetch).me()).rejects.toMatchObject({
      status: 502,
      code: 'http_error',
      message: 'HTTP 502',
    });
  });

  it('signale une API injoignable', async () => {
    const fetchFn = async () => { throw new TypeError('fetch failed'); };
    await expect(createClient(conn, fetchFn as typeof fetch).me()).rejects.toMatchObject({ status: 0, code: 'network' });
  });

  it("envoie la clé d'idempotence d'un achat et distingue un achat rejoué", async () => {
    const inits: RequestInit[] = [];
    let status = 201;
    const fetchFn = (async (_url: string, init: RequestInit) => {
      inits.push(init);
      return new Response(JSON.stringify({ request: { id: 3 }, balance: 7 }), { status });
    }) as unknown as typeof fetch;
    const api = createClient(conn, fetchFn);
    const input = { query: 'q', provider: 'brave', pages: 1 };
    expect(await api.createRequest(input, { idempotencyKey: 'k-1_A' })).toEqual({ request: { id: 3 }, balance: 7, replayed: false });
    status = 200;
    expect(await api.createRequest(input, { idempotencyKey: 'k-1_A' })).toMatchObject({ replayed: true });
    expect(inits[0].headers).toEqual({ Authorization: 'Bearer wp_x', 'Content-Type': 'application/json', 'Idempotency-Key': 'k-1_A' });
    await api.createRequest(input);
    expect(inits[2].headers).not.toHaveProperty('Idempotency-Key');
    for (const bad of ['', 'a b', 'x'.repeat(101), 'é']) {
      await expect(api.createRequest(input, { idempotencyKey: bad })).rejects.toMatchObject({ status: 0, code: 'bad_idempotency_key' });
    }
    expect(inits).toHaveLength(3);
  });

  it('prévient sur un 401, jeton révoqué en cours de session', async () => {
    const onUnauthorized = vi.fn();
    const fetchFn = async () => new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'révoqué' } }), { status: 401 });
    const api = createClient(conn, fetchFn as typeof fetch, { onUnauthorized });
    await expect(api.billing()).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    const forbidden = async () => new Response('{}', { status: 403 });
    await createClient(conn, forbidden as typeof fetch, { onUnauthorized }).billing().catch(() => null);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('abandonne une requête trop lente, avec une erreur lisible', async () => {
    // fetch qui ne répond jamais, sauf à l'abandon par le signal
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason)))) as unknown as typeof fetch;
    const err = await createClient(conn, hang, { timeoutMs: 20 }).me().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: 'timeout' });
    expect(err.message).toBe("L'API ne répond pas (plus de 1 s) : http://h/api/v1");
    const slowError = Object.assign(new Error('x'), { name: 'TimeoutError' });
    expect(await createClient(conn, (async () => { throw slowError; }) as typeof fetch).me().catch((e) => e.message)).toBe(
      "L'API ne répond pas (plus de 15 s) : http://h/api/v1",
    );
  });

  it('applique le délai à la lecture du corps', async () => {
    const timeout = Object.assign(new Error('lent'), { name: 'TimeoutError' });
    const slowBody = { ok: true, status: 200, json: async () => { throw timeout; }, blob: async () => { throw timeout; } };
    const api = createClient(conn, (async () => slowBody) as unknown as typeof fetch);
    await expect(api.me()).rejects.toMatchObject({ status: 0, code: 'timeout' });
    await expect(api.exportPool('p', 'csv')).rejects.toMatchObject({ code: 'timeout' });
    const broken = { ok: true, status: 200, json: async () => { throw new SyntaxError('JSON'); } };
    await expect(createClient(conn, (async () => broken) as unknown as typeof fetch).me()).rejects.toBeInstanceOf(SyntaxError);
  });
});

describe('format', () => {
  it("range l'usage commercial dans un ordre fixe, sans segments vides", () => {
    const segs = usageSegments([{ usage: null, urls: 1 }, { usage: 'payant', urls: 3 }, { usage: 'libre', urls: 0 }]);
    expect(segs.map((s) => [s.label, s.urls, s.share])).toEqual([['Payant', 3, 0.75], ['À qualifier', 1, 0.25]]);
    expect(usageLabel(null)).toBe('À qualifier');
    expect(usageLabel('sous-conditions')).toBe('Sous conditions');
  });

  it('formate nombres, scores et dates, avec un tiret pour l’absence', () => {
    expect(fmtNumber(1234567)).toMatch(/^1\s234\s567$/);
    expect(fmtNumber(null)).toBe('—');
    expect(fmtScore(0.5)).toBe('0.500');
    expect(fmtScore(undefined)).toBe('—');
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('2026-10-30T12:00:00Z')).toMatch(/30 oct\. 2026/);
    expect(usageLabel('inconnu')).toBe('inconnu');
  });

  it('ne garde que les liens http(s)', () => {
    expect(safeHref('https://a.b/c')).toBe('https://a.b/c');
    expect(safeHref('HTTP://a.b')).toBe('HTTP://a.b');
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('//a.b')).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
  });

  it('écrit une durée de run', () => {
    expect(fmtDuration('2026-01-01T00:00:00Z', '2026-01-01T00:00:02.5Z')).toBe('2.5 s');
    expect(fmtDuration('2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z')).toBe('5 min');
    expect(fmtDuration('2026-01-01T00:00:00Z', null)).toBe('—');
  });
});

describe('pagination', () => {
  it('garde première, dernière et voisines, sans ellipse d’une seule page', () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageList(4, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageList(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(pageList(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
    expect(pageList(17, 20)).toEqual([1, null, 16, 17, 18, 19, 20]);
  });
});

describe('format, suite', () => {
  it('découpe une URL pour l’affichage', () => {
    expect(splitUrl('https://ex.com/a?b=1#c')).toEqual({ scheme: 'https://', host: 'ex.com', rest: '/a?b=1#c' });
    expect(splitUrl('pas une url')).toEqual({ scheme: '', host: '', rest: 'pas une url' });
  });

  it('nomme usages et statuts, même inconnus', () => {
    expect(usageOf(null)).toMatchObject({ slug: 'a-qualifier', label: 'À qualifier' });
    expect(usageOf('nouveau')).toEqual({ slug: 'a-qualifier', label: 'nouveau' });
    expect(urlStatusLabel('classified')).toBe('classée');
    expect(urlStatusLabel('autre')).toBe('autre');
  });
});

describe('copie de liste', () => {
  const links: CopyLink[] = [
    { rank: 1, url: 'https://a.test/x(1)', title: 'Titre [beta]\n long', domain: 'a.test', usage_commercial: 'libre' },
    { rank: 2, url: 'https://b.test/', title: '=SUM(A1)', domain: 'b.test', usage_commercial: null },
    { rank: 3, url: 'https://c.test/', title: null, domain: 'c.test', usage_commercial: 'payant' },
  ];

  it('écrit les URLs seules, une par ligne', () => {
    expect(formatLinks(links, 'txt')).toBe('https://a.test/x(1)\nhttps://b.test/\nhttps://c.test/\n');
  });

  it('écrit un Markdown qui ne casse pas sur crochets et parenthèses', () => {
    expect(formatLinks(links, 'md')).toBe(
      '- [Titre \\[beta\\] long](https://a.test/x%281%29)\n- [=SUM(A1)](https://b.test/)\n- [https://c.test/](https://c.test/)\n',
    );
  });

  it('écrit un CSV qui neutralise les formules', () => {
    expect(formatLinks(links, 'csv').split('\n')).toEqual([
      'rank,title,url,domain,usage',
      '1,"Titre [beta]\n long",https://a.test/x(1),a.test,libre'.split('\n')[0],
      ' long",https://a.test/x(1),a.test,libre',
      "2,'=SUM(A1),https://b.test/,b.test,a-qualifier",
      '3,,https://c.test/,c.test,payant',
      '',
    ]);
  });

  it('charge toutes les pages du pool', async () => {
    const pages = [
      { items: [links[0], links[1]], total: 3 },
      { items: [links[2]], total: 3 },
    ];
    const client = { poolItems: vi.fn(async () => pages.shift()) };
    const all = await fetchAllLinks(client as never, 'p', 2);
    expect(all.map((l) => l.rank)).toEqual([1, 2, 3]);
    expect(client.poolItems.mock.calls).toEqual([
      ['p', { limit: 2, offset: 0 }],
      ['p', { limit: 2, offset: 2 }],
    ]);
  });

  it('s’arrête sur une page vide', async () => {
    const client = { poolItems: vi.fn(async () => ({ items: [], total: 10 })) };
    expect(await fetchAllLinks(client as never, 'p')).toEqual([]);
    expect(client.poolItems).toHaveBeenCalledTimes(1);
  });
});

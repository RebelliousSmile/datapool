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
    expect(fetchFn).toHaveBeenCalledWith('http://h/api/v1/pools/a%2Fb', { headers: { Authorization: 'Bearer wp_x' } });
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

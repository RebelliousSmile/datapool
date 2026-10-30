import { describe, expect, it, vi } from 'vitest';
import { ApiError, buildUrl, createClient } from '../src/lib/api/client';
import { fmtDuration, usageLabel, usageSegments } from '../src/lib/format';

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

  it('écrit une durée de run', () => {
    expect(fmtDuration('2026-01-01T00:00:00Z', '2026-01-01T00:00:02.5Z')).toBe('2.5 s');
    expect(fmtDuration('2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z')).toBe('5 min');
    expect(fmtDuration('2026-01-01T00:00:00Z', null)).toBe('—');
  });
});

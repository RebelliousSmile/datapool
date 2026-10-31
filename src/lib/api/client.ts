import type { components } from './schema';

// Client de l'API webpool. Les types viennent de webpool/openapi.json
// (`pnpm api:types`) : ne pas éditer schema.d.ts à la main.

export type Schemas = components['schemas'];
export type Page<T> = { items: T[]; total: number; limit: number; offset: number };
export type Query = Record<string, string | number | boolean | string[] | null | undefined>;

export type Connection = { baseUrl: string; token: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Paramètres vides ignorés, tableaux répétés (`facet=a:b&facet=c:d`).
export function buildUrl(baseUrl: string, path: string, query: Query = {}): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    for (const v of Array.isArray(value) ? value : [value]) url.searchParams.append(key, String(v));
  }
  return url.toString();
}

export function createClient(conn: Connection, fetchFn: typeof fetch = fetch) {
  // GET par défaut ; un corps part en JSON (POST /requests).
  async function request(path: string, query?: Query, init: { method?: string; body?: unknown } = {}): Promise<Response> {
    let res: Response;
    try {
      res = await fetchFn(
        buildUrl(conn.baseUrl, path, query),
        init.method
          ? {
              method: init.method,
              headers: {
                Authorization: `Bearer ${conn.token}`,
                ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
              },
              ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
            }
          : { headers: { Authorization: `Bearer ${conn.token}` } },
      );
    } catch {
      throw new ApiError(0, 'network', `API injoignable : ${conn.baseUrl}`);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.error?.code ?? 'http_error', body?.error?.message ?? `HTTP ${res.status}`);
    }
    return res;
  }
  const get = async <T>(path: string, query?: Query): Promise<T> => (await request(path, query)).json();
  const send = async <T>(method: string, path: string, body?: unknown): Promise<T> =>
    (await request(path, undefined, { method, body })).json();
  const seg = encodeURIComponent;

  return {
    // Chemin de média de l'API (`/api/v1/media/…`) → URL absolue, ou null.
    mediaUrl: (path: string | null | undefined) => (path ? new URL(path, conn.baseUrl).href : null),
    me: () => get<Schemas['Me']>('/me'),
    pools: () => get<{ items: Schemas['PoolSummary'][] }>('/pools'),
    pool: (slug: string) => get<Schemas['Pool']>(`/pools/${seg(slug)}`),
    poolItems: (slug: string, query: Query) => get<Page<Schemas['PoolItem']>>(`/pools/${seg(slug)}/items`, query),
    stats: () => get<Schemas['Stats']>('/admin/stats'),
    urls: (query: Query) => get<Page<Schemas['UrlSummary']>>('/admin/urls', query),
    url: (id: number | string) => get<Schemas['Url']>(`/admin/urls/${seg(String(id))}`),
    themes: () => get<{ items: Schemas['Theme'][] }>('/admin/themes'),
    domains: (query: Query) => get<Page<Schemas['Domain']>>('/admin/domains', query),
    queries: (query: Query) => get<Page<Schemas['SearchQuery']>>('/admin/queries', query),
    runs: (query: Query) => get<Page<Schemas['Run']>>('/admin/runs', query),
    // Recherches payantes : prix, portefeuilles, achat et annulation.
    billing: () => get<Schemas['Billing']>('/billing'),
    billingEntries: (query: Query) => get<Page<Schemas['WalletEntry']>>('/billing/entries', query),
    requests: (query: Query) => get<Page<Schemas['SearchRequest']>>('/requests', query),
    createRequest: (input: Schemas['SearchRequestInput']) => send<Schemas['RequestReceipt']>('POST', '/requests', input),
    cancelRequest: (id: number) => send<Schemas['CancelReceipt']>('DELETE', `/requests/${seg(String(id))}`),
    adminRequests: (query: Query) => get<Page<Schemas['SearchRequest']>>('/admin/requests', query),
    // Membres d'une communauté, pour ses propriétaires.
    members: (slug: string) => get<{ items: Schemas['CommunityMember'][] }>(`/communities/${seg(slug)}/members`),
    setMember: (slug: string, name: string, input: Schemas['CommunityMemberInput']) =>
      send<Schemas['CommunityMemberSet']>('PUT', `/communities/${seg(slug)}/members/${seg(name)}`, input),
    removeMember: (slug: string, name: string) =>
      send<{ community: string; name: string }>('DELETE', `/communities/${seg(slug)}/members/${seg(name)}`),
    // Le jeton passe par l'en-tête : un simple lien ne suffit pas.
    exportPool: async (slug: string, format: 'json' | 'csv' | 'md') =>
      (await request(`/admin/pools/${seg(slug)}/export`, { format })).blob(),
  };
}

export type Client = ReturnType<typeof createClient>;

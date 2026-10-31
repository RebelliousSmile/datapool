import type { Schemas } from './api/client';
import type { CopyLink } from './copy';
import { MEDIA, SOURCES, hostOf, mediaOf, sourceOf, type Media, type Source } from './kinds';
import { USAGE } from './format';

// Explorateur de pool — fonctions pures : correspondance, effectifs par
// facette, jetons de requête, suggestions, groupes, état ↔ URL. Le pool entier
// (≤ 1 000 liens) est en mémoire : chaque clic se calcule sans réseau.

export const DIMS = ['media', 'source', 'usage', 'domain'] as const;
export type Dim = (typeof DIMS)[number];
export type SegDim = Exclude<Dim, 'domain'>;
export type Density = 'comfort' | 'compact' | 'grid';
export type Group = 'none' | Dim;

// Mot-clé de chaque dimension dans la barre de requête (`type:image`).
export const KEY: Record<Dim, string> = { media: 'type', source: 'source', usage: 'usage', domain: 'domaine' };
const DIM_OF_KEY: Record<string, Dim> = { type: 'media', source: 'source', usage: 'usage', domaine: 'domain', domain: 'domain' };

// Lien tel que l'API le donne : les champs de médias manquent pour une API
// antérieure à la phase 3 (repli sur la déduction locale).
export type ApiLink = CopyLink & { id?: number } & Partial<
  Pick<Schemas['PoolItem'], 'description' | 'media_type' | 'source' | 'thumbnail' | 'favicon'>
>;

export type XLink = CopyLink & {
  id?: number;
  media: Media;
  source: Source;
  usage: string;
  host: string;
  text: string;
  description: string | null;
  thumbnail: string | null;
  favicon: string | null;
};

export type XState = {
  seg: SegDim;
  tab: string;
  q: string;
  group: Group;
  density: Density;
  f: Record<Dim, string[]>;
};

export const defaultState = (): XState => ({
  seg: 'media',
  tab: '',
  q: '',
  group: 'none',
  density: 'comfort',
  f: { media: [], source: [], usage: [], domain: [] },
});

// Lien de l'API complété de ses dimensions ; `usage` est la clé CSS (`a-qualifier`
// pour null). Type et source viennent de l'API, sinon de la déduction locale ;
// `resolveMedia` rend absolus les chemins de vignette et de favicon.
export function enrich(link: ApiLink, resolveMedia: (path: string | null | undefined) => string | null = (p) => p ?? null): XLink {
  const host = (link.domain ?? hostOf(link.url)).toLowerCase().replace(/^www\./, '');
  const description = link.description ?? null;
  return {
    ...link,
    media: link.media_type ?? mediaOf(link.url),
    source: link.source ?? sourceOf(host),
    usage: link.usage_commercial ?? 'a-qualifier',
    host,
    description,
    thumbnail: resolveMedia(link.thumbnail),
    favicon: resolveMedia(link.favicon),
    text: `${link.title ?? ''} ${link.url} ${description ?? ''}`.toLowerCase(),
  };
}

const valueOf = (link: XLink, dim: Dim): string => (dim === 'domain' ? link.host : link[dim]);

// Libellés et ordre des valeurs d'une dimension. Les domaines se rangent par
// effectif décroissant sur tout le pool.
export function labelOf(dim: Dim, value: string): string {
  if (dim === 'media') return MEDIA.find((m) => m.key === value)?.label ?? value;
  if (dim === 'source') return SOURCES.find((s) => s.key === value)?.label ?? value;
  if (dim === 'usage') return USAGE.find((u) => u.slug === value)?.label ?? value;
  return value;
}

export function orderOf(dim: Dim, links: XLink[]): string[] {
  if (dim === 'media') return MEDIA.map((m) => m.key);
  if (dim === 'source') return SOURCES.map((s) => s.key);
  if (dim === 'usage') return USAGE.map((u) => u.slug);
  const n = new Map<string, number>();
  for (const l of links) n.set(l.host, (n.get(l.host) ?? 0) + 1);
  return [...n.keys()].sort((a, b) => n.get(b)! - n.get(a)! || a.localeCompare(b));
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

// `except` ignore un critère : les effectifs d'une facette se comptent sans
// elle-même, pour montrer ce qu'on obtiendrait en la changeant.
export function matches(link: XLink, s: XState, except?: Dim | 'tab' | 'q'): boolean {
  if (except !== 'tab' && s.tab && valueOf(link, s.seg) !== s.tab) return false;
  for (const d of DIMS) {
    if (d !== except && s.f[d].length && !s.f[d].includes(valueOf(link, d))) return false;
  }
  if (except !== 'q') for (const w of words(s.q)) if (!link.text.includes(w)) return false;
  return true;
}

export const filterLinks = (links: XLink[], s: XState) => links.filter((l) => matches(l, s));

export function counts(links: XLink[], dim: Dim, s: XState, except?: Dim | 'tab' | 'q' | null): Map<string, number> {
  const c = new Map<string, number>();
  for (const l of links) {
    if (!matches(l, s, except ?? undefined)) continue;
    const v = valueOf(l, dim);
    c.set(v, (c.get(v) ?? 0) + 1);
  }
  return c;
}

export const activeCount = (s: XState) => DIMS.reduce((n, d) => n + s.f[d].length, 0) + (s.tab ? 1 : 0);

// Modifications d'état : elles renvoient un nouvel état.
export function addFilter(s: XState, dim: Dim, value: string): XState {
  if (dim === s.seg) return { ...s, tab: value };
  if (s.f[dim].includes(value)) return s;
  return { ...s, f: { ...s.f, [dim]: [...s.f[dim], value] } };
}

export function removeFilter(s: XState, dim: Dim, value: string): XState {
  if (dim === s.seg && s.tab === value) return { ...s, tab: '' };
  return { ...s, f: { ...s.f, [dim]: s.f[dim].filter((v) => v !== value) } };
}

export function toggleFilter(s: XState, dim: Dim, value: string): XState {
  return s.f[dim].includes(value) ? removeFilter(s, dim, value) : addFilter(s, dim, value);
}

// Le dernier jeton saisi (Retour arrière dans une barre vide).
export function popFilter(s: XState): XState {
  const last = [...DIMS].reverse().find((d) => s.f[d].length);
  if (last) return { ...s, f: { ...s.f, [last]: s.f[last].slice(0, -1) } };
  return { ...s, tab: '' };
}

export const clearFilters = (s: XState): XState => ({ ...s, tab: '', q: '', f: defaultState().f });

// Changer la dimension de segment : l'onglet devient une facette de l'ancienne
// dimension, et une facette unique de la nouvelle devient l'onglet.
export function changeSeg(s: XState, seg: SegDim): XState {
  const f = { ...s.f };
  if (s.tab) f[s.seg] = [s.tab];
  const tab = f[seg].length === 1 ? f[seg][0] : '';
  if (tab) f[seg] = [];
  return { ...s, seg, tab, f };
}

// Jetons actifs, dans l'ordre d'affichage : onglet puis facettes.
export function tokens(s: XState): { dim: Dim; value: string }[] {
  const out: { dim: Dim; value: string }[] = s.tab ? [{ dim: s.seg, value: s.tab }] : [];
  for (const d of DIMS) for (const value of s.f[d]) out.push({ dim: d, value });
  return out;
}

// `type:vid ` (terminé par une espace) devient un filtre si une valeur connue
// commence ainsi (clé ou libellé, sans accents ni casse).
const fold = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function parseToken(input: string, links: XLink[]): { dim: Dim; value: string } | null {
  const m = /^(type|source|usage|domaine|domain):(\S+)\s$/i.exec(input);
  if (!m) return null;
  const dim = DIM_OF_KEY[m[1].toLowerCase()];
  const wanted = fold(m[2]);
  const value = orderOf(dim, links).find((v) => fold(v) === wanted || fold(labelOf(dim, v)).startsWith(wanted));
  return value ? { dim, value } : null;
}

export type Suggestion = { dim: Dim; value: string; label: string; n: number };

// Filtres suggérés : valeurs présentes dans la sélection, pas déjà actives,
// dont le libellé contient la saisie ; les plus fréquentes d'abord.
export function suggestions(links: XLink[], s: XState, input: string, max = 6): Suggestion[] {
  const q = fold(input.trim());
  const rows: Suggestion[] = [];
  for (const dim of DIMS) {
    if (s.tab && dim === s.seg) continue;
    const c = counts(links, dim, s, 'q');
    for (const value of orderOf(dim, links)) {
      const n = c.get(value) ?? 0;
      if (!n || s.f[dim].includes(value)) continue;
      const label = labelOf(dim, value);
      if (q && !fold(label).includes(q) && !fold(value).includes(q)) continue;
      rows.push({ dim, value, label, n });
    }
  }
  return rows.sort((a, b) => b.n - a.n).slice(0, max);
}

export function groupLinks(links: XLink[], dim: Dim, all: XLink[]): { value: string; links: XLink[] }[] {
  return orderOf(dim, all)
    .map((value) => ({ value, links: links.filter((l) => valueOf(l, dim) === value) }))
    .filter((g) => g.links.length);
}

// État ↔ paramètres d'URL ; seules les valeurs non par défaut y figurent.
const SEGS: SegDim[] = ['media', 'source', 'usage'];
const GROUPS: Group[] = ['none', ...DIMS];
const DENSITIES: Density[] = ['comfort', 'compact', 'grid'];

export function toParams(s: XState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.seg !== 'media') p.set('seg', s.seg);
  if (s.tab) p.set('tab', s.tab);
  for (const d of DIMS) if (s.f[d].length) p.set(d, s.f[d].join(','));
  if (s.group !== 'none') p.set('group', s.group);
  if (s.density !== 'comfort') p.set('density', s.density);
  return p;
}

export function fromParams(p: Pick<URLSearchParams, 'get'>, fallback: Partial<XState> = {}): XState {
  const s = { ...defaultState(), ...fallback, f: { ...defaultState().f } };
  const pick = <T extends string>(name: string, allowed: readonly T[]) => {
    const v = p.get(name) as T | null;
    return v && allowed.includes(v) ? v : undefined;
  };
  s.q = p.get('q') ?? '';
  s.seg = pick('seg', SEGS) ?? s.seg;
  s.tab = p.get('tab') ?? '';
  for (const d of DIMS) s.f[d] = (p.get(d) ?? '').split(',').filter(Boolean);
  s.group = pick('group', GROUPS) ?? s.group;
  s.density = pick('density', DENSITIES) ?? s.density;
  return s;
}

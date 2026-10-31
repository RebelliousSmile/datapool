// Mise en forme pour l'affichage (fr-FR).

const numberFmt = new Intl.NumberFormat('fr-FR');
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export const fmtNumber = (n: number | null | undefined) => (n == null ? '—' : numberFmt.format(n));
export const fmtScore = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(3));
export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—');

// Durée d'un run, en secondes ou minutes.
export function fmtDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '—';
  const s = Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return s < 60 ? `${s.toFixed(1)} s` : `${Math.round(s / 60)} min`;
}

// Lien externe : seuls http(s) sont rendus cliquables. Une URL du corpus peut
// être brute (ingérée, jamais normalisée) : un `javascript:` exécuterait du code
// dans la page qui porte le jeton.
export const safeHref = (url: string | null | undefined): string | undefined =>
  url && /^https?:\/\//i.test(url) ? url : undefined;

// Usage commercial : ordre fixe (une valeur garde toujours sa couleur et sa
// forme, voir src/styles/tokens.css), « à qualifier » en gris neutre. `slug`
// est la clé CSS (`data-usage`).
export const USAGE = [
  { key: 'libre', slug: 'libre', label: 'Libre', color: 'var(--usage-libre)' },
  { key: 'sous-conditions', slug: 'sous-conditions', label: 'Sous conditions', color: 'var(--usage-sous-conditions)' },
  { key: 'payant', slug: 'payant', label: 'Payant', color: 'var(--usage-payant)' },
  { key: 'non-commercial', slug: 'non-commercial', label: 'Non commercial', color: 'var(--usage-non-commercial)' },
  { key: null, slug: 'a-qualifier', label: 'À qualifier', color: 'var(--usage-a-qualifier)' },
] as const;

// Une valeur inconnue (ajoutée côté webpool, pas encore ici) reste lisible.
export function usageOf(key: string | null | undefined): { slug: string; label: string } {
  return USAGE.find((u) => u.key === (key ?? null)) ?? { slug: 'a-qualifier', label: String(key) };
}

export const usageLabel = (key: string | null | undefined): string => usageOf(key).label;

// Segments d'une barre empilée, dans l'ordre fixe de USAGE, sans les valeurs nulles.
export function usageSegments(rows: { usage?: string | null; urls?: number }[]) {
  const total = rows.reduce((n, r) => n + (r.urls ?? 0), 0);
  return USAGE.map((u) => {
    const urls = rows.find((r) => (r.usage ?? null) === u.key)?.urls ?? 0;
    return { ...u, urls, share: total ? urls / total : 0 };
  }).filter((s) => s.urls > 0);
}

// Pages à proposer dans la pagination : première, dernière, voisines de la
// courante, et `null` pour une ellipse.
export function pageList(current: number, count: number, around = 1): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let p = 1; p <= count; p++) {
    // une ellipse qui ne cacherait qu'une page affiche plutôt cette page
    const edge = (p === 2 && current - around === 3) || (p === count - 1 && current + around === count - 2);
    if (p === 1 || p === count || Math.abs(p - current) <= around || edge) pages.push(p);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}

// URL découpée pour l'affichage : schéma atténué, hôte en avant, reste.
export function splitUrl(url: string): { scheme: string; host: string; rest: string } {
  const m = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)(.*)$/i.exec(url);
  return m ? { scheme: m[1], host: m[2], rest: m[3] } : { scheme: '', host: '', rest: url };
}

// Statut d'une URL dans le pipeline webpool, en clair.
export const URL_STATUS_LABELS: Record<string, string> = {
  pending: 'en attente',
  normalized: 'normalisée',
  classified: 'classée',
  duplicate: 'doublon',
  error: 'erreur',
};
export const urlStatusLabel = (status: string | null | undefined) => URL_STATUS_LABELS[status ?? ''] ?? String(status);

// « 1 lien », « 2 liens » (nombre mis en forme) ; `plural` pour un pluriel irrégulier.
export const countOf = (n: number, word: string, plural = `${word}s`) => `${fmtNumber(n)} ${n > 1 ? plural : word}`;

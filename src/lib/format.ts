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

// Usage commercial : ordre fixe des couleurs (une valeur garde toujours la
// même), « à qualifier » en gris neutre.
export const USAGE = [
  { key: 'libre', label: 'Libre', color: 'var(--series-1)' },
  { key: 'sous-conditions', label: 'Sous conditions', color: 'var(--series-2)' },
  { key: 'payant', label: 'Payant', color: 'var(--series-3)' },
  { key: 'non-commercial', label: 'Non commercial', color: 'var(--series-4)' },
  { key: null, label: 'À qualifier', color: 'var(--neutral)' },
] as const;

export function usageLabel(key: string | null | undefined): string {
  return USAGE.find((u) => u.key === (key ?? null))?.label ?? String(key);
}

// Segments d'une barre empilée, dans l'ordre fixe de USAGE, sans les valeurs nulles.
export function usageSegments(rows: { usage?: string | null; urls?: number }[]) {
  const total = rows.reduce((n, r) => n + (r.urls ?? 0), 0);
  return USAGE.map((u) => {
    const urls = rows.find((r) => (r.usage ?? null) === u.key)?.urls ?? 0;
    return { ...u, urls, share: total ? urls / total : 0 };
  }).filter((s) => s.urls > 0);
}

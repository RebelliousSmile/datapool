import type { Client, Schemas } from './api/client';

// Copie d'une liste entière de liens : mise en forme (fonctions pures),
// chargement de toutes les pages, presse-papiers.

export type CopyFormat = 'txt' | 'md' | 'csv';
export type CopyLink = Pick<Schemas['PoolItem'], 'rank' | 'url' | 'title' | 'domain' | 'usage_commercial'>;

export const COPY_FORMATS: { key: CopyFormat; label: string; short: string; sample: string }[] = [
  { key: 'txt', label: 'URLs seules', short: 'URLs', sample: 'https://exemple.org/page' },
  { key: 'md', label: 'Markdown', short: 'MD', sample: '- [Titre](https://exemple.org/page)' },
  { key: 'csv', label: 'CSV', short: 'CSV', sample: 'rank,title,url,domain,usage' },
];

// Format choisi dans le menu de copie, partagé par la copie du pool et celle d'un groupe.
const FORMAT_KEY = 'datapool.copyFormat';
export function getCopyFormat(): CopyFormat {
  const saved = localStorage.getItem(FORMAT_KEY);
  return COPY_FORMATS.some((f) => f.key === saved) ? (saved as CopyFormat) : 'txt';
}
export const setCopyFormat = (format: CopyFormat) => localStorage.setItem(FORMAT_KEY, format);

// Les titres viennent du web : une cellule débutant par = + - @ serait évaluée
// comme formule par un tableur (même règle que l'export CSV de webpool).
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const mdText = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/[[\]\\]/g, (c) => `\\${c}`);
const mdUrl = (s: string) => s.replaceAll('(', '%28').replaceAll(')', '%29').replaceAll(' ', '%20');

export function formatLinks(links: CopyLink[], format: CopyFormat): string {
  if (format === 'txt') return links.map((l) => l.url).join('\n') + '\n';
  if (format === 'md') {
    return links.map((l) => `- [${mdText(l.title || l.url)}](${mdUrl(l.url)})`).join('\n') + '\n';
  }
  const lines = ['rank,title,url,domain,usage'];
  for (const l of links) {
    lines.push([l.rank, l.title, l.url, l.domain, l.usage_commercial ?? 'a-qualifier'].map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

// Tout le pool, dans l'ordre de rang, page après page (500 par appel, le
// maximum de l'API) : « toute la liste », pas seulement la page affichée.
export async function fetchAllLinks(client: Client, slug: string, pageSize = 500): Promise<CopyLink[]> {
  const links: CopyLink[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.poolItems(slug, { limit: pageSize, offset });
    links.push(...page.items);
    if (page.items.length === 0 || offset + pageSize >= page.total) return links;
  }
}

// Presse-papiers ; repli sur execCommand quand l'API est absente (contexte non
// sécurisé). Lève une erreur si la copie est refusée.
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Copie refusée par le navigateur');
  } finally {
    area.remove();
  }
}

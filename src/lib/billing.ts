import type { Schemas } from './api/client';
import { fmtNumber } from './format';

// Recherches payantes — fonctions pures : giri, payeurs possibles, devis d'une
// recherche avant l'achat. L'API refait tous ces contrôles ; ici, ils évitent
// d'envoyer un achat voué au refus et annoncent le solde après coup.

type Billing = Schemas['Billing'];
type SearchRequest = Schemas['SearchRequest'];

const euroFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 3 });

export const fmtGiri = (giri: number) => `${fmtNumber(giri)} giri`;
export const fmtEuros = (giri: number, giriPerEur: number) => euroFmt.format(giri / giriPerEur);

export type Payer = {
  // '' : portefeuille personnel ; sinon slug de la communauté
  value: string;
  label: string;
  balance: number;
  // giri encore dépensables par le membre sur 30 jours (null : sans plafond)
  limitLeft: number | null;
  disabled: string | null;
};

// Portefeuilles qui peuvent payer une recherche visant `pool`. Dans une
// communauté, on ne paie pas pour soi : un pool d'une de ses communautés se
// paie sur leur pot, jamais en personnel ; une communauté ne paie que ses pools.
// Un admin (la maison) ne se facture pas : son choix « gratuit » vaut pour tout pool.
export function payersFor(billing: Billing, pool: string, { admin = false }: { admin?: boolean } = {}): Payer[] {
  const owners = billing.communities.filter((c) => pool && c.pools.includes(pool));
  return [
    {
      value: '',
      label: admin ? 'Gratuit (admin)' : 'Portefeuille personnel',
      balance: billing.personal.balance,
      limitLeft: null,
      disabled:
        owners.length && !admin ? `les recherches de ce pool se paient sur le pot de ${owners.map((c) => c.label).join(' ou ')}` : null,
    },
    ...billing.communities.map((c) => ({
      value: c.slug,
      label: `Communauté ${c.label}`,
      balance: c.balance,
      limitLeft: c.monthly_limit === null ? null : Math.max(0, c.monthly_limit - c.spent_30d),
      disabled: !pool
        ? 'choisir un de ses pools'
        : c.pools.includes(pool)
          ? null
          : `ne paie que ses pools (${c.pools.join(', ') || 'aucun'})`,
    })),
  ];
}

// Payeur par défaut : le premier possible (le pot de la communauté pour ses pools).
export const defaultPayer = (payers: Payer[]) => payers.find((p) => !p.disabled)?.value ?? '';

export type Quote = {
  unitPrice: number;
  maxPages: number;
  price: number;
  balance: number;
  after: number;
  // null : l'achat est possible
  problem: string | null;
};

export function quote(
  billing: Billing,
  { provider, pages, payer, admin = false }: { provider: string; pages: number; payer: Payer | undefined; admin?: boolean },
): Quote | null {
  const price = billing.prices.find((p) => p.provider === provider);
  if (!price || !payer) return null;
  // admin sans communauté : gratuit
  const total = admin && !payer.value ? 0 : price.unit_price * pages;
  const base = { unitPrice: price.unit_price, maxPages: price.max_pages, price: total, balance: payer.balance, after: payer.balance - total };
  let problem: string | null = null;
  if (payer.disabled) problem = payer.value ? `Cette communauté ${payer.disabled}.` : `Pas en personnel : ${payer.disabled}.`;
  else if (!Number.isInteger(pages) || pages < 1 || pages > price.max_pages) problem = `De 1 à ${price.max_pages} page${price.max_pages > 1 ? 's' : ''} pour ${provider}.`;
  else if (total > payer.balance) problem = `Solde insuffisant : ${fmtGiri(payer.balance)} pour ${fmtGiri(total)}.`;
  else if (payer.limitLeft !== null && total > payer.limitLeft) problem = `Plafond du mois : il vous reste ${fmtGiri(payer.limitLeft)}.`;
  return { ...base, problem };
}

export const REQUEST_STATUS_LABELS: Record<SearchRequest['status'], string> = {
  queued: 'en attente',
  running: 'en cours',
  done: 'faite',
  failed: 'en échec',
  cancelled: 'annulée',
};

// giri finalement dépensés : prix moins remboursements.
export const spentOn = (r: Pick<SearchRequest, 'price' | 'refunded'>) => r.price - r.refunded;

// Plafond saisi par un propriétaire : vide → sans plafond (null), entier ≥ 0
// sinon ; undefined si la saisie est invalide.
export function parseLimit(raw: string | number | null | undefined): number | null | undefined {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

// Classe de la pastille de statut (`.status` de ui.css).
export const STATUS_CLASS: Record<SearchRequest['status'], string> = {
  queued: 'idle',
  running: 'running',
  done: 'ok',
  failed: 'failed',
  cancelled: 'idle',
};

export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS_LABELS) as SearchRequest['status'][];

// Historique affiché : '' mes recherches, un slug : une communauté possédée,
// ALL_REQUESTS : toutes les recherches (admin, GET /admin/requests).
export const ALL_REQUESTS = '*';

export function historyQuery(view: string, { status = '', limit, offset }: { status?: string; limit: number; offset: number }) {
  const page = { status: status || undefined, limit, offset };
  return view === ALL_REQUESTS
    ? { admin: true, query: page }
    : { admin: false, query: { ...page, community: view || undefined } };
}

// `?pool=` d'un lien : gardé seulement s'il figure dans la liste des pools.
export const knownPool = (pools: { slug: string }[], slug: string) => (pools.some((p) => p.slug === slug) ? slug : '');

export const ENTRY_KIND_LABELS: Record<Schemas['WalletEntry']['kind'], string> = {
  donation: 'don',
  purchase: 'apport',
  debit: 'achat',
  refund: 'remboursement',
  adjustment: 'ajustement',
};

// giri signés pour le grand livre : « +1 000 » au crédit, « −200 » au débit.
export const fmtDelta = (delta: number) => `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtNumber(Math.abs(delta))}`;

const centsFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Détail d'une écriture : recherche liée, montant reçu, référence, note.
export function entryDetail(e: Pick<Schemas['WalletEntry'], 'search_request_id' | 'amount_cents' | 'reference' | 'note'>) {
  const parts = [
    e.search_request_id ? `recherche #${e.search_request_id}` : '',
    e.amount_cents ? `${centsFmt.format(e.amount_cents / 100)} reçus` : '',
    e.reference ?? '',
    e.note ?? '',
  ];
  return parts.filter(Boolean).join(' · ') || '—';
}

// --- Listes de liens (provider `list`) : un membre soumet des liens pour un
// pool de sa communauté ; webpool les examine comme les résultats d'une recherche.

export const LIST_PROVIDER = 'list';

export type ParsedLinks = {
  links: { url: string; title: string | null }[];
  // lignes refusées (numéro à partir de 1, texte), à corriger avant l'envoi
  rejected: { line: number; text: string }[];
  duplicates: number;
};

// Lecture d'une liste de liens dans le format où elle existe — même
// algorithme que webpool (src/requests/links.js, `webpool list submit`) :
// - favoris HTML (export de navigateur) : chaque <a href="http…">titre</a> ;
// - Markdown : [titre](url) n'importe où dans la ligne, ou URL nue après une puce ;
// - CSV ou TSV : la colonne http(s) est l'URL, la première autre colonne non
//   vide le titre ; une ligne d'en-tête (url, title…) est ignorée ;
// - texte : l'URL puis un titre facultatif.
// Lignes vides et commentaires (#) ignorés, doublons retirés. Rien n'est
// interprété comme du HTML : les favoris sont lus par expression régulière.
const HTTP = /^https?:\/\//i;
const MD_LINK = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi;
const HTML_LINK = /<a\s[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const HEADER = /^\s*"?(url|lien|link|href)"?\s*[,;\t]/i;
const decodeEntities = (t: string) =>
  t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const cleanTitle = (t: string | undefined) => (t ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
const unquote = (f: string) => f.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim();

function validUrl(url: string) {
  if (url.length > 2000) return false;
  try {
    const p = new URL(url);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseLinkLines(text: string): ParsedLinks {
  const out: ParsedLinks = { links: [], rejected: [], duplicates: 0 };
  const seen = new Set<string>();
  const push = (url: string, title?: string) => {
    const u = decodeEntities(url.trim());
    if (seen.has(u)) {
      out.duplicates += 1;
      return true;
    }
    if (!validUrl(u)) return false;
    seen.add(u);
    out.links.push({ url: u, title: cleanTitle(title && decodeEntities(title)) });
    return true;
  };
  if (/<a\s[^>]*href/i.test(text)) {
    for (const m of text.matchAll(HTML_LINK)) push(m[1], m[2]);
    return out;
  }
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || HEADER.test(line)) return;
    const reject = () => out.rejected.push({ line: i + 1, text: line.slice(0, 120) });
    const md = [...line.matchAll(MD_LINK)];
    if (md.length) {
      for (const m of md) if (!push(m[2], m[1])) reject();
      return;
    }
    const fields = line.split(/\t|;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(unquote);
    if (fields.length > 1 && fields.some((f) => HTTP.test(f))) {
      const url = fields.find((f) => HTTP.test(f)) as string;
      const title = fields.find((f) => f && f !== url);
      if (!push(url, title)) reject();
      return;
    }
    const [first, ...rest] = line.replace(/^([-*+]|\d+[.)])\s+/, '').split(/\s+/);
    if (!HTTP.test(first) || !push(first, rest.join(' '))) reject();
  });
  return out;
}

// Devis d'une liste : payée d'un bloc par le pot d'une communauté, au prix
// par lien ; jamais sur le portefeuille personnel.
// `admin` : la maison ne se facture pas ; sans communauté, la liste est gratuite
// et vise n'importe quel pool.
export function quoteList(billing: Billing, { count, payer, admin = false }: { count: number; payer: Payer | undefined; admin?: boolean }): Quote | null {
  if (!payer) return null;
  const { price_per_link: perLink, max_links: maxLinks } = billing.lists;
  if (admin && !payer.value) {
    const problem = count === 0 ? 'Coller au moins un lien (une URL par ligne).' : count > maxLinks ? `${maxLinks} liens au plus par liste (${count} ici).` : null;
    return { unitPrice: 0, maxPages: 1, price: 0, balance: payer.balance, after: payer.balance, problem };
  }
  const total = perLink * count;
  const base = { unitPrice: perLink, maxPages: 1, price: total, balance: payer.balance, after: payer.balance - total };
  let problem: string | null = null;
  if (!payer.value) problem = "Une liste se paie sur le pot d'une communauté : choisir un pool de votre communauté.";
  else if (payer.disabled) problem = `Cette communauté ${payer.disabled}.`;
  else if (count === 0) problem = 'Coller au moins un lien (une URL par ligne).';
  else if (count > maxLinks) problem = `${maxLinks} liens au plus par liste (${count} ici).`;
  else if (total > payer.balance) problem = `Solde insuffisant : ${fmtGiri(payer.balance)} pour ${fmtGiri(total)}.`;
  else if (payer.limitLeft !== null && total > payer.limitLeft) problem = `Plafond du mois : il vous reste ${fmtGiri(payer.limitLeft)}.`;
  return { ...base, problem };
}

// Sort d'un lien après examen (GET /requests/{id}/links).
export const OUTCOME_LABELS: Record<Schemas['RequestLink']['outcome'], string> = {
  queued: 'en attente',
  examining: 'en examen',
  error: 'erreur',
  in_pool: 'dans le pool',
  not_in_pool: 'hors du pool',
  in_corpus: 'dans le corpus',
};
export const OUTCOME_CLASS: Record<Schemas['RequestLink']['outcome'], string> = {
  queued: 'idle',
  examining: 'running',
  error: 'failed',
  in_pool: 'ok',
  not_in_pool: 'warn',
  in_corpus: 'idle',
};
export const ERROR_CATEGORY_LABELS: Record<string, string> = {
  not_found: 'introuvable',
  host_refused: 'hôte refusé',
  http_error: 'erreur HTTP',
  network: 'erreur réseau',
};

// Résumé d'un compte rendu : combien de liens par sort.
export function outcomeSummary(items: Pick<Schemas['RequestLink'], 'outcome'>[]) {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.outcome, (counts.get(i.outcome) ?? 0) + 1);
  return [...counts].map(([o, n]) => `${n} ${OUTCOME_LABELS[o as Schemas['RequestLink']['outcome']]}`).join(' · ');
}

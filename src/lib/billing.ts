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
export function payersFor(billing: Billing, pool: string): Payer[] {
  const owners = billing.communities.filter((c) => pool && c.pools.includes(pool));
  return [
    {
      value: '',
      label: 'Portefeuille personnel',
      balance: billing.personal.balance,
      limitLeft: null,
      disabled: owners.length ? `les recherches de ce pool se paient sur le pot de ${owners.map((c) => c.label).join(' ou ')}` : null,
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

export function quote(billing: Billing, { provider, pages, payer }: { provider: string; pages: number; payer: Payer | undefined }): Quote | null {
  const price = billing.prices.find((p) => p.provider === provider);
  if (!price || !payer) return null;
  const total = price.unit_price * pages;
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

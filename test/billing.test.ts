import { describe, expect, it } from 'vitest';
import type { Schemas } from '../src/lib/api/client';
import {
  ALL_REQUESTS,
  ENTRY_KIND_LABELS,
  entryDetail,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  STATUS_CLASS,
  defaultPayer,
  fmtDelta,
  fmtEuros,
  fmtGiri,
  historyQuery,
  knownPool,
  parseLimit,
  payersFor,
  quote,
  spentOn,
} from '../src/lib/billing';

const billing: Schemas['Billing'] = {
  giri_per_eur: 1000,
  funding_url: null,
  max_queued: 5,
  prices: [
    { provider: 'openrouter', unit_price: 11, max_pages: 1 },
    { provider: 'brave', unit_price: 10, max_pages: 3 },
  ],
  personal: { balance: 25 },
  communities: [
    { slug: 'atelier', label: 'Atelier', role: 'member', balance: 500, monthly_limit: 40, spent_30d: 20, contributed: 0, pools: ['lora'] },
    { slug: 'club', label: 'Club', role: 'owner', balance: 5, monthly_limit: null, spent_30d: 0, contributed: 2000, pools: [] },
  ],
  invitations: [],
};

describe('recherches payantes', () => {
  it('affiche les giri et leur valeur en euros', () => {
    expect(fmtGiri(1234).replace(/\s/g, ' ')).toBe('1 234 giri');
    expect(fmtEuros(11, 1000).replace(/\s/g, ' ')).toBe('0,011 €');
    expect(fmtEuros(12500, 1000).replace(/\s/g, ' ')).toBe('12,50 €');
  });

  it('payeurs : pot de la communauté pour ses pools, jamais en personnel ; personnel ailleurs', () => {
    const payers = payersFor(billing, 'lora');
    expect(payers.map((p) => [p.value, p.disabled, p.limitLeft])).toEqual([
      ['', 'les recherches de ce pool se paient sur le pot de Atelier', null],
      ['atelier', null, 20],
      ['club', 'ne paie que ses pools (aucun)', null],
    ]);
    expect(defaultPayer(payers)).toBe('atelier');
    const elsewhere = payersFor(billing, 'autre');
    expect(elsewhere[0].disabled).toBeNull();
    expect(elsewhere[1].disabled).toBe('ne paie que ses pools (lora)');
    expect(defaultPayer(elsewhere)).toBe('');
    expect(payersFor(billing, '')[1].disabled).toBe('choisir un de ses pools');
    expect(defaultPayer([{ ...elsewhere[0], disabled: 'x' }])).toBe('');
  });

  it('devis : prix, solde après achat, et la raison d’un refus', () => {
    const [, atelier, club] = payersFor(billing, 'lora');
    const [personal] = payersFor(billing, 'autre');
    expect(quote(billing, { provider: 'brave', pages: 1, payer: payersFor(billing, 'lora')[0] })?.problem)
      .toBe('Pas en personnel : les recherches de ce pool se paient sur le pot de Atelier.');
    expect(quote(billing, { provider: 'brave', pages: 2, payer: personal })).toEqual({
      unitPrice: 10, maxPages: 3, price: 20, balance: 25, after: 5, problem: null,
    });
    expect(quote(billing, { provider: 'brave', pages: 3, payer: personal })?.problem).toMatch(/Solde insuffisant/);
    expect(quote(billing, { provider: 'openrouter', pages: 2, payer: personal })?.problem).toBe('De 1 à 1 page pour openrouter.');
    expect(quote(billing, { provider: 'brave', pages: 0, payer: personal })?.problem).toBe('De 1 à 3 pages pour brave.');
    expect(quote(billing, { provider: 'brave', pages: 3, payer: atelier })?.problem).toMatch(/Plafond du mois : il vous reste 20 giri/);
    expect(quote(billing, { provider: 'brave', pages: 1, payer: atelier })?.problem).toBeNull();
    expect(quote(billing, { provider: 'brave', pages: 1, payer: club })?.problem).toBe('Cette communauté ne paie que ses pools (aucun).');
    expect(quote(billing, { provider: 'file', pages: 1, payer: personal })).toBeNull();
    expect(quote(billing, { provider: 'brave', pages: 1, payer: undefined })).toBeNull();
  });

  it('plafond saisi : vide sans plafond, entier ≥ 0, sinon invalide', () => {
    expect(parseLimit('')).toBeNull();
    expect(parseLimit(null)).toBeNull();
    expect(parseLimit(' 0 ')).toBe(0);
    expect(parseLimit(250)).toBe(250);
    expect(parseLimit('-1')).toBeUndefined();
    expect(parseLimit('1,5')).toBeUndefined();
  });

  it('statuts et giri dépensés', () => {
    expect(REQUEST_STATUS_LABELS.queued).toBe('en attente');
    expect(spentOn({ price: 30, refunded: 10 })).toBe(20);
  });

  it('historique : mes recherches, celles d’une communauté, ou toutes pour l’admin ; filtre de statut', () => {
    expect(historyQuery('', { limit: 20, offset: 40 })).toEqual({
      admin: false,
      query: { status: undefined, community: undefined, limit: 20, offset: 40 },
    });
    expect(historyQuery('atelier', { status: 'queued', limit: 20, offset: 0 }).query).toMatchObject({ community: 'atelier', status: 'queued' });
    expect(historyQuery(ALL_REQUESTS, { status: 'done', limit: 5, offset: 0 })).toEqual({ admin: true, query: { status: 'done', limit: 5, offset: 0 } });
    expect(REQUEST_STATUSES).toEqual(['queued', 'running', 'done', 'failed', 'cancelled']);
    expect(REQUEST_STATUSES.map((s) => STATUS_CLASS[s])).toEqual(['idle', 'running', 'ok', 'failed', 'idle']);
  });

  it('oublie un pool de lien absent de la liste', () => {
    expect(knownPool([{ slug: 'lora' }], 'lora')).toBe('lora');
    expect(knownPool([{ slug: 'lora' }], 'inconnu')).toBe('');
  });

  it('grand livre : genre et montant signé', () => {
    expect(ENTRY_KIND_LABELS.purchase).toBe('apport');
    expect(fmtDelta(1000).replace(/\s/g, ' ')).toBe('+1 000');
    expect(fmtDelta(-20)).toBe('−20');
    expect(fmtDelta(0)).toBe('0');
    expect(entryDetail({ search_request_id: 12, note: 'pages non lancées' })).toBe('recherche #12 · pages non lancées');
    expect(entryDetail({ amount_cents: 1250, reference: 'kofi-1' }).replace(/\s/g, ' ')).toBe('12,50 € reçus · kofi-1');
    expect(entryDetail({})).toBe('—');
  });
});

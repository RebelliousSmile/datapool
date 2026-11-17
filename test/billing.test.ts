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
  OUTCOME_CLASS,
  OUTCOME_LABELS,
  ERROR_CATEGORY_LABELS,
  outcomeSummary,
  parseLinkLines,
  quoteList,
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
  lists: { price_per_link: 1, max_links: 3 },
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

  it('liste de liens : une URL par ligne, titre facultatif, lignes refusées et doublons comptés', () => {
    const parsed = parseLinkLines(
      ['# sources Japon', '', 'https://a.jp/x\tTemple de Kyoto', '  https://b.jp  ', 'ftp://c.jp', 'pas une url', 'https://a.jp/x', 'https://d.jp/y titre en deux mots'].join('\n'),
    );
    expect(parsed.links).toEqual([
      { url: 'https://a.jp/x', title: 'Temple de Kyoto' },
      { url: 'https://b.jp', title: null },
      { url: 'https://d.jp/y', title: 'titre en deux mots' },
    ]);
    expect(parsed.rejected).toEqual([{ line: 5, text: 'ftp://c.jp' }, { line: 6, text: 'pas une url' }]);
    expect(parsed.duplicates).toBe(1);
    expect(parseLinkLines(`https://a.jp/${'x'.repeat(2000)}`).rejected).toHaveLength(1);
  });

  it('devis d’une liste : pot de la communauté, prix par lien, limites', () => {
    const [personal, atelier, club] = payersFor(billing, 'lora');
    expect(quoteList(billing, { count: 2, payer: atelier })).toEqual({ unitPrice: 1, maxPages: 1, price: 2, balance: 500, after: 498, problem: null });
    expect(quoteList(billing, { count: 2, payer: personal })?.problem).toMatch(/pot d'une communauté/);
    expect(quoteList(billing, { count: 2, payer: club })?.problem).toBe('Cette communauté ne paie que ses pools (aucun).');
    expect(quoteList(billing, { count: 0, payer: atelier })?.problem).toMatch(/au moins un lien/);
    expect(quoteList(billing, { count: 4, payer: atelier })?.problem).toBe('3 liens au plus par liste (4 ici).');
    const poor = { ...atelier, balance: 1 };
    expect(quoteList(billing, { count: 2, payer: poor })?.problem).toMatch(/Solde insuffisant/);
    const capped = { ...atelier, limitLeft: 1 };
    expect(quoteList(billing, { count: 2, payer: capped })?.problem).toMatch(/Plafond du mois/);
    expect(quoteList(billing, { count: 2, payer: undefined })).toBeNull();
  });

  it('liste de liens : Markdown, CSV et TSV, favoris HTML', () => {
    expect(parseLinkLines(['- [Photo AC](https://www.photo-ac.com/)', '1. https://u.jp Kyoto', '[A](https://a.jp) et [B](https://b.jp)'].join('\n')).links.map((l) => [l.url, l.title]))
      .toEqual([['https://www.photo-ac.com/', 'Photo AC'], ['https://u.jp', 'Kyoto'], ['https://a.jp', 'A'], ['https://b.jp', 'B']]);
    const csv = parseLinkLines(['url,titre', 'https://a.jp,"Temple, Kyoto"', '"Nagasaki";https://b.jp', 'C\thttps://c.jp'].join('\n'));
    expect(csv.links.map((l) => [l.url, l.title])).toEqual([['https://a.jp', 'Temple, Kyoto'], ['https://b.jp', 'Nagasaki'], ['https://c.jp', 'C']]);
    expect(csv.rejected).toEqual([]);
    const html = '<DL><DT><A HREF="https://a.jp/?q=1&amp;r=2">Kyoto <b>temples</b></A><DT><A HREF="javascript:alert(1)">x</A><a href=\'https://a.jp/?q=1&amp;r=2\'>bis</a></DL>';
    expect(parseLinkLines(html)).toEqual({ links: [{ url: 'https://a.jp/?q=1&r=2', title: 'Kyoto temples' }], rejected: [], duplicates: 1 });
    expect(parseLinkLines('- [x](https://ok.jp) et [y](https://ok.jp)').duplicates).toBe(1);
  });

  it('devis d’une liste d’admin : gratuit, tout pool, limites de taille seulement', () => {
    const [personal] = payersFor(billing, 'autre');
    expect(quoteList(billing, { count: 2, payer: personal, admin: true })).toEqual({ unitPrice: 0, maxPages: 1, price: 0, balance: 25, after: 25, problem: null });
    expect(quoteList(billing, { count: 0, payer: personal, admin: true })?.problem).toMatch(/au moins un lien/);
    expect(quoteList(billing, { count: 4, payer: personal, admin: true })?.problem).toMatch(/3 liens au plus/);
  });

  it('sort des liens : libellés, classes, résumé', () => {
    expect(OUTCOME_LABELS.in_pool).toBe('dans le pool');
    expect(OUTCOME_CLASS.error).toBe('failed');
    expect(ERROR_CATEGORY_LABELS.host_refused).toBe('hôte refusé');
    expect(outcomeSummary([{ outcome: 'in_pool' }, { outcome: 'in_pool' }, { outcome: 'error' }])).toBe('2 dans le pool · 1 erreur');
    expect(outcomeSummary([])).toBe('');
  });

  it('admin : « gratuit » possible pour tout pool, recherche à prix nul', () => {
    const [free] = payersFor(billing, 'lora', { admin: true });
    expect(free).toMatchObject({ value: '', label: 'Gratuit (admin)', disabled: null });
    expect(quote(billing, { provider: 'brave', pages: 3, payer: free, admin: true })).toMatchObject({ price: 0, after: 25, problem: null });
  });
});

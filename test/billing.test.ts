import { describe, expect, it } from 'vitest';
import type { Schemas } from '../src/lib/api/client';
import { REQUEST_STATUS_LABELS, fmtEuros, fmtGiri, payersFor, quote, spentOn } from '../src/lib/billing';

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
    { slug: 'atelier', label: 'Atelier', role: 'member', balance: 500, monthly_limit: 40, spent_30d: 20, pools: ['lora'] },
    { slug: 'club', label: 'Club', role: 'owner', balance: 5, monthly_limit: null, spent_30d: 0, pools: [] },
  ],
};

describe('recherches payantes', () => {
  it('affiche les giri et leur valeur en euros', () => {
    expect(fmtGiri(1234).replace(/\s/g, ' ')).toBe('1 234 giri');
    expect(fmtEuros(11, 1000).replace(/\s/g, ' ')).toBe('0,011 €');
    expect(fmtEuros(12500, 1000).replace(/\s/g, ' ')).toBe('12,50 €');
  });

  it('payeurs : personnel toujours, communauté pour ses seuls pools, plafond restant', () => {
    const payers = payersFor(billing, 'lora');
    expect(payers.map((p) => [p.value, p.disabled, p.limitLeft])).toEqual([
      ['', null, null],
      ['atelier', null, 20],
      ['club', 'ne paie que ses pools (aucun)', null],
    ]);
    expect(payersFor(billing, '')[1].disabled).toBe('choisir un de ses pools');
    expect(payersFor(billing, 'autre')[1].disabled).toBe('ne paie que ses pools (lora)');
  });

  it('devis : prix, solde après achat, et la raison d’un refus', () => {
    const [personal, atelier, club] = payersFor(billing, 'lora');
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

  it('statuts et giri dépensés', () => {
    expect(REQUEST_STATUS_LABELS.queued).toBe('en attente');
    expect(spentOn({ price: 30, refunded: 10 })).toBe(20);
  });
});

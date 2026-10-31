import { flushSync, mount, unmount, createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type Schemas } from '../src/lib/api/client';
import Async from '../src/lib/components/Async.svelte';
import { Generation, RequestsScreen, errorMessage, type ScreenApi } from '../src/lib/purchase.svelte.ts';

const billing = (balance: number): Schemas['Billing'] => ({
  giri_per_eur: 1000,
  funding_url: null,
  max_queued: 5,
  prices: [{ provider: 'brave', unit_price: 10, max_pages: 3 }],
  personal: { balance },
  communities: [],
  invitations: [],
});
const receipt = (id: number, replayed = false) => ({
  request: { id, price: 10 } as Schemas['SearchRequest'],
  balance: 90,
  replayed,
});
const input = { query: 'q', provider: 'brave', pages: 1 };

// Promesse dont on décide l'issue depuis le test.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

function fakeApi(over: Partial<Record<keyof ScreenApi, unknown>> = {}) {
  return {
    billing: vi.fn(async () => billing(100)),
    pools: vi.fn(async () => ({ items: [{ slug: 'lora', label: 'LoRA' }] })),
    createRequest: vi.fn(async () => receipt(1)),
    cancelRequest: vi.fn(async () => ({ id: 1, refunded: 10 })),
    acceptInvitation: vi.fn(async () => ({ community: 'atelier', accepted: true })),
    declineInvitation: vi.fn(async () => ({ community: 'atelier' })),
    leaveCommunity: vi.fn(async () => ({ community: 'atelier', left: true })),
    ...over,
  } as unknown as ScreenApi & Record<keyof ScreenApi, ReturnType<typeof vi.fn>>;
}

let keys = 0;
const screen = () => new RequestsScreen(() => `k${++keys}`);

describe('Generation', () => {
  it('ne reconnaît que la dernière demande', () => {
    const gen = new Generation();
    const a = gen.next();
    const b = gen.next();
    expect(gen.isCurrent(a)).toBe(false);
    expect(gen.isCurrent(b)).toBe(true);
    expect(errorMessage('brut')).toBe('brut');
  });
});

describe('RequestsScreen : chargement', () => {
  it('lit les pools une seule fois, les soldes à chaque appel', async () => {
    const api = fakeApi();
    const s = screen();
    await s.load(api);
    await s.load(api);
    expect(api.pools).toHaveBeenCalledOnce();
    expect(api.billing).toHaveBeenCalledTimes(2);
    expect(s.poolsLoaded).toBe(true);
    expect(s.pools.map((p) => p.slug)).toEqual(['lora']);
    expect(s.billing?.personal.balance).toBe(100);
  });

  it('relit les pools après un échec', async () => {
    const api = fakeApi({ pools: vi.fn().mockRejectedValueOnce(new Error('pools en panne')).mockResolvedValue({ items: [] }) });
    const s = screen();
    await s.load(api);
    expect(s.fatalError).toBe('pools en panne');
    await s.load(api);
    expect(api.pools).toHaveBeenCalledTimes(2);
    expect(s.fatalError).toBe('');
    expect(s.billing).not.toBeNull();
  });

  it("erreur plein écran au premier chargement seulement, puis en alerte, remise à zéro à chaque chargement", async () => {
    const api = fakeApi({ billing: vi.fn().mockRejectedValueOnce(new Error('panne')).mockResolvedValueOnce(billing(100)) });
    const s = screen();
    await s.load(api);
    expect(s.fatalError).toBe('panne');
    await s.load(api);
    expect(s.loadError).toBe('');
    expect(s.fatalError).toBe('');
    api.billing.mockRejectedValueOnce(new Error('re-panne'));
    await s.load(api);
    expect(s.loadError).toBe('re-panne');
    expect(s.fatalError).toBe('');
    expect(s.billing?.personal.balance).toBe(100);
  });

  it('ignore une réponse de soldes arrivée après une plus récente', async () => {
    const slow = deferred<Schemas['Billing']>();
    const api = fakeApi({ billing: vi.fn().mockReturnValueOnce(slow.promise).mockResolvedValueOnce(billing(50)) });
    const s = screen();
    const first = s.load(api);
    await s.load(api);
    slow.resolve(billing(999));
    await first;
    expect(s.billing?.personal.balance).toBe(50);
    const late = deferred<Schemas['Billing']>();
    api.billing.mockReturnValueOnce(late.promise).mockResolvedValueOnce(billing(60));
    const stale = s.load(api);
    await s.load(api);
    late.reject(new Error('trop tard'));
    await stale;
    expect(s.loadError).toBe('');
  });
});

describe('RequestsScreen : achat', () => {
  it('un seul achat à la fois, même sur trois clics', async () => {
    const pending = deferred<ReturnType<typeof receipt>>();
    const api = fakeApi({ createRequest: vi.fn(() => pending.promise) });
    const s = screen();
    const first = s.buy(api, input);
    expect(s.sending).toBe(true);
    expect(await s.buy(api, input)).toBe(false);
    expect(await s.buy(api, input)).toBe(false);
    pending.resolve(receipt(7));
    expect(await first).toBe(true);
    expect(api.createRequest).toHaveBeenCalledOnce();
    expect(s.sending).toBe(false);
    expect(s.notice).toMatch(/^Recherche #7 achetée : 10 giri débités, solde 90 giri/);
    expect(s.version).toBe(1);
    expect(api.billing).toHaveBeenCalledOnce();
  });

  it("garde la clé après une panne réseau, en change après un succès ou une erreur métier", async () => {
    const api = fakeApi();
    const s = screen();
    api.createRequest.mockRejectedValueOnce(new ApiError(0, 'network', 'API injoignable : x'));
    expect(await s.buy(api, input)).toBe(false);
    const key = api.createRequest.mock.calls[0][1].idempotencyKey;
    expect(s.pendingKey).toBe(key);
    expect(s.sendError).toMatch(/peut-être passé : relancez-le/);

    api.createRequest.mockRejectedValueOnce(new ApiError(0, 'timeout', "L'API ne répond pas"));
    await s.buy(api, input);
    expect(api.createRequest.mock.calls[1][1].idempotencyKey).toBe(key);

    // relance après la panne : l'API rend la recherche déjà achetée
    api.createRequest.mockResolvedValueOnce(receipt(3, true));
    expect(await s.buy(api, input)).toBe(true);
    expect(api.createRequest.mock.calls[2][1].idempotencyKey).toBe(key);
    expect(s.notice).toMatch(/^Recherche #3 déjà achetée \(envoi repris, rien de plus débité\)/);
    expect(s.pendingKey).toBeNull();

    await s.buy(api, input);
    const next = api.createRequest.mock.calls[3][1].idempotencyKey;
    expect(next).not.toBe(key);

    api.createRequest.mockRejectedValueOnce(new ApiError(400, 'bad_request', 'Requête vide'));
    await s.buy(api, input);
    expect(s.pendingKey).toBeNull();
    expect(s.sendError).toBe('Requête vide');
    await s.buy(api, input);
    expect(new Set(api.createRequest.mock.calls.map((c) => c[1].idempotencyKey)).size).toBe(4);
  });

  it("change de clé si l'achat relancé n'est plus le même", async () => {
    const api = fakeApi();
    const s = screen();
    api.createRequest.mockRejectedValueOnce(new ApiError(0, 'network', 'API injoignable'));
    await s.buy(api, input);
    await s.buy(api, { ...input, query: 'autre' });
    const [a, b] = api.createRequest.mock.calls.map((c) => c[1].idempotencyKey);
    expect(a).not.toBe(b);
  });

  it('relit les soldes après un 402 ou un 429, pas après une autre erreur', async () => {
    const api = fakeApi();
    const s = screen();
    for (const status of [402, 429]) {
      api.createRequest.mockRejectedValueOnce(new ApiError(status, 'x', `refus ${status}`));
      await s.buy(api, input);
    }
    expect(api.billing).toHaveBeenCalledTimes(2);
    expect(s.version).toBe(0);
    api.createRequest.mockRejectedValueOnce(new ApiError(400, 'bad_request', 'non'));
    await s.buy(api, input);
    expect(api.billing).toHaveBeenCalledTimes(2);
  });

  it('génère par défaut une clé UUID', async () => {
    const api = fakeApi();
    await new RequestsScreen().buy(api, input);
    expect(api.createRequest.mock.calls[0][1].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('RequestsScreen : annulation', () => {
  it('un seul DELETE par recherche, bouton rendu à la fin', async () => {
    const pending = deferred<{ id: number; refunded: number }>();
    const api = fakeApi({ cancelRequest: vi.fn(() => pending.promise) });
    const s = screen();
    const first = s.cancel(api, { id: 4 });
    expect(s.isCancelling(4)).toBe(true);
    expect(s.isCancelling(5)).toBe(false);
    await s.cancel(api, { id: 4 });
    pending.resolve({ id: 4, refunded: 10 });
    await first;
    expect(api.cancelRequest).toHaveBeenCalledOnce();
    expect(s.isCancelling(4)).toBe(false);
    expect(s.notice).toBe('Recherche #4 annulée : 10 giri remboursés.');
    expect(s.version).toBe(1);
  });

  it("affiche l'erreur et relit l'historique", async () => {
    const api = fakeApi({ cancelRequest: vi.fn(async () => { throw new ApiError(409, 'conflict', 'Recherche déjà lancée'); }) });
    const s = screen();
    await s.cancel(api, { id: 4 });
    expect(s.sendError).toBe('Recherche déjà lancée');
    expect(s.version).toBe(1);
    expect(s.isCancelling(4)).toBe(false);
  });
});

describe('RequestsScreen : invitations et départ', () => {
  it('accepte, décline, quitte, puis relit les soldes', async () => {
    const api = fakeApi();
    const s = screen();
    await s.membership(api, 'accept', 'atelier');
    await s.membership(api, 'decline', 'club');
    await s.membership(api, 'leave', 'atelier');
    expect(api.acceptInvitation).toHaveBeenCalledWith('atelier');
    expect(api.declineInvitation).toHaveBeenCalledWith('club');
    expect(api.leaveCommunity).toHaveBeenCalledWith('atelier');
    expect(api.billing).toHaveBeenCalledTimes(3);
    expect(s.version).toBe(3);
  });

  it("une action à la fois par communauté ; erreur du dernier propriétaire affichée", async () => {
    const pending = deferred<unknown>();
    const api = fakeApi({ leaveCommunity: vi.fn(() => pending.promise) });
    const s = screen();
    const first = s.membership(api, 'leave', 'atelier');
    expect(s.isMembershipBusy('atelier')).toBe(true);
    await s.membership(api, 'leave', 'atelier');
    pending.reject(new ApiError(400, 'bad_request', 'Dernier propriétaire actif : la communauté doit garder un propriétaire'));
    await first;
    expect(api.leaveCommunity).toHaveBeenCalledOnce();
    expect(s.membershipError).toMatch(/^Dernier propriétaire actif/);
    expect(s.isMembershipBusy('atelier')).toBe(false);
  });
});

describe('Async', () => {
  let mounted: ReturnType<typeof mount>[] = [];
  afterEach(() => {
    mounted.forEach((m) => unmount(m));
    mounted = [];
    document.body.innerHTML = '';
  });
  // le snippet suit la valeur (un snippet brut ne se rend qu'une fois sans setup)
  const children = createRawSnippet((v: () => string) => ({
    render: () => '<span class="v"></span>',
    setup: (node) => {
      $effect(() => {
        node.textContent = v();
      });
    },
  }));
  function render(value: Promise<string> | undefined) {
    const props = $state({ value, children });
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(Async<string>, { target, props }));
    flushSync();
    return { target, props };
  }
  const settle = async () => {
    await new Promise((r) => setTimeout(r));
    flushSync();
  };

  it('chargement, puis contenu ; le contenu précédent reste pendant un rechargement', async () => {
    const a = deferred<string>();
    const { target, props } = render(a.promise);
    expect(target.textContent).toContain('chargement');
    a.resolve('un');
    await settle();
    expect(target.querySelector('.v')?.textContent).toBe('un');

    const b = deferred<string>();
    props.value = b.promise;
    flushSync();
    expect(target.querySelector('.v')?.textContent).toBe('un');
    expect(target.querySelector('.async')?.getAttribute('aria-busy')).toBe('true');
    expect(target.querySelector('.async.stale')).not.toBeNull();
    b.resolve('deux');
    await settle();
    expect(target.querySelector('.v')?.textContent).toBe('deux');
    expect(target.querySelector('.async')?.getAttribute('aria-busy')).toBe('false');
  });

  it('ignore une réponse en retard', async () => {
    const slow = deferred<string>();
    const { target, props } = render(slow.promise);
    props.value = Promise.resolve('récente');
    flushSync();
    await settle();
    slow.resolve('ancienne');
    await settle();
    expect(target.querySelector('.v')?.textContent).toBe('récente');
    const late = deferred<string>();
    props.value = late.promise;
    flushSync();
    props.value = Promise.resolve('dernière');
    flushSync();
    await settle();
    late.reject(new Error('trop tard'));
    await settle();
    expect(target.querySelector('[role=alert]')).toBeNull();
    expect(target.querySelector('.v')?.textContent).toBe('dernière');
  });

  it("affiche l'erreur, en gardant le contenu déjà là", async () => {
    const { target, props } = render(Promise.resolve('un'));
    await settle();
    props.value = Promise.reject(new Error('panne'));
    flushSync();
    await settle();
    expect(target.querySelector('[role=alert]')?.textContent).toBe('panne');
    expect(target.querySelector('.v')?.textContent).toBe('un');
    props.value = Promise.resolve('trois');
    flushSync();
    await settle();
    expect(target.querySelector('[role=alert]')).toBeNull();
  });

  it('sans valeur (pas de client), rien', () => {
    const { target } = render(undefined);
    expect(target.textContent?.trim()).toBe('');
  });
});

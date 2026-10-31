import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountMenu from '../src/lib/components/AccountMenu.svelte';
import PoolExplorer from '../src/lib/components/PoolExplorer.svelte';
import { session } from '../src/lib/session.svelte.ts';
import { calls, navigateCallbacks } from './mocks/app-navigation';
import { page } from './mocks/app-state';

const items = [
  { rank: 1, url: 'https://www.flickr.com/photos/u/1', title: 'Moss bark', domain: 'flickr.com', usage_commercial: 'sous-conditions', id: 11 },
  { rank: 2, url: 'https://unsplash.com/photos/x', title: 'Forest path', domain: 'unsplash.com', usage_commercial: 'libre', id: 12 },
  { rank: 3, url: 'https://github.com/a/b', title: 'LoRA scripts', domain: 'github.com', usage_commercial: 'libre', id: 13 },
  { rank: 4, url: 'https://www.youtube.com/watch?v=1', title: 'LoRA video', domain: 'youtube.com', usage_commercial: null, id: 14 },
  { rank: 5, url: 'https://unsplash.com/photos/y', title: null, domain: 'unsplash.com', usage_commercial: 'libre', id: 15 },
];
const pool = { slug: 'p', label: 'Pool P', items: 5, refreshed_at: '2026-10-30T12:00:00Z', top_domains: [], usage_commercial: [] };

let mounted: ReturnType<typeof mount>[] = [];
const clean = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
// textContent n'insère pas d'espace entre éléments voisins : comparaison sans espaces
const squash = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, '');
const key = (el: HTMLElement, k: string) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  flushSync();
};
const select = (el: HTMLSelectElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  flushSync();
};

async function connect(scope = 'admin', listing = items) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      new Response(JSON.stringify(url.endsWith('/me') ? { name: 'Camille Arnaud', scope } : { items: listing, total: listing.length })),
    ),
  );
  await session.connect({ baseUrl: 'http://api.test/api/v1', token: 'wp_x' });
}

async function explorer(query = '') {
  page.url = new URL(`http://localhost/pools/p${query}`);
  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(PoolExplorer, { target, props: { pool } }));
  await vi.waitFor(() => {
    flushSync();
    expect(target.querySelector('.items, .xp-empty, .xp-group')).not.toBeNull();
  });
  return target;
}

const count = (el: Element) => clean(el.querySelector('.xp-count'));
const ranks = (el: Element) => [...el.querySelectorAll('.item-rank')].map((r) => r.textContent);
const click = (el: Element | null | undefined) => {
  (el as HTMLElement).click();
  flushSync();
};
const byText = (el: Element, sel: string, text: string) => [...el.querySelectorAll(sel)].find((e) => clean(e)?.includes(text));
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
};

beforeEach(() => {
  window.innerWidth = 1366;
  localStorage.clear();
  calls.length = 0;
  navigateCallbacks.length = 0;
});
afterEach(() => {
  mounted.forEach((m) => unmount(m));
  mounted = [];
  document.body.innerHTML = '';
  session.disconnect();
  vi.unstubAllGlobals();
});

describe('PoolExplorer', () => {
  it('charge tout le pool, compte les segments et les facettes', async () => {
    await connect();
    const el = await explorer();
    expect(clean(el.querySelector('h1'))).toBe('Pool P');
    expect(count(el)).toBe('5 liens');
    expect(ranks(el)).toEqual(['#1', '#2', '#3', '#4', '#5']);
    expect([...el.querySelectorAll('.tab')].map(squash)).toEqual(['Tout5', 'Images3', 'Vidéos1', 'Code1']);
    expect(squash(byText(el, '.facet', 'Usage commercial'))).toContain('Libre3');
    expect(clean(el.querySelector('.copy-split button'))).toBe('Copier les 5 liens');
  });

  it('filtre par facette, met à jour effectifs, copie et URL', async () => {
    await connect();
    const el = await explorer();
    const libre = byText(el, '.facet label', 'Libre')!.querySelector('input')!;
    libre.click();
    flushSync();
    expect(count(el)).toBe('3 liens sur 5');
    expect(ranks(el)).toEqual(['#2', '#3', '#5']);
    expect(clean(el.querySelector('.copy-split button'))).toBe('Copier les 3 liens filtrés');
    expect(squash(el.querySelector('.qfield'))).toContain('usageLibre');
    expect(clean(el.querySelector('.badge-n'))).toBe('1');
    expect(calls.at(-1)).toEqual({ url: '/pools/p?usage=libre', opts: { replace: true, reset: false } });
    click(el.querySelector('.tok button'));
    expect(count(el)).toBe('5 liens');
    expect(calls.at(-1)?.url).toBe('/pools/p');
  });

  it('entre dans un segment, change de dimension et vide la sélection', async () => {
    await connect();
    const el = await explorer();
    click(byText(el, '.tab', 'Images'));
    expect(ranks(el)).toEqual(['#1', '#2', '#5']);
    select(el.querySelector<HTMLSelectElement>('.segby select')!, 'usage');
    expect([...el.querySelectorAll('.tab')].map(squash)).toEqual(['Tout3', 'Libre2', 'Sousconditions1']);
    click(byText(el, '.tab', 'Sous conditions'));
    expect(ranks(el)).toEqual(['#1']);
    click(byText(el, '.facet label', 'Banques')?.querySelector('input'));
    expect(ranks(el)).toEqual(['#1']);
    // une valeur sans effectif disparaît des facettes, sauf si elle est cochée
    expect(byText(el, '.facet label', 'Communautés')).toBeUndefined();
    type(el.querySelector<HTMLInputElement>('.qfield input')!, 'zzz');
    expect(el.querySelector('.xp-empty')).not.toBeNull();
    click(el.querySelector('.xp-empty .qclear'));
    expect(count(el)).toBe('5 liens');
  });

  it('transforme la saisie en jetons, cherche et suggère', async () => {
    await connect();
    const el = await explorer();
    const input = el.querySelector<HTMLInputElement>('.qfield input')!;
    input.dispatchEvent(new FocusEvent('focus'));
    flushSync();
    expect((el.querySelector('.sugg') as HTMLElement).hidden).toBe(false);
    type(input, 'type:vid ');
    expect(input.value).toBe('');
    expect(ranks(el)).toEqual(['#4']);
    key(input, 'Backspace');
    expect(count(el)).toBe('5 liens');

    type(input, 'lora');
    expect(ranks(el)).toEqual(['#3', '#4']);
    type(input, 'vid');
    expect([...el.querySelectorAll('.sugg-item')].map(squash)).toEqual(['typeVidéos1', 'sourcePlateformesvidéo1']);
    expect(el.querySelector('.sugg-item')?.getAttribute('aria-selected')).toBe('true');
    key(input, 'ArrowDown');
    expect(el.querySelectorAll('.sugg-item')[1].getAttribute('aria-selected')).toBe('true');
    key(input, 'ArrowUp');
    key(input, 'ArrowDown');
    key(input, 'Enter');
    expect(squash(el.querySelector('.qfield'))).toContain('sourcePlateformesvidéo');
    expect(ranks(el)).toEqual(['#4']);

    type(input, 'zzz');
    expect(clean(el.querySelector('.sugg'))).toContain('Aucun filtre ne correspond');
    key(input, 'Escape');
    expect((el.querySelector('.sugg') as HTMLElement).hidden).toBe(true);
    key(input, 'Enter');
    click(el.querySelector('.qfield .qclear'));
    expect(input.value).toBe('');
    expect(count(el)).toBe('5 liens');

    input.blur();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(document.activeElement).toBe(input);
  });

  it('groupe, copie un groupe, change de densité et prévisualise', async () => {
    await connect();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const el = await explorer();
    select(el.querySelector<HTMLSelectElement>('.ctl-group select')!, 'usage');
    expect([...el.querySelectorAll('.xp-gh')].map((h) => squash(h)?.replace('Copiercegroupe', ''))).toEqual([
      'Libre3liens',
      'Sousconditions1liens',
      'Àqualifier1liens',
    ]);
    el.querySelector<HTMLButtonElement>('.xp-gh button')!.click();
    await vi.waitFor(() => {
      flushSync();
      expect(clean(el.querySelector('.xp-gh [role=status]'))).toBe('3 liens copiés');
    });
    expect(writeText).toHaveBeenCalledWith('https://unsplash.com/photos/x\nhttps://github.com/a/b\nhttps://unsplash.com/photos/y\n');

    click(el.querySelector('[aria-label=Compact]'));
    expect(el.querySelector('.items')?.classList.contains('d-compact')).toBe(true);
    expect(localStorage.getItem('datapool.density')).toBe('compact');

    click(el.querySelector('.item .peek'));
    expect(clean(el.querySelector('.xp-preview h2'))).toBe('Forest path');
    expect(el.querySelector('.xp')?.classList.contains('has-preview')).toBe(true);
    el.querySelector<HTMLButtonElement>('.xp-preview .actions button')!.click();
    await vi.waitFor(() => expect(clean(el.querySelector('.xp-preview [role=status]'))).toBe('URL copiée'));
    expect(el.querySelector('.xp-preview a[href="/urls/12"]')).not.toBeNull();
    click(el.querySelector('.xp-preview .pv-head button'));
    expect(el.querySelector('.xp-preview')).toBeNull();
  });

  it("signale un presse-papiers refusé dans un groupe et dans l'aperçu", async () => {
    await connect();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('Refusé'); }) } });
    const el = await explorer('?group=media');
    el.querySelector<HTMLButtonElement>('.xp-gh button')!.click();
    await vi.waitFor(() => {
      flushSync();
      expect(clean(el.querySelector('.xp-gh [role=status]'))).toBe('Refusé');
    });
    click(el.querySelector('.item .peek'));
    click(el.querySelector('.item .peek'));
    expect(el.querySelector('.xp-preview')).toBeNull();
    click(el.querySelector('.item .peek'));
    el.querySelector<HTMLButtonElement>('.xp-preview .actions button')!.click();
    await vi.waitFor(() => expect(clean(el.querySelector('.xp-preview [role=status]'))).toBe('Refusé'));
    window.innerWidth = 800;
    window.dispatchEvent(new Event('resize'));
    flushSync();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushSync();
    expect(el.querySelector('.xp-preview')).toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
  });

  it('enregistre, rappelle et supprime une vue', async () => {
    await connect();
    const el = await explorer('?usage=libre');
    expect(count(el)).toBe('3 liens sur 5');
    click(el.querySelector('.view-btn.save'));
    expect(JSON.parse(localStorage.getItem('datapool.views.p')!)).toEqual([{ name: 'Libre', params: 'usage=libre' }]);
    click(byText(el, '.view-btn', 'Tout le pool'));
    expect(count(el)).toBe('5 liens');
    click(byText(el, '.view-btn', 'Libre'));
    expect(count(el)).toBe('3 liens sur 5');
    click(el.querySelector('[aria-label="Supprimer la vue Libre"]'));
    expect(el.querySelector('.view-row')).toBeNull();
  });

  it('relit l’URL au retour arrière et replie les filtres', async () => {
    await connect();
    const el = await explorer('?tab=video');
    expect(ranks(el)).toEqual(['#4']);
    page.url = new URL('http://localhost/pools/p?tab=code');
    navigateCallbacks.forEach((fn) => fn({ type: 'popstate' }));
    flushSync();
    expect(ranks(el)).toEqual(['#3']);
    navigateCallbacks.forEach((fn) => fn({ type: 'link' }));

    click(el.querySelector('.btn-filters'));
    expect(el.querySelector('.xp')?.classList.contains('no-side')).toBe(true);
    expect(localStorage.getItem('datapool.facets')).toBe('hidden');
    window.innerWidth = 800;
    window.dispatchEvent(new Event('resize'));
    flushSync();
    click(el.querySelector('.btn-filters'));
    expect(el.querySelector('.xp')?.classList.contains('side-open')).toBe(true);
    click(el.querySelector('.scrim'));
    expect(el.querySelector('.xp')?.classList.contains('side-open')).toBe(false);
    click(el.querySelector('.btn-filters'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushSync();
    expect(el.querySelector('.xp')?.classList.contains('side-open')).toBe(false);
    click(el.querySelector('.xp-side-foot button'));
    window.innerWidth = 1366;
  });

  it('pagine au-delà de 50 liens et déplie les domaines', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...items[i % 5], rank: i + 1, url: `https://d${i % 7}.example/${i}`, domain: `d${i % 7}.example` }));
    await connect('read', many);
    const el = await explorer();
    expect(el.querySelectorAll('.item')).toHaveLength(50);
    click(el.querySelector('[aria-label="Page 2"]'));
    expect(el.querySelectorAll('.item')).toHaveLength(10);
    const more = byText(el, '.facet .more', 'Voir les 7 domaines')!;
    click(more);
    expect(clean(more)).toBe('Moins');
    expect(el.querySelector('a[href^="/urls/"]')?.textContent).toBe('fiche');
  });

  it('signale un pool impossible à charger', async () => {
    await connect();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'x', message: 'Pool inconnu : p' } }), { status: 404 })));
    page.url = new URL('http://localhost/pools/p');
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(PoolExplorer, { target, props: { pool } }));
    await vi.waitFor(() => {
      flushSync();
      expect(clean(target.querySelector('[role=alert]'))).toBe('Pool inconnu : p');
    });
  });
});

describe('AccountMenu', () => {
  it('affiche les initiales, ouvre le menu et déconnecte', async () => {
    await connect('read');
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(mount(AccountMenu, { target }));
    flushSync();
    const avatar = target.querySelector<HTMLButtonElement>('.avatar')!;
    expect(clean(avatar)).toBe('CA');
    expect(avatar.getAttribute('aria-label')).toBe('Compte : Camille Arnaud');
    click(avatar);
    expect((target.querySelector('.menu') as HTMLElement).hidden).toBe(false);
    expect(squash(target.querySelector('.who'))).toBe('CamilleArnaudclientread');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushSync();
    expect((target.querySelector('.menu') as HTMLElement).hidden).toBe(true);
    click(avatar);
    document.body.click();
    flushSync();
    expect((target.querySelector('.menu') as HTMLElement).hidden).toBe(true);
    click(avatar);
    click(target.querySelector('.menu-item'));
    expect(session.me).toBeNull();
  });
});

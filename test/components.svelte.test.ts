import { flushSync, mount, unmount, type Component } from 'svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BarList from '../src/lib/components/BarList.svelte';
import ConnectForm from '../src/lib/components/ConnectForm.svelte';
import ExternalLink from '../src/lib/components/ExternalLink.svelte';
import Pager from '../src/lib/components/Pager.svelte';
import UsageBar from '../src/lib/components/UsageBar.svelte';
import UsageBadge from '../src/lib/components/UsageBadge.svelte';
import ResultItem from '../src/lib/components/ResultItem.svelte';
import MediaThumb from '../src/lib/components/MediaThumb.svelte';
import { enrich } from '../src/lib/explore';
import CopyLinks from '../src/lib/components/CopyLinks.svelte';
import Icon from '../src/lib/components/Icon.svelte';
import { theme } from '../src/lib/theme.svelte.ts';
import { fetchAllLinks, type CopyLink } from '../src/lib/copy';
import { session } from '../src/lib/session.svelte.ts';
import UrlPage from '../src/routes/urls/[id]/+page.svelte';
import CorpusPage from '../src/routes/corpus/+page.svelte';
import DashboardPage from '../src/routes/+page.svelte';
import { page as appPage } from './mocks/app-state';

let mounted: ReturnType<typeof mount>[] = [];
function render<P extends Record<string, unknown>>(component: Component<P>, props: P) {
  const target = document.createElement('div');
  document.body.append(target);
  const instance = mount(component, { target, props });
  mounted.push(instance);
  flushSync();
  return target;
}
afterEach(() => {
  mounted.forEach((m) => unmount(m));
  mounted = [];
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));
// toutes les espaces (y compris insécables) ramenées à une espace simple
const clean = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

describe('ExternalLink', () => {
  it('rend un lien http(s) sans référent dans un nouvel onglet', () => {
    const a = render(ExternalLink, { url: 'https://ex.com/a', children: text('A') }).querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://ex.com/a');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('target')).toBe('_blank');
  });

  it('ne rend pas cliquable un schéma dangereux', () => {
    for (const url of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', null]) {
      const el = render(ExternalLink, { url, children: text('X') });
      expect(el.querySelector('a')).toBeNull();
      expect(el.textContent).toBe('X');
    }
  });
});

describe('UsageBar', () => {
  it('affiche segments et légende chiffrée dans l’ordre fixe', () => {
    const el = render(UsageBar, { rows: [{ usage: null, urls: 2 }, { usage: 'libre', urls: 2 }] });
    expect(el.querySelectorAll('.seg-u')).toHaveLength(2);
    expect([...el.querySelectorAll('.seg-u')].map((s) => s.getAttribute('data-usage'))).toEqual(['libre', 'a-qualifier']);
    const legend = [...el.querySelectorAll('.legend li')].map((li) =>
      ['.name', 'strong', '.pct'].map((sel) => li.querySelector(sel)?.textContent),
    );
    expect(legend).toEqual([
      ['Libre', '2', '50\u202f%'],
      ['À qualifier', '2', '50\u202f%'],
    ]);
    expect(el.querySelector('.stackbar')?.getAttribute('aria-label')).toBe('Libre : 2, À qualifier : 2');
  });

  it('signale un pool vide', () => {
    expect(render(UsageBar, { rows: [] }).textContent).toContain('Aucun lien.');
  });
});

describe('BarList', () => {
  it('dimensionne les barres sur la plus grande valeur', () => {
    const el = render(BarList, { rows: [{ label: 'a.com', value: 4 }, { label: 'b.com', value: 1 }] });
    const widths = [...el.querySelectorAll<HTMLElement>('.fill')].map((f) => f.style.width);
    expect(widths).toEqual(['100%', '25%']);
    expect(el.querySelector('li')?.getAttribute('title')).toBe('a.com : 4 liens');
  });
});

describe('Pager', () => {
  const range = (el: Element) => clean(el.querySelector('.range'));
  const pages = (el: Element) => [...el.querySelectorAll('ol li')].map((li) => clean(li)).join(' ');
  const button = (el: Element, label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button.pg')].find((b) => clean(b) === label || b.getAttribute('aria-label') === label)!;

  it('numérote les pages avec ellipses et borne la navigation', () => {
    const props = $state({ total: 1000, limit: 50, offset: 0 });
    const el = render(Pager, props);
    expect(range(el)).toBe('1–50 sur 1 000');
    expect(pages(el)).toBe('‹ 1 2 … 20 ›');
    expect(button(el, 'Page précédente').getAttribute('aria-disabled')).toBe('true');
    button(el, 'Page précédente').click();
    expect(props.offset).toBe(0);

    button(el, 'Page 20').click();
    flushSync();
    expect(props.offset).toBe(950);
    expect(range(el)).toBe('951–1 000 sur 1 000');
    button(el, 'Page suivante').click();
    expect(props.offset).toBe(950);

    props.offset = 450;
    flushSync();
    expect(pages(el)).toBe('‹ 1 … 9 10 11 … 20 ›');
    expect(el.querySelector('[aria-current=page]')?.textContent).toBe('10');
    button(el, 'Page suivante').click();
    flushSync();
    expect(props.offset).toBe(500);
  });

  it('ne propose pas de pages pour un seul écran', () => {
    const el = render(Pager, { total: 0, limit: 50, offset: 0 });
    expect(range(el)).toBe('0–0 sur 0');
    expect(el.querySelector('ol')).toBeNull();
  });
});

describe('ConnectForm', () => {
  // La soumission est asynchrone : on attend son effet observable.
  const submit = async (el: Element, done: () => unknown) => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => {
      flushSync();
      expect(done()).toBeTruthy();
    });
  };

  it('connecte la session avec l’URL et le jeton saisis', async () => {
    session.disconnect();
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ name: 'moi', scope: 'admin' })));
    vi.stubGlobal('fetch', fetchFn);
    const el = render(ConnectForm, {});
    const [url, token] = el.querySelectorAll('input');
    url.value = 'http://api.test/api/v1/';
    url.dispatchEvent(new Event('input'));
    token.value = '  wp_abc  ';
    token.dispatchEvent(new Event('input'));
    await submit(el, () => session.me);
    expect(fetchFn).toHaveBeenCalledWith('http://api.test/api/v1/me', { headers: { Authorization: 'Bearer wp_abc' }, signal: expect.any(AbortSignal) });
    expect(session.me?.name).toBe('moi');
    session.disconnect();
  });

  it('affiche l’erreur de l’API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Jeton refusé' } }), { status: 401 })));
    const el = render(ConnectForm, {});
    await submit(el, () => el.querySelector('[role=alert]'));
    expect(el.querySelector('button')!.disabled).toBe(false);
    expect(el.querySelector('[role=alert]')?.textContent).toBe('Jeton refusé');
    expect(el.querySelector('input[type=password]')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('affiche le message transmis par le layout', () => {
    const el = render(ConnectForm, { notice: 'API injoignable : http://x' });
    expect(el.querySelector('[role=alert]')?.textContent).toBe('API injoignable : http://x');
  });
});

describe('Icon et UsageBadge', () => {
  it('référence le pictogramme du sprite', () => {
    const el = render(Icon, { name: 'copy', small: true });
    expect(el.querySelector('use')?.getAttribute('href')).toBe('#i-copy');
    expect(el.querySelector('svg')?.classList.contains('sm')).toBe(true);
  });

  it('écrit toujours le libellé à côté du repère', () => {
    expect(clean(render(UsageBadge, { usage: 'payant' }))).toBe('Payant');
    const pending = render(UsageBadge, { usage: null }).querySelector('.usage')!;
    expect(pending.getAttribute('data-usage')).toBe('a-qualifier');
    expect(clean(pending)).toBe('À qualifier');
  });
});

describe('ResultItem', () => {
  const base = { rank: 3, url: 'https://www.youtube.com/watch?v=x', title: 'Titre', domain: 'youtube.com', usage_commercial: 'libre' as const };

  it('affiche rang, type, titre cliquable, URL découpée, source et usage', () => {
    const onpeek = vi.fn();
    const link = enrich(base);
    const el = render(ResultItem, { link, onpeek });
    const li = el.querySelector('li.item')!;
    expect(li.getAttribute('data-media')).toBe('video');
    expect(clean(el.querySelector('.item-rank'))).toBe('#3');
    const a = el.querySelector('a.item-title')!;
    expect(a.getAttribute('href')).toBe(base.url);
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(el.querySelector('.url .host')?.textContent).toBe('www.youtube.com');
    expect(clean(el.querySelector('.src'))).toBe('Plateformes vidéo');
    expect(el.querySelector('.usage')?.getAttribute('data-usage')).toBe('libre');
    expect(el.querySelector('.kind-tag')?.textContent).toContain('Vidéo');
    el.querySelector<HTMLButtonElement>('.peek')!.click();
    expect(onpeek).toHaveBeenCalledWith(link);
  });

  it("remplace un titre absent par l'URL et lie la fiche pour l'admin", () => {
    const el = render(ResultItem, { link: enrich({ ...base, title: null, id: 42 }), onpeek: () => {} });
    expect(el.querySelector('.item-title')?.classList.contains('untitled')).toBe(true);
    expect(clean(el.querySelector('.item-title'))).toBe(base.url);
    expect(el.querySelector('a[href="/urls/42"]')?.textContent).toBe('fiche');
  });

  it("n'ouvre pas un lien au schéma dangereux", () => {
    const el = render(ResultItem, { link: enrich({ ...base, url: 'javascript:alert(1)' }), onpeek: () => {} });
    expect(el.querySelector('a.item-title')).toBeNull();
    expect(clean(el.querySelector('span.item-title'))).toBe('Titre');
  });
});

describe('médias', () => {
  const base = { rank: 1, url: 'https://ex.com/a', title: 'T', domain: 'ex.com', usage_commercial: null };
  const api = (patch: Record<string, unknown>) => enrich({ ...base, ...patch } as never, (p) => (p ? `https://api.test${p}` : null));

  it('affiche la vignette du cache, avec lecture pour une vidéo', () => {
    const el = render(MediaThumb, { link: api({ thumbnail: '/api/v1/media/a.webp', media_type: 'video' }) });
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://api.test/api/v1/media/a.webp');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(el.querySelector('.play')).not.toBeNull();
    expect(el.querySelector('.thumb')?.classList.contains('fallback')).toBe(false);
  });

  it('bascule sur le repli « indisponible » quand la vignette ne se charge pas', () => {
    const el = render(MediaThumb, { link: api({ thumbnail: '/api/v1/media/a.webp', favicon: '/api/v1/media/f.webp' }) });
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    flushSync();
    const thumb = el.querySelector('.thumb')!;
    expect(thumb.classList.contains('broken')).toBe(true);
    expect(clean(thumb.querySelector('.why'))).toBe('Vignette indisponible');
    expect(thumb.querySelector('use')?.getAttribute('href')).toBe('#i-broken');
  });

  it('sans vignette : favicon agrandi, puis pictogramme du type', () => {
    const el = render(MediaThumb, { link: api({ favicon: '/api/v1/media/f.webp', media_type: 'pdf' }), rank: false });
    expect(el.querySelector('.big-fav')?.getAttribute('src')).toBe('https://api.test/api/v1/media/f.webp');
    expect(el.querySelector('.rank-tag')).toBeNull();
    el.querySelector('.big-fav')!.dispatchEvent(new Event('error'));
    flushSync();
    expect(el.querySelector('.big-fav')).toBeNull();
    expect([...el.querySelectorAll('use')].map((u) => u.getAttribute('href'))).toContain('#i-pdf');
    expect(clean(el.querySelector('.why'))).toBe('Pas de vignette');
  });

  it("montre favicon et description dans la liste, pictogramme si le favicon échoue", () => {
    const el = render(ResultItem, { link: api({ favicon: '/api/v1/media/f.webp', description: 'Une description' }), onpeek: () => {} });
    expect(clean(el.querySelector('.item-desc'))).toBe('Une description');
    const fav = el.querySelector<HTMLImageElement>('.item-fav img')!;
    expect(fav.getAttribute('src')).toBe('https://api.test/api/v1/media/f.webp');
    fav.dispatchEvent(new Event('error'));
    flushSync();
    expect(el.querySelector('.item-fav img')).toBeNull();
    expect(el.querySelector('.item-fav use')?.getAttribute('href')).toBe('#i-page');
  });
});

describe('CopyLinks', () => {
  const page = (items: unknown[], total: number) => new Response(JSON.stringify({ items, total, limit: 500, offset: 0 }));
  const links: CopyLink[] = [
    { rank: 1, url: 'https://a.test/', title: 'A', domain: 'a.test', usage_commercial: 'libre' },
    { rank: 2, url: 'https://b.test/', title: 'B', domain: 'b.test', usage_commercial: null },
  ];
  const connect = async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ name: 'moi', scope: 'read' }))));
    await session.connect({ baseUrl: 'http://api.test/api/v1', token: 'wp_x' });
  };
  const status = (el: Element) => el.querySelector('.copy-status')!;
  afterEach(() => {
    session.disconnect();
    localStorage.clear();
  });

  it('copie tout le pool au format par défaut et confirme', async () => {
    await connect();
    const fetchFn = vi.fn(async () => page(links, 2));
    vi.stubGlobal('fetch', fetchFn);
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const el = render(CopyLinks, { slug: 'p', count: 2, load: () => fetchAllLinks(session.client!, 'p') });
    expect(clean(el.querySelector('button'))).toBe('Copier les 2 liens');
    expect(clean(render(CopyLinks, { slug: 'p', count: 1, filtered: true, load: () => [] }).querySelector('button'))).toBe(
      'Copier les 1 liens filtrés',
    );
    el.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => {
      flushSync();
      expect(status(el).classList.contains('ok')).toBe(true);
    });
    expect(writeText).toHaveBeenCalledWith('https://a.test/\nhttps://b.test/\n');
    expect(clean(status(el))).toBe('2 liens copiés · URLs');
    expect(fetchFn).toHaveBeenCalledWith('http://api.test/api/v1/pools/p/items?limit=500&offset=0', expect.anything());
  });

  it('mémorise le format choisi dans le menu, fermé par Échap', async () => {
    await connect();
    const el = render(CopyLinks, { slug: 'p', count: 2, load: () => fetchAllLinks(session.client!, 'p') });
    const toggle = el.querySelectorAll<HTMLButtonElement>('.copy-split button')[1];
    const menu = el.querySelector('[role=menu]') as HTMLElement;
    expect(menu.hidden).toBe(true);
    toggle.click();
    flushSync();
    expect(menu.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    flushSync();
    expect(menu.hidden).toBe(true);

    toggle.click();
    flushSync();
    [...el.querySelectorAll<HTMLButtonElement>('[role=menuitemradio]')].find((b) => b.textContent?.includes('CSV'))!.click();
    flushSync();
    expect(menu.hidden).toBe(true);
    expect(localStorage.getItem('datapool.copyFormat')).toBe('csv');
    expect(toggle.getAttribute('aria-label')).toBe('Format de copie : CSV');
    expect(el.querySelector('[aria-checked=true]')?.textContent).toContain('CSV');
  });

  it('télécharge la sélection au format choisi depuis le menu', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:sel');
    URL.revokeObjectURL = vi.fn();
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    localStorage.setItem('datapool.copyFormat', 'md');
    const el = render(CopyLinks, { slug: 'p', count: 2, load: () => links });
    expect(clean(el.querySelector('.menu-item.download .sample'))).toBe('p.md');
    el.querySelectorAll<HTMLButtonElement>('.copy-split button')[1].click();
    flushSync();
    el.querySelector<HTMLButtonElement>('.menu-item.download')!.click();
    await vi.waitFor(() => {
      flushSync();
      expect(clean(el.querySelector('.copy-status'))).toBe('2 liens téléchargés · MD');
    });
    expect(names).toEqual(['p.md']);
    expect((el.querySelector('[role=menu]') as HTMLElement).hidden).toBe(true);
    click.mockRestore();
  });

  it('efface la confirmation après 4 s et ferme le menu au clic extérieur', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const el = render(CopyLinks, { slug: 'p', count: 2, load: () => links });
    vi.useFakeTimers();
    for (const action of ['.copy-split button', '.menu-item.download']) {
      el.querySelector<HTMLButtonElement>(action)!.click();
      await vi.advanceTimersByTimeAsync(10);
      flushSync();
      expect((status(el) as HTMLElement).hidden).toBe(false);
      await vi.advanceTimersByTimeAsync(4000);
      flushSync();
      expect((status(el) as HTMLElement).hidden).toBe(true);
    }
    vi.useRealTimers();
    click.mockRestore();
    el.querySelectorAll<HTMLButtonElement>('.copy-split button')[1].click();
    flushSync();
    expect((el.querySelector('[role=menu]') as HTMLElement).hidden).toBe(false);
    document.body.click();
    flushSync();
    expect((el.querySelector('[role=menu]') as HTMLElement).hidden).toBe(true);
  });

  it('annonce un plafond et signale un téléchargement impossible', async () => {
    const el = render(CopyLinks, {
      slug: 'corpus',
      count: 5000,
      capped: true,
      filtered: true,
      load: async () => {
        throw new Error('API injoignable');
      },
    });
    expect(clean(el.querySelector('.copy-split button'))).toBe('Copier les 5 000 premiers liens filtrés');
    el.querySelector<HTMLButtonElement>('.menu-item.download')!.click();
    await vi.waitFor(() => {
      flushSync();
      expect(clean(el.querySelector('.copy-status.err'))).toBe('API injoignable');
    });
  });

  it('propose de télécharger la liste quand le presse-papiers refuse', async () => {
    await connect();
    vi.stubGlobal('fetch', vi.fn(async () => page(links, 2)));
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('Permission refusée'); }) } });
    URL.createObjectURL = vi.fn(() => 'blob:liste');
    URL.revokeObjectURL = vi.fn();
    const el = render(CopyLinks, { slug: 'p', count: 2, load: () => fetchAllLinks(session.client!, 'p') });
    el.querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => {
      flushSync();
      expect(status(el).classList.contains('err')).toBe(true);
    });
    expect(clean(status(el))).toBe('Permission refusée · télécharger la liste');
    expect(status(el).querySelector('a')?.getAttribute('href')).toBe('blob:liste');
    expect(status(el).querySelector('a')?.getAttribute('download')).toBe('p.txt');
  });
});

describe('theme', () => {
  it('bascule et mémorise le thème clair', () => {
    expect(theme.light).toBe(false);
    theme.toggle();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('datapool.theme')).toBe('light');
    theme.toggle();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('datapool.theme')).toBe('dark');
  });
});

describe('contrôle des liens', () => {
  const check = (day: number, http_status: number | null, verdict: string, error: string | null = null) => ({
    checked_at: `2026-11-0${day}T04:10:00Z`,
    http_status,
    verdict,
    error,
  });
  const empty = { sources: [], themes: [], facets: [], pools: [] };
  const URLS: Record<string, unknown> = {
    '224': {
      ...empty,
      id: 224,
      raw_url: 'https://mort.test/a',
      canonical_url: 'https://mort.test/a',
      domain: 'mort.test',
      title: 'Mort',
      status: 'classified',
      http_status: 200,
      dead_streak: 3,
      checked_at: '2026-11-06T04:10:00Z',
      quarantined_at: '2026-11-06T04:10:00Z',
      checks: [check(6, 404, 'dead'), check(5, null, 'unsure', 'TimeoutError'), check(4, 404, 'dead'), check(3, 404, 'dead')],
    },
    '7': {
      ...empty,
      id: 7,
      raw_url: 'https://sain.test/',
      canonical_url: 'https://sain.test/',
      domain: 'sain.test',
      title: 'Sain',
      status: 'classified',
      http_status: 301,
      dead_streak: 0,
      checked_at: '2026-11-06T04:10:00Z',
      quarantined_at: null,
      checks: [check(6, 200, 'ok')],
    },
    '8': {
      ...empty,
      id: 8,
      raw_url: 'https://neuf.test/',
      domain: 'neuf.test',
      title: 'Neuf',
      status: 'normalized',
      http_status: 200,
      dead_streak: 0,
      checked_at: null,
      quarantined_at: null,
      checks: [],
    },
  };
  const LIST = [
    { id: 224, url: 'https://mort.test/a', title: 'Mort', status: 'classified', quarantined_at: '2026-11-06T04:10:00Z' },
    { id: 7, url: 'https://sain.test/', title: 'Sain', status: 'classified', quarantined_at: null },
  ];
  const requested: URL[] = [];
  const json = (body: unknown) => new Response(JSON.stringify(body));
  function respond(url: URL) {
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/me') return json({ name: 'admin', scope: 'admin' });
    if (path === '/admin/stats') return json({ url_item: [{ status: 'classified', n: 3 }], pools: 1, quarantined: 4, search_query: [] });
    if (path === '/admin/runs') return json({ items: [], total: 0, limit: 15, offset: 0 });
    if (path === '/admin/themes') return json({ items: [] });
    if (path === '/admin/urls') {
      const q = url.searchParams.get('quarantined');
      const items = q === null ? LIST : LIST.filter((u) => (u.quarantined_at !== null) === (q === 'true'));
      return json({ items, total: items.length, limit: 50, offset: 0 });
    }
    const id = /^\/admin\/urls\/(\d+)$/.exec(path)?.[1];
    if (id && URLS[id]) return json(URLS[id]);
    return new Response('{}', { status: 404 });
  }
  const connect = async () => {
    requested.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        requested.push(url);
        return respond(url);
      }),
    );
    await session.connect({ baseUrl: 'http://api.test/api/v1', token: 'wp_x' });
  };
  const settled = async (el: Element, sel: string) => {
    await vi.waitFor(() => {
      flushSync();
      expect(el.querySelector(sel)).not.toBeNull();
    });
  };
  const checksTitle = (el: Element) => [...el.querySelectorAll('.section-title')].find((t) => t.textContent?.includes('Contrôles'));
  const checkRows = (el: Element) =>
    [...(checksTitle(el)?.nextElementSibling?.querySelectorAll('tbody tr') ?? [])].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => clean(td)),
    );
  afterEach(() => {
    session.disconnect();
    localStorage.clear();
    appPage.params = {};
    appPage.url = new URL('http://localhost/pools/p');
  });

  it("page d'un lien en quarantaine : badge, résumé et tests avec verdict", async () => {
    await connect();
    appPage.params = { id: '224' };
    const el = render(UrlPage, {});
    await settled(el, '.url-meta');
    expect(clean(el.querySelector('.url-meta .status.failed'))).toBe('quarantaine');
    expect(clean(el.querySelector('.url-meta'))).toMatch(/HTTP 404 · testé le /);
    expect(clean(checksTitle(el) ?? null)).toMatch(/3 morts comptés · en quarantaine depuis le /);
    expect(checkRows(el).map((c) => c.slice(1))).toEqual([
      ['404', 'mort', ''],
      ['—', 'incertain', 'délai dépassé'],
      ['404', 'mort', ''],
      ['404', 'mort', ''],
    ]);
    expect(el.querySelector('td.verdict.dead')).not.toBeNull();
  });

  it("page d'un lien sain : dernier statut testé et sa date, sans badge", async () => {
    await connect();
    appPage.params = { id: '7' };
    const el = render(UrlPage, {});
    await settled(el, '.url-meta');
    expect(el.querySelector('.url-meta .status.failed')).toBeNull();
    const meta = clean(el.querySelector('.url-meta'));
    expect(meta).toMatch(/HTTP 200 · testé le /);
    expect(meta).not.toContain('HTTP 301');
    expect(clean(checksTitle(el) ?? null)).toContain('0 mort compté');
    expect(checkRows(el).map((c) => c.slice(1))).toEqual([['200', 'sain', '']]);
  });

  it('lien jamais testé : statut de la normalisation et panneau vide', async () => {
    await connect();
    appPage.params = { id: '8' };
    const el = render(UrlPage, {});
    await settled(el, '.url-meta');
    expect(clean(el.querySelector('.url-meta'))).toContain('HTTP 200 · jamais testé');
    expect(checkRows(el)).toEqual([['Jamais testé.']]);
    expect(el.querySelector('[role=alert]')).toBeNull();
  });

  it('corpus : ?quarantined=true présélectionne le filtre et ne liste que la quarantaine', async () => {
    await connect();
    appPage.url = new URL('http://localhost/corpus?quarantined=true');
    const el = render(CorpusPage, {});
    await settled(el, 'tbody .cell-url');
    const field = [...el.querySelectorAll('label.field')].find((l) => l.textContent?.includes('Quarantaine'));
    expect(field?.querySelector('select')?.value).toBe('true');
    expect(requested.find((u) => u.pathname.endsWith('/admin/urls'))?.searchParams.get('quarantined')).toBe('true');
    const lines = [...el.querySelectorAll('tbody tr')];
    expect(lines).toHaveLength(1);
    expect(clean(lines[0].querySelector('.cell-url'))).toBe('Mort');
    expect(clean(lines[0].querySelector('.status.failed'))).toBe('quarantaine');
  });

  it('tableau de bord : le compteur mène au corpus filtré', async () => {
    await connect();
    const el = render(DashboardPage, {});
    await settled(el, '.tiles');
    const tile = [...el.querySelectorAll('a.tile')].find((a) => a.textContent?.includes('En quarantaine'));
    expect(tile?.getAttribute('href')).toBe('/corpus?quarantined=true');
    expect(clean(tile?.querySelector('.value') ?? null)).toBe('4');
    expect(tile?.classList.contains('warn')).toBe(true);
  });
});

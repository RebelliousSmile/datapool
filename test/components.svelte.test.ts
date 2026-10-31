import { flushSync, mount, unmount, type Component } from 'svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BarList from '../src/lib/components/BarList.svelte';
import ConnectForm from '../src/lib/components/ConnectForm.svelte';
import ExternalLink from '../src/lib/components/ExternalLink.svelte';
import Pager from '../src/lib/components/Pager.svelte';
import UsageBar from '../src/lib/components/UsageBar.svelte';
import { session } from '../src/lib/session.svelte.ts';

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
    expect(el.querySelectorAll('.seg')).toHaveLength(2);
    expect([...el.querySelectorAll('.legend li')].map(clean)).toEqual(['Libre 2 50 %', 'À qualifier 2 50 %']);
    expect(el.querySelector('.bar')?.getAttribute('aria-label')).toBe('Libre : 2, À qualifier : 2');
  });

  it('signale un pool vide', () => {
    expect(render(UsageBar, { rows: [] }).textContent).toContain('Aucune URL.');
  });
});

describe('BarList', () => {
  it('dimensionne les barres sur la plus grande valeur', () => {
    const el = render(BarList, { rows: [{ label: 'a.com', value: 4 }, { label: 'b.com', value: 1 }] });
    const widths = [...el.querySelectorAll<HTMLElement>('.fill')].map((f) => f.style.width);
    expect(widths).toEqual(['100%', '25%']);
    expect(el.querySelector('tr')?.getAttribute('title')).toBe('a.com : 4 URLs');
  });
});

describe('Pager', () => {
  it('borne la navigation', () => {
    const props = $state({ total: 120, limit: 50, offset: 0 });
    const el = render(Pager, props);
    const [prev, next] = el.querySelectorAll('button');
    expect(clean(el.querySelector('span'))).toBe('1–50 sur 120');
    expect(prev.disabled).toBe(true);
    next.click();
    flushSync();
    expect(props.offset).toBe(50);
    next.click();
    flushSync();
    expect(clean(el.querySelector('span'))).toBe('101–120 sur 120');
    expect(next.disabled).toBe(true);
    prev.click();
    flushSync();
    expect(props.offset).toBe(50);
  });

  it('affiche zéro résultat', () => {
    const el = render(Pager, { total: 0, limit: 50, offset: 0 });
    expect(clean(el.querySelector('span'))).toBe('0–0 sur 0');
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
    expect(fetchFn).toHaveBeenCalledWith('http://api.test/api/v1/me', { headers: { Authorization: 'Bearer wp_abc' } });
    expect(session.me?.name).toBe('moi');
    session.disconnect();
  });

  it('affiche l’erreur de l’API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Jeton refusé' } }), { status: 401 })));
    const el = render(ConnectForm, {});
    await submit(el, () => el.querySelector('[role=alert]'));
    expect(el.querySelector('button')!.disabled).toBe(false);
    expect(el.querySelector('[role=alert]')?.textContent).toBe('Jeton refusé');
  });
});

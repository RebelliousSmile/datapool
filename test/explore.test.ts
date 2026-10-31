// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { hostOf, mediaOf, sourceOf } from '../src/lib/kinds';
import {
  activeCount,
  addFilter,
  changeSeg,
  clearFilters,
  counts,
  defaultState,
  enrich,
  filterLinks,
  fromParams,
  groupLinks,
  labelOf,
  orderOf,
  parseToken,
  popFilter,
  removeFilter,
  suggestions,
  toParams,
  toggleFilter,
  tokens,
  type XState,
} from '../src/lib/explore';
import { loadViews, removeView, saveView } from '../src/lib/views';

describe('kinds', () => {
  it('déduit le type de média', () => {
    expect(mediaOf('https://arxiv.org/pdf/2106.09685.pdf')).toBe('pdf');
    expect(mediaOf('https://x.org/a/photo.JPG')).toBe('image');
    expect(mediaOf('https://x.org/clip.mp4')).toBe('video');
    expect(mediaOf('https://x.org/data.csv')).toBe('data');
    expect(mediaOf('https://x.org/w.safetensors')).toBe('model');
    expect(mediaOf('https://www.youtube.com/watch?v=1')).toBe('video');
    expect(mediaOf('https://huggingface.co/stabilityai/sdxl')).toBe('model');
    expect(mediaOf('https://huggingface.co/datasets/x/y')).toBe('data');
    expect(mediaOf('https://huggingface.co/spaces/x/y')).toBe('code');
    expect(mediaOf('https://civitai.com/models/1/x')).toBe('model');
    expect(mediaOf('https://github.com/a/b')).toBe('code');
    expect(mediaOf('https://www.kaggle.com/datasets/a/b')).toBe('data');
    expect(mediaOf('https://zenodo.org/records/1')).toBe('data');
    expect(mediaOf('https://www.flickr.com/photos/u/123')).toBe('image');
    expect(mediaOf('https://commons.wikimedia.org/wiki/File:A.jpg')).toBe('image');
    expect(mediaOf('https://commons.wikimedia.org/wiki/Category:A')).toBe('page');
    expect(mediaOf('https://example.com/')).toBe('page');
    expect(mediaOf('pas une url')).toBe('page');
  });

  it('range un domaine dans sa famille de source, sous-domaines compris', () => {
    expect(sourceOf('journals.plos.org')).toBe('research');
    expect(sourceOf('www.europeana.eu')).toBe('archives');
    expect(sourceOf('flickr.com')).toBe('stock');
    expect(sourceOf('github.com')).toBe('community');
    expect(sourceOf('youtu.be')).toBe('video');
    expect(sourceOf('fr.wikipedia.org')).toBe('press');
    expect(sourceOf('notplos.org')).toBe('other');
    expect(sourceOf(null)).toBe('other');
    expect(hostOf('https://WWW.Ex.com/a')).toBe('ex.com');
    expect(hostOf('nope')).toBe('');
  });
});

const raw = [
  { rank: 1, url: 'https://www.flickr.com/photos/u/1', title: 'Moss bark', domain: 'flickr.com', usage_commercial: 'sous-conditions' as const },
  { rank: 2, url: 'https://unsplash.com/photos/x', title: 'Forest path', domain: 'unsplash.com', usage_commercial: 'libre' as const },
  { rank: 3, url: 'https://github.com/a/b', title: 'LoRA scripts', domain: 'github.com', usage_commercial: 'libre' as const },
  { rank: 4, url: 'https://www.youtube.com/watch?v=1', title: 'LoRA video', domain: 'youtube.com', usage_commercial: null },
  { rank: 5, url: 'https://unsplash.com/photos/y', title: null, domain: 'unsplash.com', usage_commercial: 'libre' as const },
];
const links = raw.map(enrich);
const S = (patch: Partial<XState> = {}): XState => ({ ...defaultState(), ...patch, f: { ...defaultState().f, ...patch.f } });

describe('explore', () => {
  it('complète un lien de ses dimensions', () => {
    expect(links[3]).toMatchObject({ media: 'video', source: 'video', usage: 'a-qualifier', host: 'youtube.com' });
    expect(enrich({ rank: 9, url: 'https://www.a.org/x', title: 'T' } as never).host).toBe('a.org');
  });

  it('filtre par onglet, facettes et mots', () => {
    expect(filterLinks(links, S({ tab: 'image' })).map((l) => l.rank)).toEqual([1, 2, 5]);
    expect(filterLinks(links, S({ f: { usage: ['libre'] } as never })).map((l) => l.rank)).toEqual([2, 3, 5]);
    expect(filterLinks(links, S({ tab: 'image', f: { usage: ['libre'] } as never })).map((l) => l.rank)).toEqual([2, 5]);
    expect(filterLinks(links, S({ q: 'LoRA  scripts' })).map((l) => l.rank)).toEqual([3]);
    expect(filterLinks(links, S({ f: { domain: ['unsplash.com'] } as never })).map((l) => l.rank)).toEqual([2, 5]);
  });

  it('compte une facette sans elle-même', () => {
    const s = S({ f: { usage: ['libre'] } as never });
    expect(Object.fromEntries(counts(links, 'usage', s, 'usage'))).toEqual({ 'sous-conditions': 1, libre: 3, 'a-qualifier': 1 });
    expect(Object.fromEntries(counts(links, 'media', s))).toEqual({ image: 2, code: 1 });
  });

  it('ordonne et nomme les valeurs', () => {
    expect(orderOf('domain', links)).toEqual(['unsplash.com', 'flickr.com', 'github.com', 'youtube.com']);
    expect(orderOf('usage', links).at(-1)).toBe('a-qualifier');
    expect(labelOf('media', 'video')).toBe('Vidéos');
    expect(labelOf('source', 'stock')).toBe("Banques d'images");
    expect(labelOf('usage', 'a-qualifier')).toBe('À qualifier');
    expect(labelOf('domain', 'x.org')).toBe('x.org');
    expect(labelOf('media', 'inconnu')).toBe('inconnu');
  });

  it('ajoute, retire, bascule et dépile les filtres', () => {
    let s = addFilter(S(), 'media', 'image');
    expect(s.tab).toBe('image');
    s = addFilter(s, 'usage', 'libre');
    expect(addFilter(s, 'usage', 'libre')).toBe(s);
    expect(tokens(s)).toEqual([
      { dim: 'media', value: 'image' },
      { dim: 'usage', value: 'libre' },
    ]);
    expect(activeCount(s)).toBe(2);
    expect(toggleFilter(s, 'usage', 'libre').f.usage).toEqual([]);
    expect(toggleFilter(s, 'usage', 'payant').f.usage).toEqual(['libre', 'payant']);
    expect(removeFilter(s, 'media', 'image').tab).toBe('');
    s = popFilter(s);
    expect(s.f.usage).toEqual([]);
    expect(popFilter(s).tab).toBe('');
    expect(clearFilters({ ...s, q: 'x' })).toMatchObject({ tab: '', q: '', f: defaultState().f });
  });

  it("change la dimension de segment sans perdre l'onglet", () => {
    const s = changeSeg(S({ tab: 'image', f: { usage: ['libre'] } as never }), 'usage');
    expect(s).toMatchObject({ seg: 'usage', tab: 'libre' });
    expect(s.f.media).toEqual(['image']);
    expect(s.f.usage).toEqual([]);
    expect(changeSeg(S({ f: { source: ['stock', 'video'] } as never }), 'source')).toMatchObject({ tab: '' });
  });

  it('transforme `type:vid ` en filtre, sans accents ni casse', () => {
    expect(parseToken('type:vid ', links)).toEqual({ dim: 'media', value: 'video' });
    expect(parseToken('usage:à ', links)).toEqual({ dim: 'usage', value: 'a-qualifier' });
    expect(parseToken('Domaine:github.com ', links)).toEqual({ dim: 'domain', value: 'github.com' });
    expect(parseToken('type:vid', links)).toBeNull();
    expect(parseToken('type:zzz ', links)).toBeNull();
    expect(parseToken('lora ', links)).toBeNull();
  });

  it('suggère les filtres présents, les plus fréquents d’abord', () => {
    const rows = suggestions(links, S(), '');
    expect(rows[0]).toMatchObject({ n: 3 });
    expect(rows).toHaveLength(6);
    expect(suggestions(links, S(), 'vid').map((r) => r.label)).toEqual(['Vidéos', 'Plateformes vidéo']);
    expect(suggestions(links, S({ tab: 'image' }), 'vid').map((r) => r.dim)).not.toContain('media');
    expect(suggestions(links, S({ f: { usage: ['libre'] } as never }), 'libre')).toEqual([]);
  });

  it('groupe dans l’ordre de la dimension', () => {
    expect(groupLinks(links, 'usage', links).map((g) => [g.value, g.links.length])).toEqual([
      ['libre', 3],
      ['sous-conditions', 1],
      ['a-qualifier', 1],
    ]);
  });

  it("aller-retour avec l'URL, valeurs par défaut omises, inconnues ignorées", () => {
    expect(toParams(defaultState()).toString()).toBe('');
    const s = S({ q: 'mousse', seg: 'source', tab: 'stock', group: 'usage', density: 'grid', f: { usage: ['libre', 'payant'] } as never });
    const p = toParams(s);
    expect(p.toString()).toBe('q=mousse&seg=source&tab=stock&usage=libre%2Cpayant&group=usage&density=grid');
    expect(fromParams(p)).toEqual(s);
    expect(fromParams(new URLSearchParams('seg=zzz&group=zzz&density=zzz'), { density: 'compact' })).toMatchObject({
      seg: 'media',
      group: 'none',
      density: 'compact',
    });
  });
});

describe('vues enregistrées', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('enregistre, remplace et supprime les vues d’un pool', () => {
    const s = store();
    expect(loadViews('p', s)).toEqual([]);
    saveView('p', { name: 'Libres', params: 'usage=libre' }, s);
    saveView('p', { name: 'Images', params: 'tab=image' }, s);
    expect(saveView('p', { name: 'Libres 2', params: 'usage=libre' }, s).map((v) => v.name)).toEqual(['Images', 'Libres 2']);
    expect(loadViews('autre', s)).toEqual([]);
    expect(removeView('p', 'tab=image', s).map((v) => v.name)).toEqual(['Libres 2']);
  });

  it('ignore un contenu illisible', () => {
    expect(loadViews('p', { getItem: () => '{x' })).toEqual([]);
    expect(loadViews('p', { getItem: () => '{"a":1}' })).toEqual([]);
    expect(loadViews('p', { getItem: () => '[{"name":1},{"name":"ok","params":""}]' })).toEqual([{ name: 'ok', params: '' }]);
  });
});

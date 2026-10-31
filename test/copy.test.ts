// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, downloadText, fetchAllUrls } from '../src/lib/copy';

describe('copyText', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('utilise le presse-papiers quand il existe', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyText('x');
    expect(writeText).toHaveBeenCalledWith('x');
  });

  it('se replie sur execCommand, sans laisser de zone de texte', async () => {
    vi.stubGlobal('navigator', {});
    const exec = vi.fn(() => true);
    document.execCommand = exec;
    await copyText('y');
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('signale une copie refusée', async () => {
    vi.stubGlobal('navigator', {});
    document.execCommand = vi.fn(() => false);
    await expect(copyText('z')).rejects.toThrow('Copie refusée par le navigateur');
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('fetchAllUrls', () => {
  const page = (n: number, total: number, from = 0) => ({
    items: Array.from({ length: n }, (_, i) => ({
      id: from + i,
      url: `https://ex.com/${from + i}`,
      title: i % 2 ? null : `T${from + i}`,
      domain: 'ex.com',
      usage_commercial: i === 0 ? 'libre' : null,
    })),
    total,
  });

  it('parcourt toutes les pages de la sélection, rangs dans l’ordre', async () => {
    const urls = vi.fn(async (q: Record<string, number>) => page(Math.min(q.limit, 3 - q.offset), 3, q.offset));
    const links = await fetchAllUrls({ urls } as never, { status: 'classified' }, { pageSize: 2 });
    expect(links.map((l) => [l.rank, l.url])).toEqual([
      [1, 'https://ex.com/0'],
      [2, 'https://ex.com/1'],
      [3, 'https://ex.com/2'],
    ]);
    expect(links[0]).toMatchObject({ title: 'T0', domain: 'ex.com', usage_commercial: 'libre' });
    expect(urls.mock.calls.map(([q]) => [q.limit, q.offset, q.status])).toEqual([
      [2, 0, 'classified'],
      [2, 2, 'classified'],
    ]);
  });

  it('s’arrête au plafond, même si le corpus est plus grand', async () => {
    const urls = vi.fn(async (q: Record<string, number>) => page(q.limit, 10_000, q.offset));
    const links = await fetchAllUrls({ urls } as never, {}, { cap: 5, pageSize: 2 });
    expect(links).toHaveLength(5);
    expect(urls.mock.calls.map(([q]) => q.limit)).toEqual([2, 2, 1]);
  });

  it('s’arrête sur une page vide', async () => {
    const urls = vi.fn(async () => page(0, 50));
    expect(await fetchAllUrls({ urls } as never, {})).toEqual([]);
    expect(urls).toHaveBeenCalledTimes(1);
  });
});

describe('downloadText', () => {
  it('enregistre le texte sous le nom donné puis libère le lien', () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('corpus.csv');
      expect(this.href).toBe('blob:x');
    });
    downloadText('a,b\n', 'corpus.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    vi.useRealTimers();
    click.mockRestore();
  });
});

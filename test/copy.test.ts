// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../src/lib/copy';

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

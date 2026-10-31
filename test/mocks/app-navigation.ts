// Substitut de $app/navigation pour vitest : goto enregistre ses appels et met
// à jour l'URL de la page simulée ; afterNavigate garde son rappel.
import { page } from './app-state';

export const calls: { url: string; opts: unknown }[] = [];
export const navigateCallbacks: ((nav: { type: string }) => void)[] = [];

export async function goto(url: string, opts?: unknown): Promise<void> {
  calls.push({ url, opts });
  page.url = new URL(url, page.url);
}

export function afterNavigate(fn: (nav: { type: string }) => void): void {
  navigateCallbacks.push(fn);
}

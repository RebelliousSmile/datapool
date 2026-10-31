// Substitut de $app/paths pour vitest (hors du routeur SvelteKit) : remplace
// les paramètres `[nom]` de la route, comme resolve() avec une base vide.
export function resolve(route: string, params: Record<string, string> = {}): string {
  return route.replace(/\[(\w+)\]/g, (_, name: string) => encodeURIComponent(params[name] ?? ''));
}

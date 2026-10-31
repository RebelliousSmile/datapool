// Vues enregistrées d'un pool : un nom et l'état de l'explorateur sous forme
// de paramètres d'URL. Gardées dans le navigateur pour l'instant ; elles
// passeront au compte quand webpool en aura.

export type SavedView = { name: string; params: string };

const key = (slug: string) => `datapool.views.${slug}`;

export function loadViews(slug: string, storage: Pick<Storage, 'getItem'> = localStorage): SavedView[] {
  try {
    const v = JSON.parse(storage.getItem(key(slug)) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x?.name === 'string' && typeof x?.params === 'string') : [];
  } catch {
    return [];
  }
}

// Une vue de même contenu remplace l'ancienne (pas de doublon).
export function saveView(slug: string, view: SavedView, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): SavedView[] {
  const views = [...loadViews(slug, storage).filter((v) => v.params !== view.params), view];
  storage.setItem(key(slug), JSON.stringify(views));
  return views;
}

export function removeView(slug: string, params: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): SavedView[] {
  const views = loadViews(slug, storage).filter((v) => v.params !== params);
  storage.setItem(key(slug), JSON.stringify(views));
  return views;
}

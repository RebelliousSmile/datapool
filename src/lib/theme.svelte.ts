// Thème clair / sombre : sombre par défaut, choix mémorisé dans le navigateur.
// app.html l'applique avant le premier rendu ; ce module le bascule ensuite.
export const THEME_KEY = 'datapool.theme';

class Theme {
  light = $state(typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light');

  toggle() {
    this.light = !this.light;
    if (this.light) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    localStorage.setItem(THEME_KEY, this.light ? 'light' : 'dark');
  }
}

export const theme = new Theme();

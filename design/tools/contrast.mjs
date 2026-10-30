// Vérifie les contrastes WCAG des jetons de design/tokens.css (thèmes sombre et clair).
// Usage : node design/tools/contrast.mjs   (code de sortie 1 si une paire échoue)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), 'utf8');

// Extrait les jetons hexadécimaux d'un bloc (premier bloc dont le sélecteur correspond).
function block(selector) {
  const start = css.indexOf(`${selector} {\n  color-scheme`);
  if (start < 0) throw new Error(`bloc introuvable : ${selector}`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}
const dark = block(':root');
const light = { ...dark, ...block(":root[data-theme='light']") };

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [premier plan, fond, seuil, rôle]
const TEXT = 4.5, UI = 3;
const pairs = [
  ['ink', 'bg', TEXT, 'texte'], ['ink', 'surface', TEXT, 'texte'], ['ink', 'surface-2', TEXT, 'texte'], ['ink', 'surface-3', TEXT, 'texte'],
  ['ink-2', 'surface', TEXT, 'texte secondaire'], ['ink-2', 'surface-2', TEXT, 'texte secondaire'], ['ink-2', 'bg', TEXT, 'texte secondaire'],
  ['muted', 'surface', TEXT, 'méta'], ['muted', 'surface-2', TEXT, 'méta'], ['muted', 'bg', TEXT, 'méta'],
  ['link', 'surface', TEXT, 'lien'], ['link', 'surface-2', TEXT, 'lien'], ['accent', 'surface', TEXT, 'accent (texte)'],
  ['ink-inverse', 'accent', TEXT, 'bouton primaire'],
  ['good', 'surface', TEXT, 'statut ok'], ['warning', 'surface', TEXT, 'statut alerte'], ['critical', 'surface', TEXT, 'statut échec'],
  ['focus', 'surface', UI, 'anneau de focus'], ['focus', 'bg', UI, 'anneau de focus'], ['line-strong', 'surface', UI, 'bord de contrôle'],
  ['usage-libre', 'surface', UI, 'usage : libre'], ['usage-sous-conditions', 'surface', UI, 'usage : sous conditions'],
  ['usage-payant', 'surface', UI, 'usage : payant'], ['usage-non-commercial', 'surface', UI, 'usage : non commercial'],
  ['usage-a-qualifier', 'surface', UI, 'usage : à qualifier'], ['series-solo', 'surface', UI, 'barres (série unique)'],
  ['thumb-ink', 'thumb-bg', UI, 'pictogramme de repli'],
];

let failed = 0;
for (const [name, theme] of [['sombre', dark], ['clair', light]]) {
  console.log(`\nThème ${name}`);
  for (const [fg, bg, min, role] of pairs) {
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'OK  ' : 'ÉCHEC'} ${r.toFixed(2).padStart(5)}:1 ≥ ${min}  ${fg} ${theme[fg]} / ${bg} ${theme[bg]}  (${role})`);
  }
}
console.log(failed ? `\n${failed} paire(s) sous le seuil.` : '\nToutes les paires passent.');
process.exit(failed ? 1 : 0);

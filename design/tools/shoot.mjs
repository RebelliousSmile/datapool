// Ouvre chaque maquette dans Chromium (1366×768 et 390×844, sombre et clair),
// signale débordements horizontaux et chevauchements de texte, compte les lignes
// visibles de la vue flux, et enregistre les captures dans design/screenshots/.
// Usage : node design/tools/shoot.mjs [filtre]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const DESIGN = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${DESIGN}screenshots/`;
mkdirSync(OUT, { recursive: true });

const PAGES = [
  'mockups/connexion.html', 'mockups/connexion-erreur.html', 'mockups/pools.html', 'mockups/pool-flux.html', 'mockups/pool-grille.html',
  'mockups/pool-spb.html', 'mockups/pool-spb-flux.html', 'mockups/dashboard.html', 'mockups/url.html', 'components.html',
];
const VIEWPORTS = [['desktop', 1366, 768], ['mobile', 390, 844]];
const THEMES = ['dark', 'light'];
const filter = process.argv[2];

const browser = await chromium.launch();
let problems = 0;
for (const file of PAGES.filter((p) => !filter || p.includes(filter))) {
  for (const [vp, width, height] of VIEWPORTS) {
    for (const theme of THEMES) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('requestfailed', (r) => errors.push(`requête échouée : ${r.url().slice(0, 80)}`));
      page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) errors.push(`ressource externe : ${r.url()}`); });
      await page.goto(`file://${DESIGN}${file}${theme === 'light' ? '?theme=light' : ''}`);
      await page.evaluate(() => document.fonts.ready);

      const report = await page.evaluate(() => {
        const out = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > innerWidth + 1) {
          const wide = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && !el.closest('.table-wrap'); }).slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
          out.push(`débordement horizontal (${doc.scrollWidth}px > ${innerWidth}px) : ${wide.join(', ')}`);
        }
        // Texte qui déborde de sa boîte sans ellipse ni clamp prévus.
        for (const el of document.querySelectorAll('.btn, .usage, .status, .chip, .tile .value, .eyebrow, .legend li, .copy-status, .pg')) {
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis') out.push(`texte tronqué : ${el.className} « ${el.textContent.trim().slice(0, 40)} »`);
        }
        // Chevauchement entre enfants directs des lignes flux et des en-têtes.
        for (const row of [...document.querySelectorAll('.row, .page-head, .card .body, .app-header')].slice(0, 60)) {
          const kids = [...row.children].filter((k) => { const s = getComputedStyle(k); return s.display !== 'none' && s.position !== 'absolute'; }).map((k) => [k, k.getBoundingClientRect()]);
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
            const [a, ra] = kids[i], [b, rb] = kids[j];
            if (ra.width && rb.width && ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1)
              out.push(`chevauchement dans ${row.className} : ${a.className || a.tagName} / ${b.className || b.tagName}`);
          }
        }
        let rows = null;
        const flux = document.querySelector('.flux-wrap .flux');
        if (flux) {
          const first = flux.querySelector('.row');
          const header = document.querySelector('.app-header').getBoundingClientRect().height;
          const top = first.getBoundingClientRect().top + scrollY - header;
          scrollTo(0, top);
          rows = [...flux.querySelectorAll('.row')].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= header - 1 && b.bottom <= innerHeight + 1; }).length;
          scrollTo(0, 0);
        }
        return { out: [...new Set(out)], rows };
      });

      const name = `${file.replace(/^mockups\//, '').replace('.html', '')}--${vp}-${theme}`;
      await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
      if (report.rows != null) {
        // Capture « un écran » de la vue flux, liste remontée sous l'en-tête.
        await page.evaluate(() => { const r = document.querySelector('.flux .row'); scrollTo(0, r.getBoundingClientRect().top + scrollY - document.querySelector('.app-header').getBoundingClientRect().height); });
        await page.screenshot({ path: `${OUT}${name}--ecran.png` });
      }
      const issues = [...report.out, ...errors];
      problems += issues.length;
      console.log(`${issues.length ? '✗' : '✓'} ${name}${report.rows != null ? ` · ${report.rows} liens visibles par écran` : ''}`);
      for (const i of issues) console.log(`    ${i}`);
      await page.close();
    }
  }
}
await browser.close();
console.log(problems ? `\n${problems} problème(s).` : '\nAucun problème détecté.');
process.exit(problems ? 1 : 0);

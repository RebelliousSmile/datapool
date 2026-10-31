// Trois propositions d'interface de recherche, sur le même pool et les mêmes données.
// Usage : node design/tools/proposals.mjs  →  design/proposals/proposition-{a,b,c}.html
import { mkdirSync, writeFileSync } from 'node:fs';
import { LORA, POOLS } from './data.mjs';
import {
  BODY_SCRIPT, DESIGN, HEAD_SCRIPT, MEDIA, SOURCES, SPRITE, USAGE, badge, countBy, esc, favicon, faviconUri, hostOf, icon,
  mediaIcon, mediaLabel, mediaOf, n, sourceLabel, sourceOf, thumbBlock, thumbFile, urlSpan, usageLabel,
} from './lib.mjs';

const OUT = `${DESIGN}proposals/`;
mkdirSync(OUT, { recursive: true });

const POOL = POOLS.find((p) => p.slug === 'lora-foret-textures');
const SCALE = POOL.items / LORA.length;
// Comptes ramenés au volume du pool (plus forts restes), pour des facettes cohérentes avec 412.
function scaled(list) {
  const raw = list.map((x) => ({ ...x, exact: x.v * SCALE }));
  const base = raw.map((x) => ({ ...x, v: Math.floor(x.exact) }));
  let rest = POOL.items - base.reduce((a, x) => a + x.v, 0);
  [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1)).forEach((x) => { if (rest-- > 0) base.find((b) => b.k === x.k).v++; });
  return base;
}
const MEDIA_C = scaled(countBy(LORA, mediaOf, MEDIA));
const SOURCE_C = scaled(countBy(LORA, sourceOf, SOURCES));
const USAGE_C = scaled(countBy(LORA, ([, , u]) => u, USAGE));
const total = (arr) => arr.reduce((a, x) => a + x.v, 0);
const k = (x) => Math.round(x * SCALE);

function page({ title, body, style }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · datapool</title>
${HEAD_SCRIPT}
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../ui.css">
<style>
${style}
</style>
</head>
<body>
${SPRITE}
${body}
${BODY_SCRIPT}
</body>
</html>
`.replace(/src="media\//g, 'src="../mockups/media/');
}

const themeBtn = `<button class="btn btn-ghost btn-sm theme-toggle" type="button" data-theme-toggle aria-pressed="false">${icon('i-sun')}<span class="lbl">Clair</span></button>`;
const brand = `<a class="brand" href="../mockups/pools.html"><span class="brand-mark" aria-hidden="true">dp</span><span>data<b>pool</b></span></a>`;

// =====================================================================
// A — Console à facettes
// =====================================================================
function proposalA() {
  const sel = { media: 'image', usage: 'libre' };
  const hits = LORA.filter((l) => mediaOf(l) === sel.media && l[2] === sel.usage);
  const groups = countBy(hits, sourceOf, SOURCES);
  const facet = (name, items, selected, mark) => `<fieldset class="facet">
    <legend>${name}</legend>
    ${items.map((x) => `<label class="opt${x.k === selected ? ' on' : ''}"><input type="checkbox"${x.k === selected ? ' checked' : ''}>${mark(x)}<span class="lbl">${x.label}</span><span class="cnt">${n(x.v)}</span><span class="pbar" aria-hidden="true"><span style="width:${(x.v / POOL.items) * 100}%"></span></span></label>`).join('\n    ')}
  </fieldset>`;
  const body = `<header class="app-header">${brand}
  <nav class="app-nav"><a href="#">Tableau de bord</a><a href="#" aria-current="page">Pools</a><a href="#">Corpus</a></nav>
  <div class="app-user">${themeBtn}<span class="chip">admin</span></div></header>
<div class="a-layout">
  <aside class="a-side" aria-label="Filtres">
    <label class="a-search">${icon('i-search')}<input class="input" type="search" placeholder="Rechercher dans le pool" value=""></label>
    ${facet('Type de média', MEDIA_C.map((x) => ({ ...x, label: mediaLabel(x.k) })), sel.media, (x) => icon(mediaIcon(x.k), 'sm'))}
    ${facet('Source', SOURCE_C.map((x) => ({ ...x, label: sourceLabel(x.k) })), null, () => '')}
    <div class="sub-opts"><span class="muted">Banques d’images :</span> polyhaven.com 37 · ambientcg.com 31 · flickr.com 58 · pexels.com 22 <a href="#">+2</a></div>
    ${facet('Usage commercial', USAGE_C.map((x) => ({ ...x, label: usageLabel(x.k) })), sel.usage, (x) => `<span class="u-mark" data-usage="${x.k}"></span>`)}
    <button class="btn btn-ghost btn-sm" type="button">Réinitialiser les filtres</button>
  </aside>
  <main class="a-main">
    <div class="crumbs"><a href="#">pools</a><span class="sep">/</span><span>${POOL.slug}</span></div>
    <h1>${esc(POOL.label)}</h1>
    <div class="meta"><span>${n(POOL.items)} liens</span><span>matérialisé ${POOL.ago}</span></div>
    <div class="a-active">
      <span class="chip-f">${icon('i-image', 'sm')}Images<button aria-label="Retirer le filtre Images">${icon('i-close', 'sm')}</button></span>
      <span class="chip-f"><span class="u-mark" data-usage="libre"></span>Libre<button aria-label="Retirer le filtre Libre">${icon('i-close', 'sm')}</button></span>
      <a href="#" class="clear">Tout effacer</a>
    </div>
    <div class="a-bar">
      <strong class="a-count">${n(k(hits.length))} liens <span class="muted">sur ${n(POOL.items)}</span></strong>
      <label class="a-group">Grouper par <select class="input"><option>Source</option><option>Type</option><option>Usage</option><option>Domaine</option><option>Aucun</option></select></label>
      ${copyLite(k(hits.length), 'filtrés')}
    </div>
    ${groups.map((g) => `<section class="a-groupbox">
      <h2 class="a-gh">${sourceLabel(g.k)} <span class="cnt">${n(k(g.v))}</span><button class="btn btn-ghost btn-sm">${icon('i-copy', 'sm')}Copier ce groupe</button></h2>
      <ol class="flux">${hits.filter((l) => sourceOf(l) === g.k).map((l) => `<li class="row">${row(l, LORA.indexOf(l) + 1)}</li>`).join('')}</ol>
    </section>`).join('\n')}
  </main>
</div>`;
  const style = `
.a-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: calc(100vh - 48px); background: linear-gradient(90deg, var(--surface) 280px, transparent 280px); }
.a-side { position: sticky; top: 48px; align-self: start; max-height: calc(100vh - 48px); overflow: auto; padding: 20px 16px 32px; border-right: 1px solid var(--line); background: var(--surface); display: grid; gap: 20px; }
.a-search { position: relative; display: block; } .a-search .icon { position: absolute; left: 10px; top: 12px; color: var(--muted); } .a-search .input { padding-left: 32px; font-size: 14px; }
.facet { border: 0; margin: 0; padding: 0; display: grid; gap: 2px; }
.facet legend { font: 600 11px/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.opt { position: relative; display: grid; grid-template-columns: 16px 18px 1fr auto; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; font-size: 14px; color: var(--ink-2); cursor: pointer; }
.opt:hover { background: var(--surface-2); } .opt.on { background: var(--accent-soft); color: var(--ink); }
.opt input { margin: 0; accent-color: var(--accent); } .opt .cnt { font: 12px var(--font-mono); color: var(--muted); }
.opt .pbar { position: absolute; left: 34px; right: 8px; bottom: 2px; height: 2px; } .opt .pbar span { display: block; height: 100%; background: var(--line-strong); }
.opt:not(:has(svg)):not(:has(.u-mark)) { grid-template-columns: 16px 1fr auto; }
.sub-opts { margin-top: -12px; padding: 0 8px 0 32px; font-size: 12px; color: var(--ink-2); line-height: 1.6; }
.a-main { padding: 24px 32px 48px; min-width: 0; }
.a-active { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 18px 0 10px; }
.chip-f { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 4px 0 10px; border: 1px solid var(--accent); border-radius: 999px; font-size: 13px; background: var(--accent-soft); }
.chip-f button { display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: var(--ink-2); cursor: pointer; } .chip-f button:hover { background: var(--surface-3); }
.clear { font-size: 13px; }
.a-bar { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); }
.a-count { font: 600 16px var(--font-display); margin-right: auto; }
.a-group { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); } .a-group .input { min-height: 32px; font-size: 13px; width: auto; }
.a-groupbox { margin-top: 20px; }
.a-gh { position: sticky; top: 48px; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 15px; background: var(--bg); }
.a-gh .cnt { font: 12px var(--font-mono); color: var(--muted); } .a-gh .btn { margin-left: auto; }
@media (min-width: 721px) { .flux .row { height: 40px; } } .flux { border-radius: 6px; }
${COMMON_ROW}
@media (max-width: 900px) {
  .a-layout { grid-template-columns: 1fr; } .a-side { position: static; max-height: none; border-right: 0; border-bottom: 1px solid var(--line); grid-template-columns: 1fr; }
  .a-side .facet:not(:first-of-type), .sub-opts { display: none; } .a-main { padding: 16px; }
}`;
  return page({ title: 'Proposition A — facettes', body, style });
}

// =====================================================================
// B — Requête intelligente
// =====================================================================
function proposalB() {
  const hits = LORA.filter((l) => l[2] === 'libre' && mediaOf(l) === 'image');
  const views = [['Tout', POOL.items], ['Images libres', k(hits.length)], ['Textures CC0', 68], ['Vidéos', k(2)], ['Jeux de données', 14]];
  const body = `<header class="b-head">${brand}
  <button class="b-pool" type="button">Pool : <strong>${esc(POOL.label)}</strong>${icon('i-chevron', 'sm')}</button>
  <div class="b-right">${themeBtn}<span class="b-avatar" aria-label="Compte admin-e2e">AE</span></div></header>
<main class="b-main">
  <form class="b-query" role="search" onsubmit="event.preventDefault()">
    <div class="b-field">
      ${icon('i-search')}
      <span class="tok"><span class="k">type</span>image<button aria-label="Retirer">${icon('i-close', 'sm')}</button></span>
      <span class="tok"><span class="k">usage</span>libre<button aria-label="Retirer">${icon('i-close', 'sm')}</button></span>
      <input aria-label="Rechercher dans le pool" value="écorce mousse" aria-expanded="true" aria-controls="sugg">
      <kbd>/</kbd>
    </div>
    <div class="b-sugg" id="sugg" role="listbox">
      <div class="b-sg"><span class="eyebrow">Affiner</span>
        <button role="option">${icon('i-filter', 'sm')}<span class="k">source</span>Banques d’images<span class="cnt">${n(k(9))}</span></button>
        <button role="option">${icon('i-filter', 'sm')}<span class="k">source</span>Archives et musées<span class="cnt">${n(k(3))}</span></button>
        <button role="option">${icon('i-filter', 'sm')}<span class="k">domaine</span>polyhaven.com<span class="cnt">37</span></button>
      </div>
      <div class="b-sg"><span class="eyebrow">Exclure</span>
        <button role="option">${icon('i-close', 'sm')}<span class="k">-type</span>vidéo<span class="cnt">${n(k(2))}</span></button>
      </div>
      <p class="b-help"><span class="mono">type: source: usage: domaine:</span> · préfixe <span class="mono">-</span> pour exclure · <kbd>↑</kbd><kbd>↓</kbd> puis <kbd>Entrée</kbd></p>
    </div>
  </form>

  <div class="b-views" role="tablist" aria-label="Vues enregistrées">
    ${views.map(([v, c], i) => `<button role="tab" aria-selected="${i === 1}">${v}<span class="cnt">${n(c)}</span></button>`).join('')}
    <button class="b-new">${icon('i-bookmark', 'sm')}Enregistrer la vue</button>
  </div>

  <div class="b-bar"><span><strong>${n(k(hits.length))} résultats</strong> <span class="muted">· tri par pertinence</span></span>${copyLite(k(hits.length), 'résultats')}</div>

  <ol class="b-results">
    ${hits.map((l) => {
      const [title, url, usage, kind, desc, thumb] = l;
      return `<li class="b-item">
      <div class="b-thumb">${thumb && thumb !== 'broken' ? `<img src="${thumbFile(thumb)}" alt="" loading="lazy">` : icon(mediaIcon(mediaOf(l)), 'lg')}</div>
      <div class="b-txt">
        <a class="b-title" href="#">${esc(title || url)}</a>
        ${desc ? `<p class="b-desc">${esc(desc)}</p>` : ''}
        <div class="b-meta">${urlSpan(url)}<span class="sep">·</span><span>${sourceLabel(sourceOf(l))}</span>${badge(usage)}</div>
      </div>
    </li>`;
    }).join('\n')}
  </ol>
</main>`;
  const style = `
.b-head { display: flex; align-items: center; gap: 16px; padding: 14px 28px; }
.b-pool { display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink-2); font: 14px var(--font-body); cursor: pointer; }
.b-pool strong { color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.b-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.b-avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font: 600 12px var(--font-mono); border: 1px solid var(--accent); }
.b-main { max-width: 860px; margin: 0 auto; padding: 40px 24px 64px; }
.b-query { position: relative; }
.b-field { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 60px; padding: 10px 16px; background: var(--surface); border: 1px solid var(--accent); border-radius: 14px; box-shadow: var(--glow-accent); }
.b-field > .icon { color: var(--accent); width: 20px; height: 20px; }
.b-field input { flex: 1; min-width: 140px; border: 0; background: transparent; color: var(--ink); font: 18px var(--font-body); outline: none; }
.tok { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 4px 0 10px; border-radius: 8px; background: var(--surface-3); font-size: 14px; }
.tok .k, .b-sugg .k { font: 600 12px var(--font-mono); color: var(--accent); }
.tok button { display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: 6px; background: transparent; color: var(--ink-2); cursor: pointer; }
kbd { font: 11px var(--font-mono); padding: 2px 6px; border: 1px solid var(--line-strong); border-radius: 4px; color: var(--muted); }
.b-sugg { position: absolute; left: 0; right: 0; top: calc(100% + 8px); z-index: 5; padding: 10px; background: var(--surface); border-radius: 12px; box-shadow: var(--shadow-menu); display: grid; gap: 6px; }
.b-sg { display: grid; gap: 2px; } .b-sg .eyebrow { padding: 6px 10px 4px; }
.b-sg button { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--ink); font: 14px var(--font-body); text-align: left; cursor: pointer; }
.b-sg button:first-of-type { background: var(--surface-2); }
.b-sg .cnt { margin-left: auto; font: 12px var(--font-mono); color: var(--muted); }
.b-help { margin: 4px 10px 2px; font-size: 12px; color: var(--muted); }
.b-views { display: flex; gap: 6px; overflow-x: auto; margin: 268px 0 0; padding-bottom: 4px; scrollbar-width: none; }
.b-views button { flex: none; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: transparent; color: var(--ink-2); font: 14px var(--font-body); cursor: pointer; }
.b-views [aria-selected='true'] { border-color: var(--accent); color: var(--ink); background: var(--accent-soft); }
.b-views .cnt { font: 12px var(--font-mono); color: var(--muted); } .b-new { border-style: dashed !important; }
.b-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 28px 0 8px; }
.b-results { list-style: none; margin: 0; padding: 0; }
.b-item { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 18px; padding: 18px 0; border-bottom: 1px solid var(--line); }
.b-thumb { width: 112px; aspect-ratio: 16/10; border-radius: 8px; overflow: hidden; background: var(--thumb-bg); display: grid; place-items: center; color: var(--thumb-ink); }
.b-thumb img { width: 100%; height: 100%; object-fit: cover; }
.b-title { font: 600 17px/1.35 var(--font-body); color: var(--ink); text-decoration: none; } .b-title:hover { color: var(--accent); }
.b-desc { margin: 4px 0 0; color: var(--ink-2); font-size: 14px; }
.b-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 8px; font-size: 13px; color: var(--ink-2); }
.b-meta .url { max-width: 340px; } .b-meta .sep { color: var(--muted); }
@media (max-width: 720px) {
  .b-head { padding: 10px 14px; gap: 10px; } .b-head .brand span:last-child { display: none; } .b-pool { font-size: 13px; }
  .b-main { padding: 20px 14px 48px; } .b-field input { font-size: 16px; } .b-views { margin-top: 300px; }
  .b-item { grid-template-columns: 76px minmax(0, 1fr); gap: 12px; } .b-thumb { width: 76px; } .b-title { font-size: 15px; } .b-desc { display: none; }
}`;
  return page({ title: 'Proposition B — requête', body, style });
}

// =====================================================================
// C — Segments et aperçu
// =====================================================================
function proposalC() {
  const segs = countBy(LORA, mediaOf, MEDIA);
  const sel = 'image';
  const items = LORA.filter((l) => mediaOf(l) === sel);
  const preview = LORA[0];
  const pill = (label, value, on) => `<button class="c-pill${on ? ' on' : ''}" type="button" aria-haspopup="listbox">${label}${value ? `<span class="v">${value}</span>` : ''}${icon('i-chevron', 'sm')}</button>`;
  const body = `<header class="app-header">${brand}
  <nav class="app-nav"><a href="#">Tableau de bord</a><a href="#" aria-current="page">Pools</a><a href="#">Corpus</a></nav>
  <div class="app-user">${themeBtn}<span class="chip">admin</span></div></header>
<main class="c-main">
  <div class="c-top">
    <div><div class="crumbs"><a href="#">pools</a><span class="sep">/</span><span>${POOL.slug}</span></div><h1>${esc(POOL.label)}</h1>
    <div class="meta"><span>${n(POOL.items)} liens</span><span>${POOL.ago}</span></div></div>
    ${copyLite(POOL.items, 'du pool')}
  </div>
  <div class="c-filters">
    <label class="c-search">${icon('i-search', 'sm')}<input type="search" placeholder="Rechercher…" aria-label="Rechercher dans le pool"></label>
    ${pill('Type', '', false)}${pill('Source', '', false)}${pill('Usage', 'Libre, Sous cond.', true)}${pill('Domaine', '', false)}
    <span class="c-segby">Segmenter par <span class="seg" role="group"><button aria-pressed="true">Type</button><button aria-pressed="false">Source</button><button aria-pressed="false">Usage</button></span></span>
  </div>
  <ul class="c-segs">
    ${segs.map((s) => {
      const ls = LORA.filter((l) => mediaOf(l) === s.k);
      const thumbs = ls.filter((l) => l[5] && l[5] !== 'broken').slice(0, 3);
      const u = countBy(ls, ([, , x]) => x, USAGE);
      return `<li class="c-seg${s.k === sel ? ' on' : ''}"><button type="button" aria-pressed="${s.k === sel}">
        <span class="c-sh">${icon(mediaIcon(s.k))}<span>${mediaLabel(s.k)}</span><span class="cnt">${n(k(s.v))}</span></span>
        <span class="c-strip">${thumbs.length ? thumbs.map((l) => `<img src="${thumbFile(l[5])}" alt="">`).join('') : ls.slice(0, 3).map((l) => `<span class="ph">${favicon(l[1], l[3])}</span>`).join('')}</span>
        <span class="stackbar">${u.map((x) => `<span class="seg-u" data-usage="${x.k}" style="flex-grow:${x.v}"></span>`).join('')}</span>
      </button></li>`;
    }).join('\n    ')}
  </ul>
  <div class="c-split">
    <section aria-label="Images">
      <div class="c-sechead"><h2>${icon('i-image')}Images <span class="cnt">${n(k(items.length))}</span></h2><button class="btn btn-sm">${icon('i-copy', 'sm')}Copier ce segment</button></div>
      <ol class="c-grid">${items.map((l) => `<li class="c-tile${l === preview ? ' on' : ''}">${thumbBlock(l, LORA.indexOf(l) + 1)}<span class="c-cap">${esc(l[0] || hostOf(l[1]))}</span></li>`).join('')}</ol>
    </section>
    <aside class="c-preview" aria-label="Aperçu">
      ${thumbBlock(preview, 1)}
      <h3>${esc(preview[0])}</h3>
      <p class="secondary">${esc(preview[4])}</p>
      <div class="url-full">${esc(preview[1])}</div>
      <dl class="kv"><dt>usage</dt><dd>${badge(preview[2])}</dd><dt>source</dt><dd>${sourceLabel(sourceOf(preview))} · ${hostOf(preview[1])}</dd><dt>type</dt><dd>Image · 6000×4000</dd><dt>pools</dt><dd>2 autres pools</dd></dl>
      <div class="c-actions"><a class="btn btn-primary" href="#">${icon('i-arrow', 'sm')}Ouvrir</a><button class="btn">${icon('i-copy', 'sm')}Copier l’URL</button></div>
    </aside>
  </div>
</main>`;
  const style = `
.c-main { max-width: 1440px; margin: 0 auto; padding: 24px 28px 48px; }
.c-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; }
.c-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 22px 0 18px; }
.c-search { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 999px; background: var(--surface); color: var(--muted); }
.c-search input { border: 0; background: transparent; color: var(--ink); font: 14px var(--font-body); outline: none; width: 160px; }
.c-pill { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 999px; background: var(--surface); color: var(--ink); font: 14px var(--font-body); cursor: pointer; }
.c-pill.on { border-color: var(--accent); background: var(--accent-soft); } .c-pill .v { font-weight: 600; }
.c-segby { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); }
.c-segs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.c-seg button { width: 100%; display: grid; gap: 10px; padding: 12px; text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; color: var(--ink); cursor: pointer; font: inherit; }
.c-seg.on button { border-color: var(--accent); box-shadow: var(--glow-accent); }
.c-sh { display: flex; align-items: center; gap: 8px; font: 600 15px var(--font-display); } .c-sh .cnt { margin-left: auto; font: 13px var(--font-mono); color: var(--ink-2); }
.c-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; height: 40px; }
.c-strip > img, .c-strip > .ph { width: 100%; height: 40px; object-fit: cover; border-radius: 4px; background: var(--thumb-bg); display: grid; place-items: center; }
.c-seg .stackbar { height: 4px; gap: 1px; } .c-seg .stackbar .seg-u { border-radius: 0 !important; }
.c-split { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; margin-top: 28px; align-items: start; }
.c-sechead { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.c-sechead h2 { display: flex; align-items: center; gap: 8px; font-size: 18px; } .c-sechead .cnt { font: 13px var(--font-mono); color: var(--muted); }
.c-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.c-tile { border-radius: 8px; overflow: hidden; background: var(--surface); border: 1px solid var(--line); }
.c-tile.on { border-color: var(--accent); box-shadow: var(--glow-accent); }
.c-tile .thumb { border: 0; } .c-cap { display: block; padding: 6px 8px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-preview { position: sticky; top: 64px; display: grid; gap: 12px; padding: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
.c-preview .thumb { border-radius: 8px; border: 0; } .c-preview h3 { font-size: 17px; } .c-preview p { margin: 0; font-size: 14px; }
.c-preview .url-full { padding: 8px 10px; font: 12px var(--font-mono); background: var(--surface-2); border-radius: 6px; overflow-wrap: anywhere; color: var(--ink-2); }
.c-actions { display: flex; gap: 8px; }
@media (max-width: 1000px) { .c-split { grid-template-columns: 1fr; } .c-preview { display: none; } }
@media (max-width: 720px) {
  .c-main { padding: 14px; } .c-segby { margin-left: 0; } .c-search input { width: 110px; }
  .c-segs { grid-auto-flow: column; grid-auto-columns: 62%; grid-template-columns: none; overflow-x: auto; padding-bottom: 6px; }
  .c-grid { grid-template-columns: repeat(2, 1fr); }
}`;
  return page({ title: 'Proposition C — segments', body, style });
}

// ---------------------------------------------------------------- partagé
const COMMON_ROW = `@media (min-width: 961px) { .row { grid-template-columns: 3rem 18px minmax(0, 1.2fr) minmax(0, 1fr) 9.25rem; } }`;
function row(l, rank) {
  const [title, url, usage, kind] = l;
  return `<span class="rank">${rank}</span>${favicon(url, kind)}<a class="title" href="#">${esc(title || url)}</a>${urlSpan(url)}${badge(usage)}`;
}
function copyLite(count, what) {
  return `<div class="copy" data-copy data-count="${count}" data-format="txt">
  <div class="copy-split"><button class="btn btn-primary" type="button" data-copy-main>${icon('i-copy')}Copier les <span class="count">${n(count)}</span> liens ${what}</button><button class="btn btn-primary" type="button" data-copy-toggle aria-haspopup="menu" aria-expanded="false" aria-label="Format de copie"><span class="fmt">URLs</span>${icon('i-chevron', 'sm')}</button></div>
  <div class="menu" role="menu" hidden>${['URLs seules', 'Markdown', 'CSV'].map((t, i) => `<button class="menu-item" role="menuitemradio" data-fmt="${['txt', 'md', 'csv'][i]}" aria-checked="${i === 0}"><span class="radio"></span><b>${t}</b></button>`).join('')}</div>
  <span class="copy-status" role="status" hidden></span>
</div>`;
}

writeFileSync(`${OUT}proposition-a.html`, proposalA());
writeFileSync(`${OUT}proposition-b.html`, proposalB());
writeFileSync(`${OUT}proposition-c.html`, proposalC());
console.log('3 propositions');

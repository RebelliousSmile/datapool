// Génère les maquettes statiques de design/ à partir des données d'exemple.
// Usage : node design/tools/build.mjs
// Sorties : design/mockups/*.html, design/mockups/media/*.svg, design/components.html
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LORA, LORA_DOMAINS, POOLS, PSY_DOMAINS, PSYCHO, RUNS, SPB, SPB_DOMAINS, LONG_TITLE } from './data.mjs';
import { faviconUri, thumbSvg } from './thumbs.mjs';

const DESIGN = fileURLToPath(new URL('..', import.meta.url));
const MOCKUPS = `${DESIGN}mockups/`;
mkdirSync(`${MOCKUPS}media`, { recursive: true });

// ---------------------------------------------------------------- utilitaires
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = new Intl.NumberFormat('fr-FR');
const n = (x) => nf.format(x).replace(/ /g, ' ');

const USAGE = [
  ['libre', 'Libre'], ['sous-conditions', 'Sous conditions'], ['payant', 'Payant'], ['non-commercial', 'Non commercial'], ['a-qualifier', 'À qualifier'],
];
const usageLabel = (k) => USAGE.find(([key]) => key === k)[1];
const KIND_LABEL = { page: 'Page', image: 'Image', video: 'Vidéo', pdf: 'PDF' };
const KIND_ICON = { page: 'i-page', image: 'i-image', video: 'i-video', pdf: 'i-pdf' };
// Domaines dont webpool n'a pas de favicon en cache : repli sur le pictogramme du type.
const NO_FAV = new Set(['researchgate.net', 'cairn.info', 'spb.ru', 'kunstkamera.ru', 'santepubliquefrance.fr', 'annualreviews.org', 'textures.com', 'culture.ru']);

const icon = (id, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const hostOf = (url) => new URL(url).hostname.replace(/^www\./, '');

function urlParts(url) {
  const m = url.match(/^(https?:\/\/)([^/?#]+)(.*)$/);
  return `<span class="scheme">${esc(m[1])}</span><span class="host">${esc(m[2])}</span>${esc(m[3])}`;
}
const urlSpan = (url, cls = 'url') => `<span class="${cls}" title="${esc(url)}">${urlParts(url)}</span>`;
const badge = (k) => `<span class="usage" data-usage="${k}"><span class="u-mark" aria-hidden="true"></span>${usageLabel(k)}</span>`;

function favicon(url, kind) {
  const host = hostOf(url);
  if (NO_FAV.has(host)) return `<span class="fav" title="${KIND_LABEL[kind]}">${icon(KIND_ICON[kind])}</span>`;
  return `<span class="fav"><img src="${faviconUri(host)}" alt="" width="16" height="16"></span>`;
}

// Écrit les vignettes SVG utilisées (figurent le cache de l'API webpool).
const written = new Set();
function thumbFile(name) {
  if (!written.has(name)) {
    writeFileSync(`${MOCKUPS}media/${name}.svg`, thumbSvg(name));
    written.add(name);
  }
  return `media/${name}.svg`;
}

// ---------------------------------------------------------------- pictogrammes
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-page" viewBox="0 0 16 16"><path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M6 8h5M6 10.5h5M6 13h3"/></symbol>
<symbol id="i-image" viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1"/><circle cx="5.5" cy="6" r="1.3"/><path d="M1.5 12l4-4 3 3 2-2 4 4"/></symbol>
<symbol id="i-video" viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="10" rx="1"/><path d="M6.5 5.8v4.4L10.3 8z"/></symbol>
<symbol id="i-pdf" viewBox="0 0 16 16"><path d="M3 1.5h6.5L13 5v9.5H3z"/><path d="M9.5 1.5V5H13"/><path d="M5 9h1.3a1 1 0 0 1 0 2H5V8m3.5 3V8h.8a1.5 1.5 0 0 1 0 3zm3-3h-1.2v3m0-1.5h1"/></symbol>
<symbol id="i-copy" viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V2.5a1 1 0 0 0-1-1H2.5a1 1 0 0 0-1 1V10a1 1 0 0 0 1 1H5"/></symbol>
<symbol id="i-chevron" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></symbol>
<symbol id="i-check" viewBox="0 0 16 16"><path d="M2.5 8.5l3.5 3.5 7.5-8"/></symbol>
<symbol id="i-alert" viewBox="0 0 16 16"><path d="M8 1.8l6.5 12H1.5z"/><path d="M8 6.5v3.2M8 11.6v.1"/></symbol>
<symbol id="i-x" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5"/><path d="M5.7 5.7l4.6 4.6M10.3 5.7l-4.6 4.6"/></symbol>
<symbol id="i-list" viewBox="0 0 16 16"><path d="M1.5 3.5h13M1.5 6.5h13M1.5 9.5h13M1.5 12.5h13"/></symbol>
<symbol id="i-grid" viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="5.5" height="5.5"/><rect x="9" y="1.5" width="5.5" height="5.5"/><rect x="1.5" y="9" width="5.5" height="5.5"/><rect x="9" y="9" width="5.5" height="5.5"/></symbol>
<symbol id="i-sun" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"/></symbol>
<symbol id="i-moon" viewBox="0 0 16 16"><path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 16 16"><path d="M5 11l6-6M6 5h5v5"/></symbol>
<symbol id="i-broken" viewBox="0 0 16 16"><path d="M1.5 3h6l-1 3 2 2-1 5h-6zM10 3h4.5v10H9l1-3.5-2-2z"/></symbol>
<symbol id="i-play" viewBox="0 0 16 16"><path d="M4 2.5v11L13.5 8z"/></symbol>
<symbol id="i-plug" viewBox="0 0 16 16"><path d="M5.5 1.5v3M10.5 1.5v3M3.5 4.5h9v3a4.5 4.5 0 0 1-9 0zM8 12v2.5"/></symbol>
<symbol id="i-search" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l4 4"/></symbol>
<symbol id="i-download" viewBox="0 0 16 16"><path d="M8 1.5v9M4.5 7L8 10.5 11.5 7M2 14h12"/></symbol>
<symbol id="i-run" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" stroke-dasharray="3 2"/><path d="M8 4.5V8l2.5 1.5"/></symbol>
</svg>`;

// ---------------------------------------------------------------- scripts des maquettes
const HEAD_SCRIPT = `<script>(function(){var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('dp-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();</script>`;

const BODY_SCRIPT = `<script>
(function () {
  // Bascule de thème (mémorisée).
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    var sync = function () { var l = document.documentElement.getAttribute('data-theme') === 'light'; b.setAttribute('aria-pressed', String(l)); b.querySelector('.lbl').textContent = l ? 'Sombre' : 'Clair'; };
    sync();
    b.addEventListener('click', function () {
      var l = document.documentElement.getAttribute('data-theme') === 'light';
      if (l) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('dp-theme', l ? 'dark' : 'light'); sync();
    });
  });

  // Copier les N liens : menu de format + confirmation (démonstration).
  var FMT = { txt: 'URLs', md: 'Markdown', csv: 'CSV' };
  document.querySelectorAll('[data-copy]').forEach(function (root) {
    var count = Number(root.getAttribute('data-count'));
    var main = root.querySelector('[data-copy-main]'), toggle = root.querySelector('[data-copy-toggle]');
    var menu = root.querySelector('.menu'), status = root.querySelector('.copy-status');
    var fmt = root.getAttribute('data-format') || 'txt';
    var nf = new Intl.NumberFormat('fr-FR');
    function close() { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    function show(cls, html) { status.className = 'copy-status ' + cls; status.innerHTML = html; status.hidden = false; }
    toggle.addEventListener('click', function () {
      var open = menu.hidden; menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
      if (open) (menu.querySelector('[aria-checked="true"]') || menu.querySelector('[role=menuitemradio]')).focus();
    });
    menu.querySelectorAll('[role=menuitemradio]').forEach(function (item) {
      item.addEventListener('click', function () {
        menu.querySelectorAll('[role=menuitemradio]').forEach(function (i) { i.setAttribute('aria-checked', String(i === item)); });
        fmt = item.getAttribute('data-fmt'); toggle.querySelector('.fmt').textContent = FMT[fmt]; close(); toggle.focus();
      });
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); toggle.focus(); } });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) close(); });
    main.addEventListener('click', function () {
      show('busy', '<svg class="icon sm" aria-hidden="true"><use href="#i-run"/></svg>Préparation de ' + nf.format(count) + ' liens…');
      setTimeout(function () {
        var text = 'https://exemple.org/1\\nhttps://exemple.org/2';
        var done = function () { show('ok', '<svg class="icon sm" aria-hidden="true"><use href="#i-check"/></svg>' + nf.format(count) + ' liens copiés · ' + FMT[fmt]); };
        var fail = function () { show('err', '<svg class="icon sm" aria-hidden="true"><use href="#i-alert"/></svg><span>Copie refusée par le navigateur — <a href="#">télécharger le fichier</a></span>'); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fail); else done();
      }, 450);
    });
  });

  // Bascules segmentées de démonstration (components.html).
  document.querySelectorAll('.seg[data-demo] button').forEach(function (b) {
    b.addEventListener('click', function () { b.parentElement.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
  });
})();
</script>`;

// ---------------------------------------------------------------- coquille
function shell({ title, active, body, root = '../', admin = true, bare = false }) {
  const nav = [
    ['dashboard.html', 'Tableau de bord', 'dashboard', true],
    ['pools.html', 'Pools', 'pools', false],
    ['#', 'Corpus', 'corpus', true],
    ['#', 'Domaines', 'domains', true],
  ].filter((l) => admin || !l[3]);
  const header = bare ? '' : `<header class="app-header">
  <a class="brand" href="pools.html" aria-label="datapool, accueil">${'<span class="brand-mark" aria-hidden="true">dp</span>'}<span>data<b>pool</b></span></a>
  <nav class="app-nav" aria-label="Navigation principale">
    ${nav.map(([href, label, key]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('\n    ')}
  </nav>
  <div class="app-user">
    <span class="link-status">liaison ok</span>
    <span class="who">admin-e2e <span class="chip">${admin ? 'admin' : 'read'}</span></span>
    <button class="btn btn-ghost btn-sm theme-toggle" type="button" data-theme-toggle aria-pressed="false">${icon('i-sun')}<span class="lbl">Clair</span></button>
    <button class="btn btn-sm" type="button">Déconnexion</button>
  </div>
</header>`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · datapool</title>
${HEAD_SCRIPT}
<link rel="stylesheet" href="${root}tokens.css">
<link rel="stylesheet" href="${root}ui.css">
</head>
<body>
${SPRITE}
${header}
${body}
${BODY_SCRIPT}
</body>
</html>
`;
}

// ---------------------------------------------------------------- composants
function copyWidget(count, { id = 'copy', format = 'txt', menuOpen = false, status = null } = {}) {
  const fmts = [
    ['txt', 'URLs seules', 'https://osf.io/m8fpz/', true],
    ['md', 'Markdown', '- [Titre](https://osf.io/m8fpz/)', false],
    ['csv', 'CSV', 'rank,title,url,domain,usage', false],
  ];
  const label = { txt: 'URLs', md: 'Markdown', csv: 'CSV' }[format];
  const statusHtml = status === 'ok' ? `<span class="copy-status ok" role="status">${icon('i-check', 'sm')}${n(count)} liens copiés · ${label}</span>`
    : status === 'err' ? `<span class="copy-status err" role="status">${icon('i-alert', 'sm')}<span>Copie refusée par le navigateur — <a href="#">télécharger le fichier</a></span></span>`
    : status === 'busy' ? `<span class="copy-status busy" role="status">${icon('i-run', 'sm')}Préparation de ${n(count)} liens…</span>`
    : `<span class="copy-status" role="status" hidden></span>`;
  return `<div class="copy" data-copy data-count="${count}" data-format="${format}">
  <div class="copy-split">
    <button class="btn btn-primary" type="button" data-copy-main${status === 'busy' ? ' aria-busy="true"' : ''}>${icon('i-copy')}Copier les <span class="count">${n(count)}</span> liens</button>
    <button class="btn btn-primary" type="button" data-copy-toggle aria-haspopup="menu" aria-expanded="${menuOpen}" aria-controls="${id}-menu" aria-label="Format de copie : ${label}"><span class="fmt">${label}</span>${icon('i-chevron', 'sm')}</button>
  </div>
  <div class="menu" id="${id}-menu" role="menu" aria-label="Format de copie"${menuOpen ? '' : ' hidden'}>
    <div class="menu-label eyebrow">Format du presse-papiers</div>
    ${fmts.map(([k, t, sample, def]) => `<button class="menu-item" type="button" role="menuitemradio" data-fmt="${k}" aria-checked="${k === format}"><span class="radio" aria-hidden="true"></span><b>${t}${def ? '<span class="default">par défaut</span>' : ''}</b><span class="sample">${esc(sample)}</span></button>`).join('\n    ')}
  </div>
  ${statusHtml}
</div>`;
}

function viewToggle(current, fluxHref = '#', gridHref = '#') {
  return `<div class="seg" role="group" aria-label="Affichage des liens">
  <a href="${fluxHref}"${current === 'flux' ? ' aria-current="page"' : ''}>${icon('i-list', 'sm')}Flux</a>
  <a href="${gridHref}"${current === 'grille' ? ' aria-current="page"' : ''}>${icon('i-grid', 'sm')}Grille</a>
</div>`;
}

function fluxRow([title, url, usage, kind], rank, { admin = false } = {}) {
  const t = title
    ? `<a class="title" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">${kind === 'video' || kind === 'pdf' ? `<span class="kind" title="${KIND_LABEL[kind]}">${icon(KIND_ICON[kind], 'sm')}<span class="sr-only">${KIND_LABEL[kind]} : </span></span>` : ''}${esc(title)}</a>`
    : `<a class="title untitled" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Sans titre : ${esc(url)}">${esc(url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
  return `<li class="row">
  <span class="rank">${rank}</span>
  ${favicon(url, kind)}
  ${t}
  ${urlSpan(url)}
  ${badge(usage)}
</li>`;
}

function thumbBlock([title, url, usage, kind, desc, thumb], rank) {
  const tags = `<span class="rank-tag">#${rank}</span>${kind !== 'page' ? `<span class="kind-tag">${icon(KIND_ICON[kind], 'sm')}${KIND_LABEL[kind]}</span>` : ''}`;
  if (thumb === 'broken') {
    return `<div class="thumb fallback broken">${tags}${icon('i-broken', 'lg')}<span class="why">Vignette indisponible</span><span class="host">${esc(hostOf(url))}</span></div>`;
  }
  if (!thumb) {
    const host = hostOf(url);
    const big = NO_FAV.has(host) ? icon(KIND_ICON[kind], 'lg') : `<img class="big-fav" src="${faviconUri(host)}" alt="" width="44" height="44">`;
    return `<div class="thumb fallback">${tags}${big}<span class="host">${esc(host)}</span><span class="why">Pas de vignette</span></div>`;
  }
  return `<div class="thumb">${tags}<img src="${thumbFile(thumb)}" alt="" loading="lazy" width="320" height="200">${kind === 'video' ? `<span class="play" aria-hidden="true">${icon('i-play')}</span>` : ''}</div>`;
}

function gridCard(link, rank) {
  const [title, url, usage, kind, desc] = link;
  const t = title
    ? `<a class="title" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">${esc(title)}</a>`
    : `<a class="title untitled" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Sans titre">${esc(url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
  return `<li class="card">
  ${thumbBlock(link, rank)}
  <div class="body">
    ${t}
    ${desc ? `<p class="desc">${esc(desc)}</p>` : `<p class="desc empty">Aucune description.</p>`}
    ${urlSpan(url)}
    <div class="foot">${badge(usage)}</div>
  </div>
</li>`;
}

function usageSummary(usage, unit = 'liens') {
  const total = Object.values(usage).reduce((a, b) => a + b, 0);
  const segs = USAGE.filter(([k]) => usage[k]).map(([k, label]) => ({ k, label, v: usage[k], p: Math.round((usage[k] / total) * 100) }));
  return `<div class="stackbar" role="img" aria-label="${segs.map((s) => `${s.label} : ${s.v}`).join(', ')}">
  ${segs.map((s) => `<span class="seg-u" data-usage="${s.k}" style="flex-grow:${s.v}" title="${s.label} : ${n(s.v)} ${unit} (${s.p} %)"></span>`).join('')}
</div>
<ul class="legend">
  ${segs.map((s) => `<li><span class="u-mark" data-usage="${s.k}" aria-hidden="true"></span><span class="name">${s.label}</span><strong>${n(s.v)}</strong><span class="pct">${s.p}%</span></li>`).join('\n  ')}
</ul>`;
}

function barList(rows) {
  const max = Math.max(...rows.map((r) => r[1]));
  return `<ul class="barlist">
  ${rows.map(([name, v]) => `<li title="${esc(name)} : ${v} liens"><span class="name">${esc(name)}</span><span class="track"><span class="fill" style="width:${((v / max) * 100).toFixed(1)}%"></span></span><span class="val">${v}</span></li>`).join('\n  ')}
</ul>`;
}

function pager(total, perPage, page) {
  const pages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1, to = Math.min(page * perPage, total);
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const items = [];
  items.push(page === 1 ? `<li><span class="pg" aria-disabled="true">‹<span class="sr-only"> Précédent</span></span></li>` : `<li><a class="pg" href="#" rel="prev">‹<span class="sr-only"> Précédent</span></a></li>`);
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) items.push(`<li><span class="pg gap" aria-hidden="true">…</span></li>`);
    items.push(p === page ? `<li><span class="pg" aria-current="page">${p}</span></li>` : `<li><a class="pg" href="#" aria-label="Page ${p}">${p}</a></li>`);
  });
  items.push(page === pages ? `<li><span class="pg" aria-disabled="true">›<span class="sr-only"> Suivant</span></span></li>` : `<li><a class="pg" href="#" rel="next">›<span class="sr-only"> Suivant</span></a></li>`);
  return `<nav class="pager" aria-label="Pagination">
  <span class="range">${n(from)}–${n(to)} sur ${n(total)}</span>
  <ol>${items.join('')}</ol>
</nav>`;
}

function tile({ label, value, sub = '', href = null, cls = '', bar = null }) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="tile ${cls}"${href ? ` href="${href}"` : ''}>
  <span class="eyebrow">${cls.includes('alert') ? icon('i-alert', 'sm') : ''}${label}</span>
  <span class="value">${value}</span>
  ${sub ? `<span class="sub">${sub}</span>` : ''}
  ${bar != null ? `<span class="bar" aria-hidden="true"><span style="width:${bar}%"></span></span>` : ''}
  ${href ? `<span class="go" aria-hidden="true">${icon('i-arrow', 'sm')}</span>` : ''}
</${tag}>`;
}

// ---------------------------------------------------------------- pages
function poolPage({ pool, links, domains, view, perPage, file, other }) {
  const list = view === 'flux'
    ? `<div class="flux-wrap">
  <div class="flux-head" aria-hidden="true"><span class="eyebrow">Rang</span><span></span><span class="eyebrow">Titre</span><span class="eyebrow h-url">URL</span><span class="eyebrow">Usage</span></div>
  <ol class="flux" aria-label="Liens du pool, par rang">
${links.map((l, i) => fluxRow(l, i + 1)).join('\n')}
  </ol>
</div>`
    : `<ol class="cards" aria-label="Liens du pool, par rang">
${links.map((l, i) => gridCard(l, i + 1)).join('\n')}
</ol>`;
  const body = `<main class="page" id="main">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="pools.html">pools</a><span class="sep">/</span><span>${pool.slug}</span></nav>
  <div class="page-head">
    <div class="titles">
      <h1>${esc(pool.label)}</h1>
      <div class="meta">
        <code>${pool.slug}</code>
        <span>${n(pool.items)} liens</span>
        <span>matérialisé le ${pool.refreshed}</span>
        <span class="${pool.fresh ? 'fresh-ok' : 'fresh-old'}">${pool.fresh ? '● frais' : '◐ à rafraîchir'} · ${pool.ago}</span>
      </div>
    </div>
    <div class="actions">
      ${copyWidget(pool.items)}
      ${viewToggle(view, view === 'flux' ? '#' : other, view === 'grille' ? '#' : other)}
    </div>
  </div>

  <div class="cols">
    <section class="panel" aria-labelledby="usage-h">
      <div class="panel-head"><h2 id="usage-h">Usage commercial</h2><span class="eyebrow">${n(pool.items)} liens</span></div>
      ${usageSummary(pool.usage)}
    </section>
    <section class="panel" aria-labelledby="dom-h">
      <div class="panel-head"><h2 id="dom-h">Domaines les plus présents</h2><span class="eyebrow">top 8</span></div>
      ${barList(domains)}
    </section>
  </div>

  <div class="list-toolbar">
    <div class="section-title" style="margin:0;flex:1"><h2>Liens</h2><span class="range">${n(1)}–${n(Math.min(perPage, pool.items))} sur ${n(pool.items)} · par rang</span></div>
    <label class="sr-only" for="filter">Filtrer les liens de la page</label>
    <input class="input filter-input" id="filter" type="search" placeholder="Filtrer cette page…">
  </div>
  ${list}
  ${pager(pool.items, perPage, 1)}
</main>`;
  return shell({ title: pool.label, active: 'pools', body });
}

function poolsPage() {
  const rows = POOLS.map((p) => {
    const total = Object.values(p.usage).reduce((a, b) => a + b, 0);
    const mini = total ? `<div class="stackbar" role="img" aria-label="Usage : ${USAGE.filter(([k]) => p.usage[k]).map(([k, l]) => `${l} ${p.usage[k]}`).join(', ')}">${USAGE.filter(([k]) => p.usage[k]).map(([k]) => `<span class="seg-u" data-usage="${k}" style="flex-grow:${p.usage[k]}"></span>`).join('')}</div>` : '<span class="muted mono">—</span>';
    const href = p.slug === 'psychologie-2025' ? 'pool-flux.html' : p.slug === 'lora-foret-textures' ? 'pool-grille.html' : p.slug === 'saint-petersbourg-insolite' ? 'pool-spb.html' : '#';
    return `<tr>
      <td class="name"><a href="${href}">${esc(p.label)}</a></td>
      <td class="slug mono secondary">${p.slug}</td>
      <td class="num">${p.items ? n(p.items) : '<span class="muted">0</span>'}</td>
      <td class="mini">${mini}</td>
      <td class="nowrap">${p.refreshed ? `<span class="mono">${p.refreshed}</span> <span class="${p.fresh ? 'muted' : 'secondary'} hide-sm">· ${p.ago}</span>` : '<span class="status idle">jamais</span>'}</td>
    </tr>`;
  }).join('\n');
  const body = `<main class="page" id="main">
  <div class="page-head">
    <div class="titles">
      <h1>Pools</h1>
      <div class="meta"><span>${POOLS.length} pools accessibles</span><span>${n(POOLS.reduce((a, p) => a + p.items, 0))} liens</span><span>usage : couleur + forme, détail au survol</span></div>
    </div>
    <div class="actions">
      <label class="sr-only" for="q">Rechercher un pool</label>
      <input class="input filter-input" id="q" type="search" placeholder="Rechercher un pool…">
    </div>
  </div>
  <div class="panel flush table-wrap pool-list">
    <table class="table">
      <thead><tr><th>Pool</th><th class="h-slug">Slug</th><th class="num">Liens</th><th class="h-mini">Usage</th><th>Matérialisé</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
  <ul class="legend" aria-label="Légende des usages" style="margin-top:12px">
    ${USAGE.map(([k, l]) => `<li><span class="u-mark" data-usage="${k}" aria-hidden="true"></span><span class="name">${l}</span></li>`).join('')}
  </ul>
</main>`;
  return shell({ title: 'Pools', active: 'pools', body });
}

function loginPage({ error = false } = {}) {
  const body = `<main class="jack" id="main">
  <form class="panel jack-panel" onsubmit="event.preventDefault()">
    <p class="terminal-line">&gt; datapool v0.1 · terminal d'accès au pool<br>&gt; <span class="ok">canal chiffré</span> · aucune ressource tierce chargée</p>
    <h1 class="jack-title" style="margin:16px 0 4px">data<b>pool</b></h1>
    <p class="secondary" style="margin:0 0 20px">Branchez-vous sur l'API webpool. Le jeton se crée avec <code>webpool client add</code>.</p>
    <div style="display:grid;gap:14px">
      <label class="field"><span>URL de l'API</span><input class="input" type="url" required value="https://api.webpool.example/api/v1" autocomplete="url"></label>
      <label class="field"><span>Jeton</span><input class="input" type="password" required value="wp_live_••••••••••••" autocomplete="off"${error ? ' aria-invalid="true" aria-describedby="err"' : ''}><small>Gardé dans ce navigateur uniquement.</small></label>
      ${error ? `<p class="alert-box err" role="alert" id="err">${icon('i-x')}<span>Jeton refusé (401). Vérifiez qu'il n'a pas été révoqué.</span></p>` : ''}
      <button class="btn btn-primary" style="min-height:44px;font-size:15px">${icon('i-plug')}Jack in<span class="sr-only"> (se connecter)</span></button>
    </div>
    <p class="terminal-line" style="margin-top:18px">&gt; en attente du jeton<span class="caret" aria-hidden="true"></span></p>
    <div style="position:absolute;top:12px;right:12px"><button class="btn btn-ghost btn-sm theme-toggle" type="button" data-theme-toggle aria-pressed="false">${icon('i-sun')}<span class="lbl">Clair</span></button></div>
  </form>
</main>`;
  return shell({ title: 'Connexion', body, bare: true });
}

function dashboardPage() {
  const runs = RUNS.map(([id, kind, status, start, dur, detail]) => {
    const st = { ok: `<span class="status ok">${icon('i-check', 'sm')}ok</span>`, failed: `<span class="status failed">${icon('i-x', 'sm')}échec</span>`, running: `<span class="status running">${icon('i-run', 'sm')}en cours</span>`, warn: `<span class="status warn">${icon('i-alert', 'sm')}alerte</span>` }[status];
    return `<tr${status === 'failed' ? ' class="failed"' : ''}><td class="mono">${id}</td><td class="mono">${kind}</td><td>${st}</td><td class="mono nowrap hide-sm">${start}</td><td class="num">${dur}</td><td class="detail${status === 'failed' ? ' err' : ''}" title="${esc(detail)}">${esc(detail)}</td></tr>`;
  }).join('\n');
  const body = `<main class="page" id="main">
  <div class="page-head">
    <div class="titles">
      <h1>Tableau de bord</h1>
      <div class="meta"><span>corpus webpool</span><span>dernier cycle : 30 oct. 2026, 23:30</span><span class="fresh-ok">● cycle en cours</span></div>
    </div>
  </div>

  <div class="section-title"><h2>Corpus</h2><span class="eyebrow">URLs</span></div>
  <div class="tiles">
    ${tile({ label: 'URLs connues', value: n(48213), sub: '<span class="up">+231</span> aujourd’hui' })}
    ${tile({ label: 'Classées', value: n(39870), sub: '82,7 % du corpus', bar: 82.7 })}
    ${tile({ label: 'En attente', value: n(6412), sub: 'file de normalisation', cls: 'warn' })}
    ${tile({ label: 'Doublons', value: n(1524), sub: 'canonisés' })}
    ${tile({ label: 'En erreur', value: n(407), sub: '96 depuis 17:14', cls: 'alert', href: '#' })}
  </div>

  <div class="section-title"><h2>Pools, domaines, exploration</h2></div>
  <div class="tiles">
    ${tile({ label: 'Pools', value: n(7), sub: `${n(2083)} liens matérialisés`, href: 'pools.html' })}
    ${tile({ label: 'Domaines', value: n(3118), sub: 'profils d’usage', href: '#' })}
    ${tile({ label: 'Domaines à qualifier', value: n(642), sub: '20,6 % des domaines', href: '#', cls: 'warn' })}
    ${tile({ label: 'Requêtes actives', value: n(86), sub: '24 lancées ce soir' })}
    ${tile({ label: 'Requêtes épuisées', value: n(214) })}
    ${tile({ label: 'Vignettes en cache', value: n(31904), sub: '812 Mo / 2 Go', bar: 40.6 })}
  </div>

  <div class="cols" style="margin-top:24px">
    <section class="panel" aria-labelledby="cu-h">
      <div class="panel-head"><h2 id="cu-h">Usage commercial du corpus</h2><span class="eyebrow">${n(39870)} URLs classées</span></div>
      ${usageSummary({ libre: 12840, 'sous-conditions': 9715, payant: 3310, 'non-commercial': 4022, 'a-qualifier': 9983 }, 'URLs')}
    </section>
    <section class="panel" aria-labelledby="dq-h">
      <div class="panel-head"><h2 id="dq-h">Domaines à qualifier, par volume</h2><span class="eyebrow">top 6</span></div>
      ${barList([['youtube.com', 1204], ['researchgate.net', 688], ['atlasobscura.com', 341], ['culture.ru', 198], ['vimeo.com', 176], ['reddit.com', 154]])}
    </section>
  </div>

  <div class="section-title"><h2>Derniers runs</h2><span class="eyebrow">2 échecs · 1 alerte</span></div>
  <div class="panel flush table-wrap">
    <table class="table">
      <thead><tr><th>#</th><th>Type</th><th>Statut</th><th class="hide-sm">Début</th><th class="num">Durée</th><th>Détail</th></tr></thead>
      <tbody>
${runs}
      </tbody>
    </table>
  </div>
</main>`;
  return shell({ title: 'Tableau de bord', active: 'dashboard', body });
}

function urlPage() {
  const [title, url, usage, kind, desc, thumb] = SPB[0];
  const score = (label, v) => `<div class="score"><span class="secondary">${label}</span><span class="mono">${v.toFixed(3)}</span><span class="track"><span style="width:${v * 100}%"></span></span></div>`;
  const body = `<main class="page" id="main">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="#">corpus</a><span class="sep">/</span><span>url #18342</span></nav>
  <div class="url-hero">
    ${thumbBlock(SPB[0], 1).replace('<span class="rank-tag">#1</span>', '<span class="rank-tag">cache</span>')}
    <div>
      <div class="meta" style="margin:0 0 6px"><span class="status ok">${icon('i-check', 'sm')}classée</span>${badge(usage)}<span class="chip">${icon('i-page', 'sm')}page</span><span class="chip">fr</span></div>
      <h1>${esc(title)}</h1>
      <p class="desc">${esc(desc)} Visite des réservoirs du XIXᵉ siècle, installation sonore dans les galeries souterraines.</p>
      <div class="url-full" title="Cliquer pour sélectionner l'URL complète">${esc(url)}</div>
      <div class="actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('i-arrow', 'sm')}Ouvrir le site</a><button class="btn btn-sm" type="button">${icon('i-copy', 'sm')}Copier l'URL</button></div>
    </div>
  </div>

  <div class="tiles" style="margin-top:20px">
    <div class="tile">${score('Pertinence', 0.912)}</div>
    <div class="tile">${score('Qualité', 0.784)}</div>
    <div class="tile">${score('Confiance', 0.861)}</div>
    ${tile({ label: 'HTTP', value: '200', sub: 'text/html · 1 redirection' })}
    ${tile({ label: 'Domaine', value: '<span style="font-size:18px">atlasobscura.com</span>', sub: 'usage à qualifier · 341 URLs', href: '#' })}
  </div>

  <div class="section-title"><h2>Sources</h2><span class="eyebrow">3 découvertes</span></div>
  <div class="panel flush table-wrap">
    <table class="table">
      <thead><tr><th>Provider</th><th>Requête</th><th class="num">Rang SERP</th><th>Découverte</th></tr></thead>
      <tbody>
        <tr><td class="mono">brave</td><td>musée insolite saint-pétersbourg souterrain</td><td class="num">4</td><td class="mono nowrap">12 oct. 2026, 21:03</td></tr>
        <tr><td class="mono">brave</td><td>vodokanal water tower museum st petersburg</td><td class="num">1</td><td class="mono nowrap">14 oct. 2026, 21:05</td></tr>
        <tr><td class="mono">europeana</td><td>водонапорная башня Петербург</td><td class="num">—</td><td class="mono nowrap">19 oct. 2026, 20:47</td></tr>
      </tbody>
    </table>
  </div>

  <div class="cols" style="margin-top:24px">
    <section class="panel"><div class="panel-head"><h2>Thèmes</h2></div>
      <dl class="kv">
        <dt>0,941</dt><dd>Lieux / Musées insolites <span class="chip primary">principal</span></dd>
        <dt>0,702</dt><dd>Patrimoine / Architecture industrielle</dd>
        <dt>0,455</dt><dd>Lieux / Souterrains</dd>
      </dl>
    </section>
    <section class="panel"><div class="panel-head"><h2>Facettes</h2></div>
      <dl class="kv">
        <dt>ville</dt><dd>Saint-Pétersbourg</dd>
        <dt>quartier</dt><dd>Tsentralny</dd>
        <dt>type de lieu</dt><dd>musée</dd>
        <dt>époque</dt><dd>XIXᵉ siècle</dd>
        <dt>langue</dt><dd>fr, en</dd>
      </dl>
    </section>
    <section class="panel"><div class="panel-head"><h2>Pools</h2></div>
      <dl class="kv">
        <dt>rang 1</dt><dd><a href="pool-spb.html">saint-petersbourg-insolite</a></dd>
        <dt>rang 37</dt><dd><a href="#">musees-de-l-eau</a></dd>
      </dl>
    </section>
    <section class="panel"><div class="panel-head"><h2>Média en cache</h2></div>
      <dl class="kv">
        <dt>vignette</dt><dd class="mono">og:image · 640×400 · 24 Ko</dd>
        <dt>favicon</dt><dd class="mono">atlasobscura.com · 32×32</dd>
        <dt>récupéré</dt><dd class="mono">30 oct. 2026, 23:02</dd>
      </dl>
    </section>
  </div>

  <p class="meta" style="margin-top:20px"><span>vue le 12 oct. 2026</span><span>normalisée le 13 oct.</span><span>classée le 13 oct.</span><span>HTTP 200</span></p>
</main>`;
  return shell({ title: `URL #18342`, active: 'corpus', body });
}

// ---------------------------------------------------------------- components.html
function componentsPage() {
  const L = (t, url, u, k, d, th) => [t, url, u, k, d, th];
  const flux = [
    [L('Sleep restriction and next-day emotional reactivity: a multi-site experience-sampling study', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318842', 'libre', 'page'), 'Nominal : favicon en cache, titre, URL, usage'],
    [L('Attachement adulte et usage des applications de rencontre', 'https://www.cairn.info/revue-bulletin-de-psychologie-2025-2-page-133.htm', 'payant', 'page'), 'Sans favicon : pictogramme du type'],
    [L('Conférence — Biais cognitifs et décision médicale', 'https://www.youtube.com/watch?v=Qm2v7HfLx0s', 'a-qualifier', 'video'), 'Vidéo : pictogramme devant le titre'],
    [L(null, 'https://osf.io/download/6731f0c2a1b4e2001d9f42c7/', 'non-commercial', 'pdf'), 'Sans titre : l’URL le remplace (monospace)'],
    [L(LONG_TITLE, 'https://www.cambridge.org/core/journals/psychological-medicine/article/mindfulness-school-university-meta-analysis/9E1B2C0F7A', 'sous-conditions', 'page'), 'Titre de 300 caractères : une ligne, ellipse, titre complet au survol'],
  ];
  const cards = [
    [L('Brume matinale dans une hêtraie, contre-jour', 'https://www.flickr.com/photos/vosges_light/53810247731/', 'sous-conditions', 'image', 'CC BY-NC 2.0 — 6000×4000, Vosges, octobre.', 'forest'), 'Vignette en cache'],
    [L('Tutoriel : entraîner un LoRA de textures avec kohya_ss (2025)', 'https://www.youtube.com/watch?v=Lr9kQ2bT0xE', 'a-qualifier', 'video', 'Vidéo de 38 min : jeu de données, légendes, réglages.', 'leaves'), 'Vidéo : vignette + lecture (ouvre le lien, pas d’iframe)'],
    [L('Forest canopy dataset — 2 400 drone captures', 'https://huggingface.co/datasets/geoforest/canopy-drone-2400', 'non-commercial', 'page', 'CC BY-NC 4.0, annotations par essence.', null), 'Sans image : favicon agrandi'],
    [L('Forest LoRA training notes', 'https://www.researchgate.net/publication/389112406_forest_lora', 'a-qualifier', 'pdf', null, null), 'Sans image ni favicon : pictogramme du type'],
    [L('Pine needles ground 02', 'https://polyhaven.com/a/pine_needles_ground_02', 'libre', 'image', 'CC0, 4K.', 'broken'), 'Image cassée (onerror) : repli explicite'],
    [L(null, 'https://commons.wikimedia.org/wiki/File:Sequoia_trunk_detail_IMG_4471.jpg', 'sous-conditions', 'image', null, 'bark2'), 'Sans titre ni description'],
    [L(LONG_TITLE, 'https://www.cambridge.org/core/journals/psychological-medicine/article/mindfulness-school-university-meta-analysis/9E1B2C0F7A', 'payant', 'page', 'Méta-analyse de 112 essais contrôlés randomisés.', 'herbarium'), 'Titre très long : 2 lignes, ellipse'],
  ];
  const swatch = (v, label) => `<li style="display:flex;align-items:center;gap:8px"><span style="width:28px;height:20px;border-radius:2px;background:var(${v});box-shadow:0 0 0 1px var(--line-strong)"></span><code>${v}</code><span class="muted">${label}</span></li>`;
  const spec = (t) => `<p class="muted" style="margin:6px 0 0;font-size:12px">${t}</p>`;
  const body = `<main class="page" id="main">
  <div class="page-head"><div class="titles"><span class="eyebrow">Data Pool · bibliothèque</span><h1>Composants</h1>
  <div class="meta"><span>tokens.css + ui.css</span><span>sombre par défaut · bascule clair en haut à droite</span></div></div></div>

  <div class="section-title"><h2>Jetons</h2></div>
  <div class="cols">
    <section class="panel"><div class="panel-head"><h2>Surfaces et encre</h2></div><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
      ${swatch('--bg', 'page')}${swatch('--surface', 'panneaux')}${swatch('--surface-2', 'survol, champs')}${swatch('--ink', 'texte')}${swatch('--ink-2', 'secondaire')}${swatch('--muted', 'méta')}${swatch('--line-strong', 'bords de contrôle')}
    </ul></section>
    <section class="panel"><div class="panel-head"><h2>Néon et statut</h2></div><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
      ${swatch('--accent', 'action, sélection de vue')}${swatch('--accent-2', 'focus, encoche')}${swatch('--link', 'liens')}${swatch('--good', 'ok')}${swatch('--warning', 'alerte')}${swatch('--critical', 'échec')}
    </ul></section>
    <section class="panel"><div class="panel-head"><h2>Usage commercial (ordre fixe)</h2></div><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
      ${swatch('--usage-libre', '1 · libre · rond')}${swatch('--usage-sous-conditions', '2 · sous conditions · demi-rond')}${swatch('--usage-payant', '3 · payant · carré')}${swatch('--usage-non-commercial', '4 · non commercial · triangle')}${swatch('--usage-a-qualifier', 'à qualifier · gris, pointillé')}
    </ul>${spec('Validé daltonisme (protan, deutan, tritan : ΔE ≥ 9,5 entre toutes les paires) et ≥ 3:1 sur la surface, dans les deux thèmes.')}</section>
  </div>
  <div class="panel" style="margin-top:12px">
    <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:baseline">
      <span style="font-family:var(--font-display);font-size:26px;font-weight:600">Chakra Petch 600 — titres</span>
      <span style="font-family:var(--font-display);font-size:16px">Chakra Petch 400 — navigation, boutons</span>
      <span style="font-family:var(--font-mono);font-size:13px">JetBrains Mono — https://osf.io/m8fpz/ · 1 000 · psychologie-2025</span>
      <span style="font-size:14px">Sans système — descriptions et texte courant.</span>
    </div>
  </div>

  <div class="section-title"><h2>Badge d'usage commercial</h2></div>
  <div class="panel">
    <div style="display:flex;flex-wrap:wrap;gap:10px">${USAGE.map(([k]) => badge(k)).join('')}</div>
    ${spec('Libellé toujours visible ; forme distincte par usage (rond, demi-rond, carré, triangle, cercle pointillé) ; « à qualifier » en gris, bord pointillé. Texte en encre, jamais dans la couleur de la série.')}
    <div style="margin-top:16px;max-width:560px">${usageSummary({ libre: 168, 'sous-conditions': 121, payant: 22, 'non-commercial': 37, 'a-qualifier': 64 })}</div>
    ${spec('Barre empilée : ordre fixe, 2 px d’écart, « à qualifier » hachuré ; légende chiffrée, valeur exacte au survol (title) et aria-label.')}
  </div>

  <div class="section-title"><h2>Copier les N liens</h2></div>
  <div class="cols">
    <section class="panel"><div class="panel-head"><h2>Repos (interactif)</h2></div>${copyWidget(412, { id: 'c1' })}${spec('Le bouton principal copie tout le pool via l’export de l’API, au format choisi. Le chevron ouvre le menu de format ; le choix est mémorisé.')}</section>
    <section class="panel" style="min-height:300px"><div class="panel-head"><h2>Menu ouvert</h2></div>${copyWidget(412, { id: 'c2', menuOpen: true })}</section>
    <section class="panel"><div class="panel-head"><h2>En cours</h2></div>${copyWidget(1000, { id: 'c3', status: 'busy' })}${spec('Pendant l’appel à /export : bouton aria-busy, message en pointillés.')}</section>
    <section class="panel"><div class="panel-head"><h2>Confirmé</h2></div>${copyWidget(412, { id: 'c4', format: 'md', status: 'ok' })}${spec('role="status" : annoncé par les lecteurs d’écran. Reste 4 s, puis s’efface.')}</section>
    <section class="panel"><div class="panel-head"><h2>Erreur</h2></div>${copyWidget(187, { id: 'c5', status: 'err' })}${spec('Presse-papiers refusé (contexte non sécurisé, permission) : message + repli par téléchargement du fichier.')}</section>
  </div>

  <div class="section-title"><h2>Carte de lien — vue flux</h2><span class="eyebrow">ligne de 28 px</span></div>
  ${flux.map(([l, note], i) => `<div style="margin-bottom:10px"><ol class="flux">${fluxRow(l, [1, 14, 5, 12, 9][i])}</ol>${spec(note)}</div>`).join('\n')}
  ${spec('Colonnes : rang · favicon (ou pictogramme) · titre (lien, nouvel onglet) · URL complète (clic = sélection entière, user-select: all) · usage. Sous 960 px l’URL disparaît de la ligne ; sous 720 px la ligne passe sur deux lignes (titre / URL + usage).')}

  <div class="section-title"><h2>Carte de lien — vue grille</h2><span class="eyebrow">vignette 16:10</span></div>
  <ol class="cards">
    ${cards.map(([l], i) => gridCard(l, i + 1)).join('\n')}
  </ol>
  <ol style="list-style:none;padding:0;margin:8px 0 0;display:grid;gap:2px">${cards.map(([, note], i) => `<li class="muted" style="font-size:12px"><span class="mono">#${i + 1}</span> ${note}</li>`).join('')}</ol>

  <div class="section-title"><h2>Bascule de vue</h2></div>
  <div class="panel" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
    <div class="seg" role="group" aria-label="Affichage des liens" data-demo><button type="button" aria-pressed="true">${icon('i-list', 'sm')}Flux</button><button type="button" aria-pressed="false">${icon('i-grid', 'sm')}Grille</button></div>
    <span class="muted" style="font-size:12px">Mémorisée par pool (localStorage). L’état actif est porté par aria-pressed, un soulignement et la couleur.</span>
  </div>

  <div class="section-title"><h2>Tuile de chiffre</h2></div>
  <div class="tiles">
    ${tile({ label: 'URLs connues', value: n(48213), sub: '<span class="up">+231</span> aujourd’hui' })}
    ${tile({ label: 'Classées', value: n(39870), sub: '82,7 % du corpus', bar: 82.7 })}
    ${tile({ label: 'Pools', value: '7', sub: 'tuile-lien', href: '#' })}
    ${tile({ label: 'À qualifier', value: n(642), sub: 'avertissement', cls: 'warn', href: '#' })}
    ${tile({ label: 'En erreur', value: n(407), sub: 'alerte : pictogramme + barre', cls: 'alert', href: '#' })}
  </div>

  <div class="section-title"><h2>Statuts</h2></div>
  <div class="panel" style="display:flex;gap:10px;flex-wrap:wrap">
    <span class="status ok">${icon('i-check', 'sm')}ok</span><span class="status failed">${icon('i-x', 'sm')}échec</span><span class="status running">${icon('i-run', 'sm')}en cours</span><span class="status warn">${icon('i-alert', 'sm')}alerte</span><span class="status idle">jamais</span><span class="chip">read</span><span class="chip primary">principal</span>
  </div>

  <div class="section-title"><h2>Pagination</h2></div>
  <div class="panel" style="display:grid;gap:8px">
    ${pager(412, 50, 1)}${pager(412, 50, 4)}${pager(412, 50, 9)}${pager(23, 50, 1)}
    ${spec('Plage en monospace + pages ; « ‹ › » avec libellé pour les lecteurs d’écran ; cibles de 32 px (44 px au tactile).')}
  </div>

  <div class="section-title"><h2>Champs et boutons</h2></div>
  <div class="panel" style="display:grid;gap:14px;max-width:520px">
    <label class="field"><span>URL de l'API</span><input class="input" type="url" value="https://api.webpool.example/api/v1"></label>
    <label class="field"><span>Jeton</span><input class="input" type="password" value="xxxxxxxx" aria-invalid="true"><small>État invalide : bord critique + message.</small></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary">Primaire</button><button class="btn">Secondaire</button><button class="btn btn-ghost">Discret</button><button class="btn" disabled>Désactivé</button></div>
  </div>
</main>`;
  return shell({ title: 'Composants', active: '', body, root: '' }).replaceAll('href="pools.html"', 'href="mockups/pools.html"').replaceAll('href="dashboard.html"', 'href="mockups/dashboard.html"').replace(/src="media\//g, 'src="mockups/media/');
}

// ---------------------------------------------------------------- écriture
const POOL = Object.fromEntries(POOLS.map((p) => [p.slug, p]));
const out = {
  'mockups/connexion.html': loginPage(),
  'mockups/connexion-erreur.html': loginPage({ error: true }),
  'mockups/pools.html': poolsPage(),
  'mockups/pool-flux.html': poolPage({ pool: POOL['psychologie-2025'], links: PSYCHO, domains: PSY_DOMAINS, view: 'flux', perPage: 40, other: 'pool-flux-grille.html' }),
  'mockups/pool-flux-grille.html': poolPage({ pool: POOL['psychologie-2025'], links: PSYCHO.map((l, i) => [...l.slice(0, 5), null]), domains: PSY_DOMAINS, view: 'grille', perPage: 40, other: 'pool-flux.html' }),
  'mockups/pool-grille.html': poolPage({ pool: POOL['lora-foret-textures'], links: LORA, domains: LORA_DOMAINS, view: 'grille', perPage: 30, other: 'pool-grille-flux.html' }),
  'mockups/pool-grille-flux.html': poolPage({ pool: POOL['lora-foret-textures'], links: LORA, domains: LORA_DOMAINS, view: 'flux', perPage: 30, other: 'pool-grille.html' }),
  'mockups/pool-spb.html': poolPage({ pool: POOL['saint-petersbourg-insolite'], links: SPB, domains: SPB_DOMAINS, view: 'grille', perPage: 24, other: 'pool-spb-flux.html' }),
  'mockups/pool-spb-flux.html': poolPage({ pool: POOL['saint-petersbourg-insolite'], links: SPB, domains: SPB_DOMAINS, view: 'flux', perPage: 24, other: 'pool-spb.html' }),
  'mockups/dashboard.html': dashboardPage(),
  'mockups/url.html': urlPage(),
  'components.html': componentsPage(),
};
for (const [file, html] of Object.entries(out)) writeFileSync(`${DESIGN}${file}`, html);
console.log(`${Object.keys(out).length} pages, ${written.size} vignettes`);

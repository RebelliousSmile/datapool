// Briques communes aux générateurs de maquettes (build.mjs, proposals.mjs).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { faviconUri, thumbSvg } from './thumbs.mjs';

export const DESIGN = fileURLToPath(new URL('..', import.meta.url));
export const MOCKUPS = `${DESIGN}mockups/`;
mkdirSync(`${MOCKUPS}media`, { recursive: true });
export { faviconUri };
// ---------------------------------------------------------------- utilitaires
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const nf = new Intl.NumberFormat('fr-FR');
export const n = (x) => nf.format(x).replace(/ /g, ' ');

export const USAGE = [
  ['libre', 'Libre'], ['sous-conditions', 'Sous conditions'], ['payant', 'Payant'], ['non-commercial', 'Non commercial'], ['a-qualifier', 'À qualifier'],
];
export const usageLabel = (k) => USAGE.find(([key]) => key === k)[1];
export const KIND_LABEL = { page: 'Page', image: 'Image', video: 'Vidéo', pdf: 'PDF' };
export const KIND_ICON = { page: 'i-page', image: 'i-image', video: 'i-video', pdf: 'i-pdf' };
// Domaines dont webpool n'a pas de favicon en cache : repli sur le pictogramme du type.
export const NO_FAV = new Set(['researchgate.net', 'cairn.info', 'spb.ru', 'kunstkamera.ru', 'santepubliquefrance.fr', 'annualreviews.org', 'textures.com', 'culture.ru']);

export const icon = (id, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
export const hostOf = (url) => new URL(url).hostname.replace(/^www\./, '');

export function urlParts(url) {
  const m = url.match(/^(https?:\/\/)([^/?#]+)(.*)$/);
  return `<span class="scheme">${esc(m[1])}</span><span class="host">${esc(m[2])}</span>${esc(m[3])}`;
}
export const urlSpan = (url, cls = 'url') => `<span class="${cls}" title="${esc(url)}">${urlParts(url)}</span>`;
export const badge = (k) => `<span class="usage" data-usage="${k}"><span class="u-mark" aria-hidden="true"></span>${usageLabel(k)}</span>`;

export function favicon(url, kind) {
  const host = hostOf(url);
  if (NO_FAV.has(host)) return `<span class="fav" title="${KIND_LABEL[kind]}">${icon(KIND_ICON[kind])}</span>`;
  return `<span class="fav"><img src="${faviconUri(host)}" alt="" width="16" height="16"></span>`;
}

// Écrit les vignettes SVG utilisées (figurent le cache de l'API webpool).
export const written = new Set();
export function thumbFile(name) {
  if (!written.has(name)) {
    writeFileSync(`${MOCKUPS}media/${name}.svg`, thumbSvg(name));
    written.add(name);
  }
  return `media/${name}.svg`;
}

// ---------------------------------------------------------------- pictogrammes
export const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
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
<symbol id="i-data" viewBox="0 0 16 16"><ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/></symbol>
<symbol id="i-code" viewBox="0 0 16 16"><path d="M5.5 4L1.5 8l4 4M10.5 4l4 4-4 4M9.2 2.5L6.8 13.5"/></symbol>
<symbol id="i-model" viewBox="0 0 16 16"><path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7z"/><path d="M8 8l5.5-3.3M8 8L2.5 4.7M8 8v6.5"/></symbol>
<symbol id="i-filter" viewBox="0 0 16 16"><path d="M1.5 2.5h13l-5 6v5l-3 1.5V8.5z"/></symbol>
<symbol id="i-layers" viewBox="0 0 16 16"><path d="M8 1.5l6.5 3.5L8 8.5 1.5 5z"/><path d="M1.5 8L8 11.5 14.5 8M1.5 11L8 14.5 14.5 11"/></symbol>
<symbol id="i-user" viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="3"/><path d="M2 14.5c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5"/></symbol>
<symbol id="i-bookmark" viewBox="0 0 16 16"><path d="M3.5 1.5h9v13L8 11.5l-4.5 3z"/></symbol>
<symbol id="i-sliders" viewBox="0 0 16 16"><path d="M2 4h7M12 4h2M2 12h2M7 12h7M2 8h4M9 8h5"/><circle cx="10.5" cy="4" r="1.5"/><circle cx="5.5" cy="12" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/></symbol>
<symbol id="i-close" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></symbol>
<symbol id="i-sparkle" viewBox="0 0 16 16"><path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z"/></symbol>
<symbol id="i-run" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" stroke-dasharray="3 2"/><path d="M8 4.5V8l2.5 1.5"/></symbol>
</svg>`;

// ---------------------------------------------------------------- scripts des maquettes
export const HEAD_SCRIPT = `<script>(function(){var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('dp-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();</script>`;

export const BODY_SCRIPT = `<script>
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
export function shell({ title, active, body, root = '../', admin = true, bare = false }) {
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
export function copyWidget(count, { id = 'copy', format = 'txt', menuOpen = false, status = null } = {}) {
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

export function viewToggle(current, fluxHref = '#', gridHref = '#') {
  return `<div class="seg" role="group" aria-label="Affichage des liens">
  <a href="${fluxHref}"${current === 'flux' ? ' aria-current="page"' : ''}>${icon('i-list', 'sm')}Flux</a>
  <a href="${gridHref}"${current === 'grille' ? ' aria-current="page"' : ''}>${icon('i-grid', 'sm')}Grille</a>
</div>`;
}

export function fluxRow([title, url, usage, kind], rank, { admin = false } = {}) {
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

export function thumbBlock([title, url, usage, kind, desc, thumb], rank) {
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

export function gridCard(link, rank) {
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

export function usageSummary(usage, unit = 'liens') {
  const total = Object.values(usage).reduce((a, b) => a + b, 0);
  const segs = USAGE.filter(([k]) => usage[k]).map(([k, label]) => ({ k, label, v: usage[k], p: Math.round((usage[k] / total) * 100) }));
  return `<div class="stackbar" role="img" aria-label="${segs.map((s) => `${s.label} : ${s.v}`).join(', ')}">
  ${segs.map((s) => `<span class="seg-u" data-usage="${s.k}" style="flex-grow:${s.v}" title="${s.label} : ${n(s.v)} ${unit} (${s.p} %)"></span>`).join('')}
</div>
<ul class="legend">
  ${segs.map((s) => `<li><span class="u-mark" data-usage="${s.k}" aria-hidden="true"></span><span class="name">${s.label}</span><strong>${n(s.v)}</strong><span class="pct">${s.p}%</span></li>`).join('\n  ')}
</ul>`;
}

export function barList(rows) {
  const max = Math.max(...rows.map((r) => r[1]));
  return `<ul class="barlist">
  ${rows.map(([name, v]) => `<li title="${esc(name)} : ${v} liens"><span class="name">${esc(name)}</span><span class="track"><span class="fill" style="width:${((v / max) * 100).toFixed(1)}%"></span></span><span class="val">${v}</span></li>`).join('\n  ')}
</ul>`;
}

export function pager(total, perPage, page) {
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

export function tile({ label, value, sub = '', href = null, cls = '', bar = null }) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="tile ${cls}"${href ? ` href="${href}"` : ''}>
  <span class="eyebrow">${cls.includes('alert') ? icon('i-alert', 'sm') : ''}${label}</span>
  <span class="value">${value}</span>
  ${sub ? `<span class="sub">${sub}</span>` : ''}
  ${bar != null ? `<span class="bar" aria-hidden="true"><span style="width:${bar}%"></span></span>` : ''}
  ${href ? `<span class="go" aria-hidden="true">${icon('i-arrow', 'sm')}</span>` : ''}
</${tag}>`;
}

// ---------------------------------------------------------------- types de média et familles de source
// Type de média affiné (au-delà de page/image/vidéo/PDF) et famille de source, déduits du lien.
export const MEDIA = [
  ['page', 'Pages', 'i-page'], ['image', 'Images', 'i-image'], ['video', 'Vidéos', 'i-video'], ['pdf', 'PDF', 'i-pdf'],
  ['data', 'Données', 'i-data'], ['code', 'Code', 'i-code'], ['model', 'Modèles', 'i-model'],
];
export const SOURCES = [
  ['research', 'Recherche', ['journals.plos.org', 'frontiersin.org', 'osf.io', 'psycnet.apa.org', 'journals.sagepub.com', 'nature.com', 'cambridge.org', 'nejm.org', 'pnas.org', 'elifesciences.org', 'hal.science', 'arxiv.org', 'cairn.info', 'annualreviews.org', 'researchgate.net', 'santepubliquefrance.fr']],
  ['archives', 'Archives et musées', ['europeana.eu', 'commons.wikimedia.org', 'pastvu.com', 'hermitagemuseum.org', 'kunstkamera.ru']],
  ['stock', 'Banques d’images', ['flickr.com', 'pexels.com', 'shutterstock.com', 'polyhaven.com', 'ambientcg.com', 'textures.com']],
  ['community', 'Communautés', ['reddit.com', 'civitai.com', 'artstation.com', 'github.com', 'huggingface.co']],
  ['video', 'Plateformes vidéo', ['youtube.com', 'vimeo.com']],
  ['press', 'Presse et guides', ['theconversation.com', 'aeon.co', 'bps.org.uk', 'atlasobscura.com', 'tripadvisor.fr', 'culture.ru', 'spb.ru', 'ru.wikipedia.org']],
];
const MEDIA_RULES = [[/huggingface\.co\/datasets|osf\.io\/m8fpz|s41597/, 'data'], [/github\.com/, 'code'], [/civitai\.com\/models/, 'model']];
export const mediaOf = ([, url, , kind]) => MEDIA_RULES.find(([re]) => re.test(url))?.[1] ?? kind;
export const sourceOf = ([, url]) => SOURCES.find(([, , hosts]) => hosts.includes(hostOf(url)))?.[0] ?? 'press';
export const mediaLabel = (k) => MEDIA.find(([key]) => key === k)[1];
export const sourceLabel = (k) => SOURCES.find(([key]) => key === k)[1];
export const mediaIcon = (k) => MEDIA.find(([key]) => key === k)[2];

// Comptes par valeur, dans l'ordre de référence, sans les zéros.
export function countBy(links, fn, order) {
  const c = {};
  for (const l of links) c[fn(l)] = (c[fn(l)] ?? 0) + 1;
  return order.filter(([k]) => c[k]).map(([k, label, extra]) => ({ k, label, extra, v: c[k] }));
}
export const langOf = ([title]) => (!title ? '—' : /[а-я]/i.test(title) ? 'ru' : /\b(the|and|of|with|for|a)\b/i.test(title) && !/[éèàçù]/.test(title) ? 'en' : 'fr');

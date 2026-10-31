// Explorateur de pool — démonstration interactive des maquettes datapool (v2).
// Filtre, segmente, groupe et change de densité sur les liens présents dans la page.
// Dans l'application, ces opérations passent par l'API (filtres + effectifs par facette) ;
// ici les effectifs de l'échantillon sont ramenés au volume du pool (data-total / data-sample).
(function () {
  'use strict';
  var root = document.querySelector('[data-xp]');
  if (!root) return;
  var L = JSON.parse(document.getElementById('xp-labels').textContent);
  var DIMS = ['media', 'source', 'usage', 'domain'];
  var KEY = { media: 'type', source: 'source', usage: 'usage', domain: 'domaine' };
  var scale = Number(root.dataset.total) / Number(root.dataset.sample);
  var nf = new Intl.NumberFormat('fr-FR');
  var fmt = function (v) { return nf.format(Math.round(v * scale)); };
  var items = Array.prototype.slice.call(root.querySelectorAll('.item'));
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------------------------------------------------------------- état
  var init = JSON.parse(root.dataset.state || '{}');
  var params = new URLSearchParams(location.search);
  var state = {
    seg: init.seg || 'media', tab: init.tab || '', q: init.q || '', group: init.group || 'none',
    density: init.density || 'comfort', side: init.side !== false, preview: init.preview || '',
    f: { media: [], source: [], usage: [], domain: [] }, sideOpen: !!init.sideOpen, sugg: !!init.sugg,
  };
  DIMS.forEach(function (d) { state.f[d] = (init.f && init.f[d]) || []; });
  ['seg', 'tab', 'q', 'group', 'density', 'preview'].forEach(function (k) { if (params.has(k)) state[k] = params.get(k); });
  DIMS.forEach(function (d) { if (params.has(d)) state.f[d] = params.get(d).split(',').filter(Boolean); });
  // Un filtre unique sur la dimension de segment devient l'onglet actif.
  if (!state.tab && state.f[state.seg].length === 1) { state.tab = state.f[state.seg][0]; state.f[state.seg] = []; }

  var label = function (d, v) { return (L[d][v] || [v])[0]; };
  var order = function (d) { return Object.keys(L[d]); };
  var markOf = function (d, v) {
    if (d === 'usage') return '<span class="u-mark" data-usage="' + v + '" aria-hidden="true"></span>';
    if (d === 'media') return '<svg class="icon sm" aria-hidden="true"><use href="#' + L.media[v][1] + '"/></svg>';
    return '';
  };

  // ---------------------------------------------------------------- correspondance
  function matches(it, except) {
    if (except !== 'tab' && state.tab && it.dataset[state.seg] !== state.tab) return false;
    for (var i = 0; i < DIMS.length; i++) {
      var d = DIMS[i];
      if (d === except) continue;
      if (state.f[d].length && state.f[d].indexOf(it.dataset[d]) < 0) return false;
    }
    if (except !== 'q' && state.q) {
      var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var j = 0; j < words.length; j++) if (it.dataset.text.indexOf(words[j]) < 0) return false;
    }
    return true;
  }
  function counts(d, except) {
    var c = {};
    items.forEach(function (it) { if (matches(it, except)) c[it.dataset[d]] = (c[it.dataset[d]] || 0) + 1; });
    return c;
  }
  var activeCount = function () { return DIMS.reduce(function (n, d) { return n + state.f[d].length; }, 0) + (state.tab ? 1 : 0); };

  // ---------------------------------------------------------------- rendu
  function renderTabs() {
    var c = counts(state.seg, 'tab');
    var all = Object.keys(c).reduce(function (a, k) { return a + c[k]; }, 0);
    var html = '<button class="tab" role="tab" data-tab="" aria-selected="' + !state.tab + '">Tout<span class="cnt">' + fmt(all) + '</span></button>';
    order(state.seg).forEach(function (v) {
      var n = c[v] || 0;
      if (!n && state.tab !== v) return;
      html += '<button class="tab' + (n ? '' : ' zero') + '" role="tab" data-tab="' + v + '" aria-selected="' + (state.tab === v) + '">' + markOf(state.seg, v) + esc(label(state.seg, v)) + '<span class="cnt">' + fmt(n) + '</span><span class="share" style="width:' + (all ? (n / all) * 100 : 0) + '%"></span></button>';
    });
    $('[data-tabs]', root).innerHTML = html;
    $('[data-segby]', root).value = state.seg;
  }

  function renderFacets() {
    DIMS.forEach(function (d) {
      var box = $('[data-facet="' + d + '"]', root);
      if (!box) return;
      box.hidden = d === state.seg;
      var c = counts(d, d);
      var vals = order(d).filter(function (v) { return c[v] || state.f[d].indexOf(v) >= 0; });
      var limit = Number(box.dataset.limit || 99), expanded = box.dataset.expanded === 'true';
      var shown = expanded ? vals : vals.slice(0, limit);
      var html = '<legend>' + esc(box.dataset.title) + '</legend>';
      shown.forEach(function (v) {
        var on = state.f[d].indexOf(v) >= 0, mark = markOf(d, v), n = c[v] || 0;
        html += '<label class="opt' + (mark ? '' : ' plain') + (on ? ' on' : '') + (n ? '' : ' zero') + '"><input type="checkbox" data-dim="' + d + '" value="' + v + '"' + (on ? ' checked' : '') + '>' + mark + '<span class="lbl' + (d === 'domain' ? ' mono' : '') + '">' + esc(label(d, v)) + '</span><span class="cnt">' + fmt(n) + '</span></label>';
      });
      if (vals.length > limit) html += '<button class="more" type="button" data-more="' + d + '">' + (expanded ? 'Moins' : 'Voir les ' + vals.length + ' ' + box.dataset.plural) + '</button>';
      box.innerHTML = html;
    });
  }

  function renderTokens() {
    var html = '';
    var tok = function (d, v) {
      return '<span class="tok"><span class="k">' + KEY[d] + '</span>' + markOf(d, v) + esc(label(d, v)) + '<button type="button" data-untok="' + d + ':' + v + '" aria-label="Retirer ' + esc(label(d, v)) + '"><svg class="icon sm" aria-hidden="true"><use href="#i-close"/></svg></button></span>';
    };
    if (state.tab) html += tok(state.seg, state.tab);
    DIMS.forEach(function (d) { state.f[d].forEach(function (v) { html += tok(d, v); }); });
    $('[data-tokens]', root).innerHTML = html;
    $('[data-q]', root).value = state.q;
    $('[data-qclear]', root).hidden = !activeCount() && !state.q;
    var n = activeCount();
    root.querySelectorAll('.badge-n').forEach(function (b) { b.textContent = n ? n : ''; });
  }

  function renderSugg() {
    var box = $('[data-sugg]', root);
    if (!state.sugg) { box.hidden = true; $('[data-q]', root).setAttribute('aria-expanded', 'false'); return; }
    var q = ($('[data-q]', root).value || '').toLowerCase().trim();
    var rows = [];
    DIMS.forEach(function (d) {
      var c = counts(d, null);
      order(d).forEach(function (v) {
        if (!c[v] || state.f[d].indexOf(v) >= 0 || (state.tab && d === state.seg)) return;
        var lab = label(d, v);
        if (q && lab.toLowerCase().indexOf(q) < 0 && v.indexOf(q) < 0) return;
        rows.push({ d: d, v: v, n: c[v], lab: lab });
      });
    });
    rows.sort(function (a, b) { return b.n - a.n; });
    rows = rows.slice(0, 6);
    var html = '<span class="eyebrow">' + (q ? 'Filtres correspondants' : 'Affiner') + '</span>';
    rows.forEach(function (r, i) {
      html += '<button class="sugg-item" type="button" role="option" aria-selected="' + (i === 0) + '" data-add="' + r.d + ':' + r.v + '"><span class="k">' + KEY[r.d] + '</span>' + markOf(r.d, r.v) + esc(r.lab) + '<span class="cnt">' + fmt(r.n) + '</span></button>';
    });
    if (!rows.length) html += '<p class="sugg-help">Aucun filtre ne correspond : la recherche porte sur les titres, descriptions et URLs.</p>';
    html += '<p class="sugg-help">Écrire <span class="mono">type:</span> <span class="mono">source:</span> <span class="mono">usage:</span> <span class="mono">domaine:</span> · <kbd>/</kbd> pour revenir ici · <kbd>Échap</kbd> pour fermer</p>';
    box.innerHTML = html;
    box.hidden = false;
    $('[data-q]', root).setAttribute('aria-expanded', 'true');
  }

  function renderResults() {
    var host = $('[data-results]', root);
    var visible = items.filter(function (it) { return matches(it); });
    items.forEach(function (it) { it.hidden = visible.indexOf(it) < 0; it.classList.toggle('peeked', it.dataset.rank === state.preview); });
    var cls = 'items d-' + state.density;
    host.innerHTML = '';
    if (state.group === 'none') {
      var ol = document.createElement('ol');
      ol.className = cls;
      visible.forEach(function (it) { ol.appendChild(it); });
      host.appendChild(ol);
    } else {
      var g = state.group;
      order(g).forEach(function (v) {
        var members = visible.filter(function (it) { return it.dataset[g] === v; });
        if (!members.length) return;
        var sec = document.createElement('section');
        sec.className = 'xp-group';
        sec.innerHTML = '<h2 class="xp-gh">' + markOf(g, v) + esc(label(g, v)) + '<span class="cnt">' + fmt(members.length) + ' liens</span><button class="btn btn-ghost btn-sm" type="button" data-copy-group="' + fmt(members.length) + '"><svg class="icon sm" aria-hidden="true"><use href="#i-copy"/></svg>Copier ce groupe</button></h2>';
        var list = document.createElement('ol');
        list.className = cls;
        members.forEach(function (it) { list.appendChild(it); });
        sec.appendChild(list);
        host.appendChild(sec);
      });
    }
    var hidden = document.createElement('div');
    hidden.hidden = true;
    items.forEach(function (it) { if (!it.parentNode || it.hidden) hidden.appendChild(it); });
    host.appendChild(hidden);

    var n = Math.round(visible.length * scale);
    var total = Number(root.dataset.total);
    $('[data-count]', root).innerHTML = nf.format(n) + ' liens' + (n !== total ? ' <span class="muted">sur ' + nf.format(total) + '</span>' : '');
    $('[data-empty]', root).hidden = visible.length > 0;
    $('[data-count-short]', root).textContent = nf.format(n);
    var copy = $('[data-copy]');
    copy.dataset.count = n;
    copy.querySelector('.count').textContent = nf.format(n);
    copy.querySelector('.what').textContent = n === total ? '' : ' filtrés';
    $('[data-group]', root).value = state.group;
    root.querySelectorAll('[data-density]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.density === state.density)); });
  }

  function renderPreview() {
    var pane = $('[data-preview]', root);
    var it = items.filter(function (x) { return x.dataset.rank === state.preview; })[0];
    root.classList.toggle('has-preview', !!it);
    $('[data-scrim]').hidden = !(state.sideOpen || (it && innerWidth < 1280));
    if (!it) { pane.hidden = true; return; }
    var t = it.querySelector('.item-title');
    pane.innerHTML = '<div class="pv-head"><span class="eyebrow">Aperçu</span><button class="btn btn-ghost btn-sm" type="button" data-unpeek aria-label="Fermer l’aperçu"><svg class="icon sm" aria-hidden="true"><use href="#i-close"/></svg></button></div>' +
      it.querySelector('.item-thumb').innerHTML +
      '<h2>' + esc(t.textContent) + '</h2>' +
      (it.querySelector('.item-desc') ? '<p>' + esc(it.querySelector('.item-desc').textContent) + '</p>' : '') +
      '<div class="url-full">' + esc(t.getAttribute('href')) + '</div>' +
      '<dl class="kv"><dt>rang</dt><dd class="mono">#' + it.dataset.rank + '</dd><dt>type</dt><dd>' + markOf('media', it.dataset.media) + ' ' + esc(label('media', it.dataset.media).replace(/s$/, '')) + '</dd><dt>source</dt><dd>' + esc(label('source', it.dataset.source)) + ' · <span class="mono">' + esc(it.dataset.domain) + '</span></dd><dt>usage</dt><dd>' + it.querySelector('.usage').outerHTML + '</dd></dl>' +
      '<div class="actions"><a class="btn btn-primary btn-sm" href="' + esc(t.getAttribute('href')) + '" target="_blank" rel="noopener noreferrer"><svg class="icon sm" aria-hidden="true"><use href="#i-arrow"/></svg>Ouvrir</a><button class="btn btn-sm" type="button"><svg class="icon sm" aria-hidden="true"><use href="#i-copy"/></svg>Copier l’URL</button></div>';
    pane.hidden = false;
  }

  function render() {
    root.classList.toggle('no-side', !state.side);
    root.classList.toggle('side-open', state.sideOpen);
    root.querySelectorAll('[data-toggle-side]').forEach(function (b) { b.setAttribute('aria-expanded', String(innerWidth < 1100 ? state.sideOpen : state.side)); });
    renderTabs(); renderFacets(); renderTokens(); renderResults(); renderPreview(); renderSugg();
  }

  // ---------------------------------------------------------------- interactions
  function addFilter(d, v) {
    if (d === state.seg) state.tab = v;
    else if (state.f[d].indexOf(v) < 0) state.f[d].push(v);
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t || !root.contains(t)) return;
    if (t.dataset.tab !== undefined) { state.tab = t.dataset.tab; render(); }
    else if (t.dataset.untok) { var p = t.dataset.untok.split(':'); if (p[0] === state.seg && state.tab === p[1]) state.tab = ''; else state.f[p[0]] = state.f[p[0]].filter(function (x) { return x !== p[1]; }); render(); }
    else if (t.dataset.add) { var a = t.dataset.add.split(':'); addFilter(a[0], a[1]); state.q = ''; state.sugg = false; render(); $('[data-q]', root).focus(); }
    else if (t.hasAttribute('data-qclear')) { state.tab = ''; state.q = ''; DIMS.forEach(function (d) { state.f[d] = []; }); render(); }
    else if (t.dataset.more) { var box = $('[data-facet="' + t.dataset.more + '"]', root); box.dataset.expanded = String(box.dataset.expanded !== 'true'); renderFacets(); }
    else if (t.dataset.density) { state.density = t.dataset.density; renderResults(); }
    else if (t.hasAttribute('data-toggle-side')) { if (innerWidth < 1100) state.sideOpen = !state.sideOpen; else state.side = !state.side; render(); }
    else if (t.hasAttribute('data-close-side')) { state.sideOpen = false; render(); }
    else if (t.classList.contains('peek')) { var r = t.closest('.item').dataset.rank; state.preview = state.preview === r ? '' : r; renderResults(); renderPreview(); }
    else if (t.hasAttribute('data-unpeek')) { state.preview = ''; renderResults(); renderPreview(); }
    else if (t.dataset.view) {
      var v = JSON.parse(t.dataset.view);
      state.tab = v.tab || ''; state.seg = v.seg || state.seg; state.q = '';
      DIMS.forEach(function (d) { state.f[d] = (v.f && v.f[d]) || []; });
      root.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-current', String(b === t)); });
      render();
    }
  });
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.dim) {
      var d = t.dataset.dim;
      state.f[d] = t.checked ? state.f[d].concat(t.value) : state.f[d].filter(function (x) { return x !== t.value; });
      render();
    } else if (t.hasAttribute('data-segby')) {
      // Le filtre de segment devient une facette de la nouvelle dimension, et inversement.
      if (state.tab) state.f[state.seg] = [state.tab];
      state.seg = t.value;
      state.tab = state.f[state.seg].length === 1 ? state.f[state.seg][0] : '';
      state.f[state.seg] = [];
      render();
    } else if (t.hasAttribute('data-group')) { state.group = t.value; renderResults(); }
  });
  var q = $('[data-q]', root);
  q.addEventListener('input', function () {
    var m = q.value.match(/^(type|source|usage|domaine):(\S+)\s$/i);
    if (m) {
      var d = { type: 'media', source: 'source', usage: 'usage', domaine: 'domain' }[m[1].toLowerCase()];
      var v = order(d).filter(function (k) { return k === m[2] || label(d, k).toLowerCase().indexOf(m[2].toLowerCase()) === 0; })[0];
      if (v) { addFilter(d, v); q.value = ''; }
    }
    state.q = q.value.indexOf(':') < 0 ? q.value : state.q;
    state.sugg = true;
    renderTabs(); renderFacets(); renderTokens(); renderResults(); renderSugg();
    q.focus();
  });
  q.addEventListener('focus', function () { state.sugg = true; renderSugg(); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && !q.value) {
      var last = DIMS.slice().reverse().filter(function (d) { return state.f[d].length; })[0];
      if (last) state.f[last].pop(); else state.tab = '';
      render(); q.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var first = $('[data-sugg] [aria-selected="true"]', root);
      if (first && q.value) first.click(); else { state.sugg = false; renderSugg(); }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var opts = Array.prototype.slice.call(root.querySelectorAll('.sugg-item'));
      if (!opts.length) return;
      e.preventDefault();
      var i = opts.findIndex(function (o) { return o.getAttribute('aria-selected') === 'true'; });
      opts.forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
      opts[(i + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length].setAttribute('aria-selected', 'true');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); q.focus(); }
    if (e.key === 'Escape') { state.sugg = false; state.sideOpen = false; if (innerWidth < 1280) state.preview = ''; render(); }
  });
  document.addEventListener('click', function (e) {
    if (state.sugg && !e.target.closest('.xp-query')) { state.sugg = false; renderSugg(); }
    if (e.target.hasAttribute('data-scrim')) { state.sideOpen = false; if (innerWidth < 1280) state.preview = ''; render(); }
  });
  $('[data-qform]', root).addEventListener('submit', function (e) { e.preventDefault(); });

  render();
})();

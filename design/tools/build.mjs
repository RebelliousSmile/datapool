// Génère les maquettes de la synthèse (v2) à partir des données d'exemple.
// Usage : node design/tools/build.mjs
// Sorties : design/mockups/*.html, design/mockups/media/*.svg, design/components.html
// (les trois propositions comparées sont générées par tools/proposals.mjs)
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { LONG_TITLE, LORA, POOLS, PSYCHO, RUNS, SPB } from './data.mjs';
import {
  DESIGN, MEDIA, MOCKUPS, SOURCES, USAGE, badge, barList, copyWidget, countBy, esc, favicon, faviconUri, hostOf, icon, mediaIcon,
  mediaLabel, mediaOf, n, pager, shell, sourceLabel, sourceOf, thumbBlock, thumbFile, tile, urlSpan, usageLabel, usageSummary,
} from './lib.mjs';

// Repart d'un dossier propre : les pages v1 qui n'existent plus disparaissent.
for (const f of readdirSync(MOCKUPS)) if (f.endsWith('.html')) rmSync(`${MOCKUPS}${f}`);

const SCRIPT = '<script src="../explore.js"></script>';

// ---------------------------------------------------------------- élément de résultat (3 densités)
function item(link, rank) {
  const [title, url, usage, kind, desc] = link;
  const media = mediaOf(link), source = sourceOf(link), domain = hostOf(url);
  const text = `${title ?? ''} ${desc ?? ''} ${url}`.toLowerCase();
  const t = title
    ? `<a class="item-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">${esc(title)}</a>`
    : `<a class="item-title untitled" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Sans titre">${esc(url.replace(/^https?:\/\/(www\.)?/, ''))}</a>`;
  return `<li class="item" data-rank="${rank}" data-media="${media}" data-source="${source}" data-usage="${usage}" data-domain="${domain}" data-text="${esc(text)}">
  <span class="item-rank">#${rank}</span>
  <span class="item-fav">${favicon(url, kind)}</span>
  <div class="item-thumb">${thumbBlock(link, rank)}</div>
  <div class="item-body">
    ${t}
    ${desc ? `<p class="item-desc">${esc(desc)}</p>` : ''}
    <div class="item-meta">${urlSpan(url)}<span class="src">${sourceLabel(source)}</span></div>
  </div>
  <div class="item-side">${badge(usage)}<button class="peek" type="button" aria-label="Aperçu de « ${esc((title ?? domain).slice(0, 60))} »">${icon('i-eye', 'sm')}</button></div>
</li>`;
}

function labels(links) {
  const domains = countBy(links, ([, url]) => hostOf(url), [...new Set(links.map(([, url]) => hostOf(url)))].map((h) => [h]))
    .sort((a, b) => b.v - a.v);
  return JSON.stringify({
    media: Object.fromEntries(MEDIA.map(([k, l, i]) => [k, [l, i]])),
    source: Object.fromEntries(SOURCES.map(([k, l]) => [k, [l]])),
    usage: Object.fromEntries(USAGE.map(([k, l]) => [k, [l]])),
    domain: Object.fromEntries(domains.map((d) => [d.k, [d.k]])),
  });
}

// ---------------------------------------------------------------- explorateur de pool
function explorerPage({ pool, links, lede, views, state = {} }) {
  const viewBtns = [['Tout le pool', {}], ...views].map(([name, v], i) => `<button class="view-btn" type="button" data-view='${JSON.stringify(v)}' aria-current="${i === 0 && !state.view ? 'true' : state.view === name}">${icon(i ? 'i-bookmark' : 'i-layers', 'sm')}${esc(name)}</button>`).join('\n        ');
  const body = `<main class="xp-page" id="main">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="pools.html">pools</a><span class="sep">/</span><span>${pool.slug}</span></nav>
  <div class="xp-head">
    <div>
      <h1>${esc(pool.label)}</h1>
      <p class="lede">${esc(lede)}</p>
      <div class="meta"><span>${n(pool.items)} liens</span><span>matérialisé le ${pool.refreshed}</span><span class="${pool.fresh ? 'fresh-ok' : 'fresh-old'}">${pool.fresh ? '● frais' : '◐ à rafraîchir'} · ${pool.ago}</span></div>
    </div>
    <div class="actions">${copyWidget(pool.items)}</div>
  </div>

  <div class="xp" data-xp data-total="${pool.items}" data-sample="${links.length}" data-state='${JSON.stringify(state)}'>
    <aside class="xp-side" id="xp-side" aria-label="Filtres">
      <div class="xp-side-head"><h2>Filtres</h2><button class="btn btn-ghost btn-sm" type="button" data-close-side aria-label="Fermer les filtres">${icon('i-close', 'sm')}</button></div>
      <section>
        <h2>Vues</h2>
        <div class="views">
        ${viewBtns}
        <button class="view-btn save" type="button">${icon('i-sparkle', 'sm')}Enregistrer la vue actuelle</button>
        </div>
      </section>
      <fieldset class="facet" data-facet="media" data-title="Type de média" data-plural="types"></fieldset>
      <fieldset class="facet" data-facet="source" data-title="Source" data-plural="sources"></fieldset>
      <fieldset class="facet" data-facet="usage" data-title="Usage commercial" data-plural="usages"></fieldset>
      <fieldset class="facet" data-facet="domain" data-title="Domaine" data-plural="domaines" data-limit="5"></fieldset>
      <p class="side-note">Les effectifs tiennent compte des autres filtres.</p>
      <div class="xp-side-foot"><button class="btn btn-primary" type="button" data-close-side>Afficher les <span data-count-short></span> liens</button></div>
    </aside>

    <div class="xp-main">
      <div class="xp-query">
        <form class="qfield" data-qform role="search" onclick="this.querySelector('input').focus()">
          ${icon('i-search')}
          <span data-tokens style="display:contents"></span>
          <input data-q type="search" aria-label="Rechercher dans le pool" placeholder="Titre, URL… ou type:image" autocomplete="off" aria-autocomplete="list" aria-controls="xp-sugg" aria-expanded="false">
          <button class="qclear" type="button" data-qclear hidden>Effacer</button>
          <kbd aria-hidden="true">/</kbd>
        </form>
        <div class="sugg" id="xp-sugg" data-sugg role="listbox" aria-label="Suggestions de filtres" hidden></div>
      </div>
      <div class="xp-segs">
        <label class="segby">Segmenter par <select data-segby aria-label="Segmenter par"><option value="media">type</option><option value="source">source</option><option value="usage">usage</option></select></label>
        <div class="tabs" role="tablist" aria-label="Segments" data-tabs></div>
      </div>
      <div class="xp-bar">
        <span class="xp-count" data-count aria-live="polite"></span>
        <button class="btn btn-sm btn-filters" type="button" data-toggle-side aria-controls="xp-side" aria-expanded="true">${icon('i-sliders', 'sm')}Filtres <span class="badge-n"></span></button>
        <label class="ctl ctl-group">Grouper par <select data-group><option value="none">aucun</option><option value="source">source</option><option value="media">type</option><option value="usage">usage</option><option value="domain">domaine</option></select></label>
        <div class="seg" role="group" aria-label="Densité d'affichage">
          <button type="button" data-density="comfort" aria-pressed="false" aria-label="Confort">${icon('i-comfort', 'sm')}<span class="lbl-d">Confort</span></button>
          <button type="button" data-density="compact" aria-pressed="false" aria-label="Compact">${icon('i-dense', 'sm')}<span class="lbl-d">Compact</span></button>
          <button type="button" data-density="grid" aria-pressed="false" aria-label="Grille">${icon('i-grid', 'sm')}<span class="lbl-d">Grille</span></button>
        </div>
      </div>
      <div data-results>
        <ol class="items">
${links.map((l, i) => item(l, i + 1)).join('\n')}
        </ol>
      </div>
      <div class="xp-empty" data-empty hidden><strong>Aucun lien pour ces filtres</strong>Retirez un filtre ou <button class="qclear" type="button" data-qclear>effacez la recherche</button>.</div>
      ${pager(pool.items, links.length, 1)}
    </div>

    <aside class="xp-preview" data-preview aria-label="Aperçu du lien" hidden></aside>
  </div>
  <script type="application/json" id="xp-labels">${labels(links)}</script>
</main>
<div class="scrim" data-scrim hidden></div>`;
  return shell({ title: pool.label, active: 'pools', body, scripts: SCRIPT });
}

// ---------------------------------------------------------------- pools
const POOL_SAMPLES = {
  'lora-foret-textures': LORA, 'psychologie-2025': PSYCHO, 'saint-petersbourg-insolite': SPB,
};
const POOL_FILES = { 'lora-foret-textures': 'pool-lora.html', 'psychologie-2025': 'pool-psychologie.html', 'saint-petersbourg-insolite': 'pool-spb.html' };
const POOL_MOSAIC = {
  'creatures-abyssales-references': ['glow', 'river', 'ruins', 'canopy'], 'typographie-vernaculaire': ['postcard', 'canal_old', 'factory', 'loft'],
  'archives-sonores-urbaines': ['roofs', 'metro', null, null],
};
const POOL_MIX = {
  'creatures-abyssales-references': [['image', 188], ['page', 41], ['video', 25]], 'typographie-vernaculaire': [['image', 102], ['page', 31]],
  'archives-sonores-urbaines': [['page', 612], ['video', 203], ['data', 185]],
};

function poolsPage() {
  const cards = POOLS.map((p) => {
    const sample = POOL_SAMPLES[p.slug];
    const total = Object.values(p.usage).reduce((a, b) => a + b, 0);
    const mosaic = sample
      ? sample.filter((l) => l[5] && l[5] !== 'broken').slice(0, 4).map((l) => l[5])
      : POOL_MOSAIC[p.slug] ?? [];
    const cells = [0, 1, 2, 3].map((i) => mosaic[i] ? `<span><img src="${thumbFile(mosaic[i])}" alt="" loading="lazy"></span>` : sample ? `<span><img src="${faviconUri(hostOf([...new Map(sample.map((l) => [hostOf(l[1]), l])).values()][i][1]))}" alt="" style="width:26px;height:26px;border-radius:5px"></span>` : `<span>${icon('i-data')}</span>`).join('');
    const mix = sample
      ? countBy(sample, mediaOf, MEDIA).map((x) => [x.k, Math.round((x.v / sample.length) * p.items)]).slice(0, 4)
      : POOL_MIX[p.slug] ?? [];
    const href = POOL_FILES[p.slug] ?? '#';
    return `<li class="pool-card${p.items ? '' : ' empty'}">
    ${p.items ? `<div class="mosaic" aria-hidden="true">${cells}</div>` : ''}
    <h2><a href="${href}">${esc(p.label)}</a></h2>
    ${p.items ? `<div class="mix">${mix.map(([k, v]) => `<span>${icon(mediaIcon(k), 'sm')}${n(v)} ${mediaLabel(k).toLowerCase()}</span>`).join('')}</div>
    <div class="stackbar" role="img" aria-label="Usage : ${USAGE.filter(([k]) => p.usage[k]).map(([k, l]) => `${l} ${p.usage[k]}`).join(', ')}">${USAGE.filter(([k]) => p.usage[k]).map(([k]) => `<span class="seg-u" data-usage="${k}" style="flex-grow:${p.usage[k]}"></span>`).join('')}</div>` : '<p class="muted" style="margin:0">Pas encore matérialisé : la sélection est en cours de définition.</p>'}
    <div class="foot"><span>${n(p.items)} liens</span><span>${p.refreshed ? p.ago : 'jamais'}</span></div>
  </li>`;
  }).join('\n');
  const body = `<main class="xp-page" id="main">
  <div class="xp-head">
    <div>
      <h1>Vos pools</h1>
      <p class="lede">Des sélections d’URLs qualifiées par webpool : explorez-les par type de média, source et usage, puis copiez exactement la liste qu’il vous faut.</p>
    </div>
  </div>
  <form class="qfield" role="search" style="max-width:760px" onsubmit="event.preventDefault()">${icon('i-search')}<input type="search" aria-label="Rechercher dans tous vos pools" placeholder="Rechercher dans tous vos pools : écorce, psychométrie, Neva…"><kbd>Ctrl K</kbd></form>
  <div class="tabs" role="tablist" aria-label="Filtrer les pools" style="margin:16px 0 24px">
    <button class="tab" role="tab" aria-selected="true">Tous<span class="cnt">${POOLS.length}</span></button>
    <button class="tab" role="tab" aria-selected="false">${icon('i-image', 'sm')}Visuels<span class="cnt">4</span></button>
    <button class="tab" role="tab" aria-selected="false">${icon('i-page', 'sm')}Textuels<span class="cnt">2</span></button>
    <button class="tab" role="tab" aria-selected="false">Récemment mis à jour<span class="cnt">4</span></button>
  </div>
  <ul class="pool-cards">
${cards}
  </ul>
  <ul class="legend" aria-label="Légende des usages" style="margin-top:20px">
    ${USAGE.map(([k, l]) => `<li><span class="u-mark" data-usage="${k}" aria-hidden="true"></span><span class="name">${l}</span></li>`).join('')}
  </ul>
</main>`;
  return shell({ title: 'Vos pools', active: 'pools', body });
}

// ---------------------------------------------------------------- authentification
function authPage(mode, { error = false } = {}) {
  const tabs = `<nav class="auth-tabs" aria-label="Mode de connexion"><a href="connexion.html"${mode === 'compte' ? ' aria-current="page"' : ''}>Compte</a><a href="connexion-jeton.html"${mode === 'jeton' ? ' aria-current="page"' : ''}>Jeton d’API</a></nav>`;
  const forms = {
    compte: `${tabs}
      <h2>Se connecter</h2>
      <label class="field"><span>E-mail</span><input class="input" type="email" autocomplete="email" value="camille@atelier.example"></label>
      <label class="field"><span>Mot de passe</span><input class="input" type="password" autocomplete="current-password" value="motdepasse"><small><a href="#">Mot de passe oublié ?</a></small></label>
      <label class="check"><input type="checkbox" checked>Rester connecté sur cet appareil</label>
      <button class="btn btn-primary" style="min-height:44px">Se connecter</button>
      <div class="divider">ou</div>
      <button class="btn" type="button" style="min-height:44px">Recevoir un lien de connexion par e-mail</button>
      <p class="auth-alt">Pas encore de compte ? <a href="inscription.html">Créer un compte</a></p>`,
    jeton: `${tabs}
      <h2>Se brancher avec un jeton</h2>
      <p class="auth-alt">Pour l’auteur et les intégrations : le jeton se crée avec <code>webpool client add</code> et reste dans ce navigateur.</p>
      <label class="field"><span>URL de l’API</span><input class="input" type="url" value="https://api.webpool.example/api/v1"></label>
      <label class="field"><span>Jeton</span><input class="input" type="password" autocomplete="off" value="wp_live_xxxxxxxxxxxx"${error ? ' aria-invalid="true" aria-describedby="err"' : ''}></label>
      ${error ? `<p class="alert-box err" role="alert" id="err">${icon('i-x')}<span>Jeton refusé (401). Vérifiez qu’il n’a pas été révoqué.</span></p>` : ''}
      <button class="btn btn-primary" style="min-height:44px">${icon('i-plug')}Jack in</button>`,
    inscription: `<h2>Créer un compte</h2>
      <p class="auth-alt">Votre compte donne accès aux pools qui vous sont partagés, et garde vos vues et préférences.</p>
      <label class="field"><span>Nom</span><input class="input" autocomplete="name" value="Camille Arnaud"></label>
      <label class="field"><span>E-mail</span><input class="input" type="email" autocomplete="email" value="camille@atelier.example"></label>
      <label class="field"><span>Mot de passe</span><input class="input" type="password" autocomplete="new-password" value="motdepasse-long"><small>12 caractères au moins. <span style="color:var(--good)">✓ solide</span></small></label>
      <label class="field"><span>Code d’invitation <span class="muted" style="text-transform:none;letter-spacing:0">(facultatif)</span></span><input class="input" value="LORA-FORET-7Q2K" autocomplete="off"><small>Donne accès directement aux pools partagés avec vous.</small></label>
      <label class="check"><input type="checkbox">J’accepte les conditions d’utilisation et la politique de confidentialité.</label>
      <button class="btn btn-primary" style="min-height:44px">Créer mon compte</button>
      <p class="auth-alt">Déjà inscrit ? <a href="connexion.html">Se connecter</a></p>`,
  };
  const body = `<main class="auth" id="main">
  <section class="auth-side">
    <a class="brand" href="#"><span class="brand-mark" aria-hidden="true">dp</span><span>data<b>pool</b></span></a>
    <h1>Trouvez, filtrez, copiez <b>les bonnes sources</b>.</h1>
    <p>datapool ouvre les pools d’URLs choisies par webpool comme un moteur de recherche : par type de média, par source, par usage commercial.</p>
    <ul class="auth-points">
      <li>${icon('i-sliders')}<span>Filtres comptés et barre de recherche qui comprend <span class="mono">type:image usage:libre</span>.</span></li>
      <li>${icon('i-layers')}<span>Segments par type, source ou usage, copiables un par un.</span></li>
      <li>${icon('i-copy')}<span>La liste entière, ou seulement la sélection, en URLs, Markdown ou CSV.</span></li>
    </ul>
    <div class="auth-demo" aria-hidden="true">
      <div class="qfield" style="min-height:44px">${icon('i-search')}<span class="tok"><span class="k">type</span>${icon('i-image', 'sm')}Images</span><span class="tok"><span class="k">usage</span><span class="u-mark" data-usage="libre"></span>Libre</span><span class="muted">écorce</span></div>
      <span class="muted mono" style="font-size:12px">151 liens sur 412 · LoRA — textures de forêt</span>
    </div>
  </section>
  <form class="auth-form" onsubmit="event.preventDefault()">
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-ghost btn-sm theme-toggle" type="button" data-theme-toggle aria-pressed="false">${icon('i-sun')}<span class="lbl">Clair</span></button></div>
    ${forms[mode]}
  </form>
</main>`;
  return shell({ title: mode === 'inscription' ? 'Créer un compte' : 'Connexion', body, bare: true });
}

// ---------------------------------------------------------------- tableau de bord, fiche URL
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
      <thead><tr><th>Provider</th><th>Requête</th><th class="num hide-sm">Rang SERP</th><th>Découverte</th></tr></thead>
      <tbody>
        <tr><td class="mono">brave</td><td>musée insolite saint-pétersbourg souterrain</td><td class="num hide-sm">4</td><td class="mono nowrap">12 oct. 2026, 21:03</td></tr>
        <tr><td class="mono">brave</td><td>vodokanal water tower museum st petersburg</td><td class="num hide-sm">1</td><td class="mono nowrap">14 oct. 2026, 21:05</td></tr>
        <tr><td class="mono">europeana</td><td>водонапорная башня Петербург</td><td class="num hide-sm">—</td><td class="mono nowrap">19 oct. 2026, 20:47</td></tr>
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
  const swatch = (v, label) => `<li style="display:flex;align-items:center;gap:8px"><span style="width:28px;height:20px;border-radius:4px;background:var(${v});box-shadow:0 0 0 1px var(--line-strong)"></span><code>${v}</code><span class="muted">${label}</span></li>`;
  const spec = (t) => `<p class="muted" style="margin:8px 0 0;font-size:12px">${t}</p>`;
  const tok = (k, mark, label) => `<span class="tok"><span class="k">${k}</span>${mark}${label}<button type="button" aria-label="Retirer ${label}">${icon('i-close', 'sm')}</button></span>`;
  const opt = (mark, label, cnt, on = false, zero = false) => `<label class="opt${mark ? '' : ' plain'}${on ? ' on' : ''}${zero ? ' zero' : ''}"><input type="checkbox"${on ? ' checked' : ''}>${mark}<span class="lbl">${label}</span><span class="cnt">${cnt}</span></label>`;
  const states = [
    [LORA[0], 'vignette en cache'], [LORA[7], 'sans image : favicon'], [PSYCHO[10], 'sans image ni favicon : pictogramme'],
    [LORA[11], 'image cassée'], [LORA[10], 'sans titre : l’URL le remplace'], [[LONG_TITLE, PSYCHO[8][1], 'sous-conditions', 'page', PSYCHO[8][4], 'herbarium'], 'titre de 300 caractères'],
  ];
  const list = (d) => `<ol class="items d-${d}">${states.map(([l], i) => item(l, i + 1)).join('')}</ol>`;
  const body = `<main class="xp-page" id="main">
  <div class="xp-head"><div><span class="eyebrow">Data Pool · bibliothèque v2</span><h1>Composants</h1>
  <p class="lede">Synthèse des propositions A (facettes), B (requête) et C (segments) : voir <a href="index.html#comparaison">la comparaison</a>.</p></div></div>

  <div class="section-title"><h2>Barre de requête à jetons</h2><span class="eyebrow">B</span></div>
  <div style="min-height:210px;max-width:820px"><div class="xp-query">
    <form class="qfield" onsubmit="event.preventDefault()">${icon('i-search')}${tok('type', icon('i-image', 'sm'), 'Images')}${tok('usage', '<span class="u-mark" data-usage="libre"></span>', 'Libre')}<input type="search" aria-label="Rechercher" value="banq"><button class="qclear" type="button">Effacer</button><kbd>/</kbd></form>
    <div class="sugg" role="listbox">
      <span class="eyebrow">Filtres correspondants</span>
      <button class="sugg-item" role="option" aria-selected="true"><span class="k">source</span>Banques d’images<span class="cnt">124</span></button>
      <p class="sugg-help">Écrire <span class="mono">type:</span> <span class="mono">source:</span> <span class="mono">usage:</span> <span class="mono">domaine:</span> · <kbd>/</kbd> pour revenir ici · <kbd>Échap</kbd> pour fermer</p>
    </div>
  </div></div>
  ${spec('Texte libre et filtres dans le même champ. Chaque filtre choisi ailleurs (onglet, facette, vue) apparaît ici en jeton : la syntaxe s’apprend en regardant. Retour arrière sur un champ vide retire le dernier jeton. Suggestions comptées, navigables aux flèches.')}

  <div class="section-title"><h2>Onglets de segments</h2><span class="eyebrow">C</span></div>
  <div class="xp-segs" style="margin:0">
    <label class="segby">Segmenter par <select aria-label="Segmenter par"><option>type</option><option>source</option><option>usage</option></select></label>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" aria-selected="false">Tout<span class="cnt">412</span></button>
      <button class="tab" role="tab" aria-selected="true">${icon('i-image', 'sm')}Images<span class="cnt">316</span><span class="share" style="width:77%"></span></button>
      <button class="tab" role="tab" aria-selected="false">${icon('i-page', 'sm')}Pages<span class="cnt">14</span><span class="share" style="width:3%"></span></button>
      <button class="tab" role="tab" aria-selected="false">${icon('i-video', 'sm')}Vidéos<span class="cnt">27</span><span class="share" style="width:7%"></span></button>
      <button class="tab" role="tab" aria-selected="false">${icon('i-data', 'sm')}Données<span class="cnt">14</span><span class="share" style="width:3%"></span></button>
    </div>
  </div>
  ${spec('Une ligne montre la composition du pool ; le filet sous chaque onglet donne sa part. Changer de dimension (type, source, usage) garde le filtre en cours en le reportant dans les facettes.')}

  <div class="cols" style="margin-top:24px">
    <section class="panel"><div class="panel-head"><h2>Panneau de facettes (A)</h2></div>
      <div style="display:grid;gap:18px;max-width:260px">
        <fieldset class="facet"><legend>Source</legend>${opt('', 'Recherche', '14')}${opt('', 'Archives et musées', '82')}${opt('', 'Banques d’images', '220', true)}${opt('', 'Communautés', '0', false, true)}</fieldset>
        <fieldset class="facet"><legend>Usage commercial</legend>${USAGE.map(([k, l], i) => opt(`<span class="u-mark" data-usage="${k}"></span>`, l, ['179', '110', '27', '41', '55'][i], i === 0)).join('')}</fieldset>
      </div>
      ${spec('Effectifs calculés avec les autres filtres ; valeur à zéro atténuée mais visible. Panneau repliable (bouton « Filtres »), tiroir sous 1 100 px, feuille du bas sur mobile.')}
    </section>
    <section class="panel"><div class="panel-head"><h2>Vues enregistrées (B)</h2></div>
      <div class="views" style="max-width:280px">
        <button class="view-btn" aria-current="false">${icon('i-layers', 'sm')}Tout le pool</button>
        <button class="view-btn" aria-current="true">${icon('i-bookmark', 'sm')}Images libres</button>
        <button class="view-btn">${icon('i-bookmark', 'sm')}Textures CC0</button>
        <button class="view-btn save">${icon('i-sparkle', 'sm')}Enregistrer la vue actuelle</button>
      </div>
      ${spec('Une vue = segment + filtres + recherche + densité. Mémorisée dans le navigateur aujourd’hui, dans le compte demain.')}
    </section>
    <section class="panel" style="min-height:300px"><div class="panel-head"><h2>Menu de compte</h2></div>
      <div class="account" style="display:inline-block">
        <button class="avatar" type="button" aria-expanded="true" aria-label="Compte">CA</button>
        <div class="menu" role="menu" style="left:0;right:auto">
          <div class="who"><strong>Camille Arnaud</strong><span class="muted mono">camille@atelier.example · lecture</span></div>
          <a class="menu-item" role="menuitem" href="#">${icon('i-bookmark', 'sm')}<b>Mes vues enregistrées</b></a>
          <a class="menu-item" role="menuitem" href="#">${icon('i-sliders', 'sm')}<b>Préférences</b></a>
          <a class="menu-item" role="menuitem" href="#">${icon('i-plug', 'sm')}<b>Jetons d’API</b></a>
          <a class="menu-item" role="menuitem" href="#">${icon('i-close', 'sm')}<b>Se déconnecter</b></a>
        </div>
      </div>
    </section>
  </div>

  <div class="section-title"><h2>Élément de résultat — Confort</h2><span class="eyebrow">défaut · aéré</span></div>
  ${list('comfort')}
  ${spec('États dans l’ordre : ' + states.map(([, s], i) => `#${i + 1} ${s}`).join(' · ') + '. L’œil ouvre l’aperçu.')}
  <div class="section-title"><h2>Élément de résultat — Compact</h2><span class="eyebrow">28 px · 25 liens par écran</span></div>
  ${list('compact')}
  <div class="section-title"><h2>Élément de résultat — Grille</h2><span class="eyebrow">pools visuels</span></div>
  ${list('grid')}

  <div class="section-title"><h2>Groupe et aperçu</h2></div>
  <div class="cols">
    <section>
      <h2 class="xp-gh" style="position:static">Banques d’images<span class="cnt">124 liens</span><button class="btn btn-ghost btn-sm" type="button">${icon('i-copy', 'sm')}Copier ce groupe</button></h2>
      <ol class="items d-compact">${LORA.slice(1, 4).map((l, i) => item(l, i + 2)).join('')}</ol>
      ${spec('« Grouper par » source, type, usage ou domaine : en-tête collant, effectif, copie du groupe seul.')}
    </section>
    <aside class="xp-preview" style="position:static">
      ${thumbBlock(LORA[0], 1)}
      <h2>${esc(LORA[0][0])}</h2><p>${esc(LORA[0][4])}</p>
      <div class="url-full">${esc(LORA[0][1])}</div>
      <dl class="kv"><dt>type</dt><dd>Image</dd><dt>source</dt><dd>Banques d’images · <span class="mono">flickr.com</span></dd><dt>usage</dt><dd>${badge(LORA[0][2])}</dd></dl>
      <div class="actions"><a class="btn btn-primary btn-sm" href="#">${icon('i-arrow', 'sm')}Ouvrir</a><button class="btn btn-sm">${icon('i-copy', 'sm')}Copier l’URL</button></div>
    </aside>
  </div>

  <div class="section-title"><h2>Jetons</h2></div>
  <div class="cols">
    <section class="panel"><div class="panel-head"><h2>Surfaces et encre</h2></div><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
      ${swatch('--bg', 'page')}${swatch('--surface', 'panneaux')}${swatch('--surface-2', 'survol, champs')}${swatch('--ink', 'texte')}${swatch('--ink-2', 'secondaire')}${swatch('--muted', 'méta')}${swatch('--line-strong', 'bords de contrôle')}
    </ul></section>
    <section class="panel"><div class="panel-head"><h2>Néon et statut</h2></div><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
      ${swatch('--accent', 'action, sélection')}${swatch('--accent-2', 'focus')}${swatch('--link', 'liens')}${swatch('--good', 'ok')}${swatch('--warning', 'alerte')}${swatch('--critical', 'échec')}
    </ul></section>
    <section class="panel"><div class="panel-head"><h2>Usage commercial (ordre fixe)</h2></div><ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
      ${swatch('--usage-libre', '1 · rond')}${swatch('--usage-sous-conditions', '2 · demi-rond')}${swatch('--usage-payant', '3 · carré')}${swatch('--usage-non-commercial', '4 · triangle')}${swatch('--usage-a-qualifier', 'gris · pointillé')}
    </ul>${spec('Validé daltonisme (ΔE ≥ 8 entre toutes les paires) et ≥ 3:1 sur la surface, dans les deux thèmes.')}</section>
  </div>

  <div class="section-title"><h2>Badge d’usage et répartition</h2></div>
  <div class="panel">
    <div style="display:flex;flex-wrap:wrap;gap:10px">${USAGE.map(([k]) => badge(k)).join('')}</div>
    <div style="margin-top:16px;max-width:560px">${usageSummary({ libre: 168, 'sous-conditions': 121, payant: 22, 'non-commercial': 37, 'a-qualifier': 64 })}</div>
  </div>

  <div class="section-title"><h2>Copier les N liens</h2></div>
  <div class="cols">
    <section class="panel"><div class="panel-head"><h2>Repos</h2></div>${copyWidget(412, { id: 'c1' })}${spec('Copie tout le pool, ou la sélection filtrée (« Copier les 151 liens filtrés »).')}</section>
    <section class="panel" style="min-height:280px"><div class="panel-head"><h2>Menu de format</h2></div>${copyWidget(412, { id: 'c2', menuOpen: true })}</section>
    <section class="panel"><div class="panel-head"><h2>En cours</h2></div>${copyWidget(1000, { id: 'c3', status: 'busy' })}</section>
    <section class="panel"><div class="panel-head"><h2>Confirmé</h2></div>${copyWidget(151, { id: 'c4', format: 'md', status: 'ok' })}</section>
    <section class="panel"><div class="panel-head"><h2>Erreur</h2></div>${copyWidget(187, { id: 'c5', status: 'err' })}</section>
  </div>

  <div class="section-title"><h2>Tuiles, statuts, pagination</h2></div>
  <div class="tiles">
    ${tile({ label: 'URLs connues', value: n(48213), sub: '<span class="up">+231</span> aujourd’hui' })}
    ${tile({ label: 'Classées', value: n(39870), sub: '82,7 % du corpus', bar: 82.7 })}
    ${tile({ label: 'Pools', value: '7', sub: 'tuile-lien', href: '#' })}
    ${tile({ label: 'À qualifier', value: n(642), sub: 'avertissement', cls: 'warn', href: '#' })}
    ${tile({ label: 'En erreur', value: n(407), sub: 'alerte', cls: 'alert', href: '#' })}
  </div>
  <div class="panel" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
    <span class="status ok">${icon('i-check', 'sm')}ok</span><span class="status failed">${icon('i-x', 'sm')}échec</span><span class="status running">${icon('i-run', 'sm')}en cours</span><span class="status warn">${icon('i-alert', 'sm')}alerte</span><span class="status idle">jamais</span><span class="soon">bientôt</span>
  </div>
  <div class="panel" style="display:grid;gap:8px;margin-top:12px">${pager(412, 30, 1)}${pager(412, 30, 7)}</div>
</main>`;
  return shell({ title: 'Composants', active: '', body, root: '' })
    .replaceAll('href="pools.html"', 'href="mockups/pools.html"').replaceAll('href="dashboard.html"', 'href="mockups/dashboard.html"')
    .replaceAll('href="connexion.html"', 'href="mockups/connexion.html"').replace(/src="media\//g, 'src="mockups/media/');
}

// ---------------------------------------------------------------- écriture
const POOL = Object.fromEntries(POOLS.map((p) => [p.slug, p]));
const LORA_VIEWS = [
  ['Images libres', { tab: 'image', f: { usage: ['libre'] } }],
  ['Textures CC0 des banques d’images', { tab: 'image', f: { source: ['stock'], usage: ['libre'] } }],
  ['À vérifier avant usage', { f: { usage: ['sous-conditions', 'a-qualifier'] } }],
];
const PSY_VIEWS = [
  ['Accès libre', { f: { usage: ['libre'] } }],
  ['Vidéos et cours', { tab: 'video' }],
  ['Documents PDF', { tab: 'pdf' }],
];
const SPB_VIEWS = [
  ['Images', { tab: 'image' }],
  ['Archives et musées', { f: { source: ['archives'] } }],
  ['À vérifier avant usage', { f: { usage: ['a-qualifier'] } }],
];
const LEDE = {
  lora: 'Textures, ambiances et références de sous-bois pour entraîner un LoRA : photos, scans PBR, gravures et jeux de données.',
  psy: 'Articles, préprints, données ouvertes et conférences marquants de 2025 en psychologie.',
  spb: 'Lieux méconnus, cours intérieures, musées étranges et archives photographiques de Saint-Pétersbourg.',
};
const out = {
  'mockups/connexion.html': authPage('compte'),
  'mockups/connexion-jeton.html': authPage('jeton', { error: true }),
  'mockups/inscription.html': authPage('inscription'),
  'mockups/pools.html': poolsPage(),
  'mockups/pool-psychologie.html': explorerPage({ pool: POOL['psychologie-2025'], links: PSYCHO, lede: LEDE.psy, views: PSY_VIEWS, state: { density: 'comfort' } }),
  'mockups/pool-psychologie-compact.html': explorerPage({ pool: POOL['psychologie-2025'], links: PSYCHO, lede: LEDE.psy, views: PSY_VIEWS, state: { density: 'compact', side: false } }),
  'mockups/pool-psychologie-groupes.html': explorerPage({ pool: POOL['psychologie-2025'], links: PSYCHO, lede: LEDE.psy, views: PSY_VIEWS, state: { density: 'compact', group: 'source', f: { usage: ['libre', 'sous-conditions'] } } }),
  'mockups/pool-lora.html': explorerPage({ pool: POOL['lora-foret-textures'], links: LORA, lede: LEDE.lora, views: LORA_VIEWS, state: { density: 'grid' } }),
  'mockups/pool-lora-apercu.html': explorerPage({ pool: POOL['lora-foret-textures'], links: LORA, lede: LEDE.lora, views: LORA_VIEWS, state: { density: 'grid', tab: 'image', f: { usage: ['libre'] }, preview: '2', view: 'Images libres' } }),
  'mockups/pool-spb.html': explorerPage({ pool: POOL['saint-petersbourg-insolite'], links: SPB, lede: LEDE.spb, views: SPB_VIEWS, state: { density: 'comfort', seg: 'source', group: 'media' } }),
  'mockups/pool-spb-recherche.html': explorerPage({ pool: POOL['saint-petersbourg-insolite'], links: SPB, lede: LEDE.spb, views: SPB_VIEWS, state: { density: 'comfort', q: 'mus', sugg: true } }),
  'mockups/pool-spb-filtres.html': explorerPage({ pool: POOL['saint-petersbourg-insolite'], links: SPB, lede: LEDE.spb, views: SPB_VIEWS, state: { density: 'comfort', sideOpen: true, f: { source: ['archives'] } } }),
  'mockups/dashboard.html': dashboardPage(),
  'mockups/url.html': urlPage(),
  'components.html': componentsPage(),
};
for (const [file, html] of Object.entries(out)) writeFileSync(`${DESIGN}${file}`, html);
console.log(`${Object.keys(out).length} pages`);

<script lang="ts">
  import { untrack } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { Schemas } from '#lib/api/client.ts';
  import { copyText, fetchAllLinks, formatLinks, getCopyFormat } from '#lib/copy.ts';
  import {
    clearFilters,
    enrich,
    filterLinks,
    fromParams,
    groupLinks,
    labelOf,
    toParams,
    tokens,
    activeCount,
    type Density,
    type Group,
    type XLink,
    type XState,
  } from '#lib/explore.ts';
  import { fmtDate, fmtNumber } from '#lib/format.ts';
  import { MEDIA } from '#lib/kinds.ts';
  import { session } from '#lib/session.svelte.ts';
  import { loadViews, removeView, saveView, type SavedView } from '#lib/views.ts';
  import CopyLinks from './CopyLinks.svelte';
  import FacetPanel from './FacetPanel.svelte';
  import Icon from './Icon.svelte';
  import LinkPreview from './LinkPreview.svelte';
  import Pager from './Pager.svelte';
  import QueryBar from './QueryBar.svelte';
  import ResultItem from './ResultItem.svelte';
  import SegmentTabs from './SegmentTabs.svelte';

  // Explorateur d'un pool : le pool entier (≤ 1 000 liens) est chargé une fois,
  // puis filtres, effectifs, segments et groupes se calculent ici. L'état vit
  // dans l'URL (liens partageables, retour arrière, vues enregistrées).
  let { pool }: { pool: Schemas['Pool'] } = $props();

  const LIMIT = 50;
  const DENSITY_KEY = 'datapool.density';
  const SIDE_KEY = 'datapool.facets';

  let links = $state<XLink[] | null>(null);
  let loadError = $state('');
  let offset = $state(0);
  let preview = $state<XLink | null>(null);
  let side = $state(localStorage.getItem(SIDE_KEY) !== 'hidden');
  let sideOpen = $state(false);
  let width = $state(1366);
  let storedDensity = $state<Density>((localStorage.getItem(DENSITY_KEY) as Density) || 'comfort');
  let views = $state<SavedView[]>([]);
  let groupStatus = $state<Record<string, string>>({});

  $effect(() => {
    const slug = pool.slug;
    links = null;
    loadError = '';
    preview = null;
    views = loadViews(slug);
    fetchAllLinks(session.client!, slug)
      .then((all) => {
        if (slug === pool.slug) links = all.map(enrich);
      })
      .catch((err: Error) => (loadError = err.message));
  });

  // L'état fait foi en mémoire ; l'URL en est le reflet. Le lire depuis l'URL
  // ferait partir deux actions rapprochées du même état périmé (la navigation
  // est asynchrone). L'URL n'est relue qu'à l'arrivée et au retour arrière.
  let xs = $state<XState>(fromParams(page.url.searchParams, { density: untrack(() => storedDensity) }));
  afterNavigate((nav) => {
    if (nav.type === 'popstate') xs = fromParams(page.url.searchParams, { density: storedDensity });
  });
  const all = $derived(links ?? []);
  const visible = $derived(filterLinks(all, xs));
  const groups = $derived(xs.group === 'none' ? [] : groupLinks(visible, xs.group, all));
  const shown = $derived(xs.group === 'none' ? visible.slice(offset, offset + LIMIT) : visible);
  // Une vue = l'état sans la densité (préférence d'affichage, pas de sélection).
  const viewKey = (s: XState) => toParams({ ...s, density: 'comfort' }).toString();
  const currentView = $derived(viewKey(xs));

  function update(next: XState) {
    xs = next;
    offset = 0;
    const query = toParams(next).toString();
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- même page, seule la query string change
    goto(`${page.url.pathname}${query ? `?${query}` : ''}`, { replace: true, reset: false });
  }

  function setDensity(density: Density) {
    storedDensity = density;
    localStorage.setItem(DENSITY_KEY, density);
    update({ ...xs, density });
  }

  function toggleSide() {
    if (width < 1100) sideOpen = !sideOpen;
    else {
      side = !side;
      localStorage.setItem(SIDE_KEY, side ? 'shown' : 'hidden');
    }
  }

  function applyView(params: string) {
    update(fromParams(new URLSearchParams(params), { density: xs.density }));
  }

  function saveCurrentView() {
    const parts = tokens(xs).map((t) => labelOf(t.dim, t.value));
    if (xs.q) parts.push(`« ${xs.q} »`);
    views = saveView(pool.slug, { name: parts.join(' · ') || 'Tout le pool', params: currentView });
  }

  async function copyGroup(value: string, members: XLink[]) {
    try {
      await copyText(formatLinks(members, getCopyFormat()));
      groupStatus[value] = `${fmtNumber(members.length)} liens copiés`;
    } catch (err) {
      groupStatus[value] = (err as Error).message;
    }
    setTimeout(() => delete groupStatus[value], 4000);
  }

  const peek = (link: XLink) => (preview = preview?.rank === link.rank ? null : link);
  const mediaIcon = (v: string) => MEDIA.find((m) => m.key === v)?.icon;
  const DENSITIES: { key: Density; label: string; icon: string }[] = [
    { key: 'comfort', label: 'Confort', icon: 'comfort' },
    { key: 'compact', label: 'Compact', icon: 'dense' },
    { key: 'grid', label: 'Grille', icon: 'grid' },
  ];
</script>

<svelte:window
  bind:innerWidth={width}
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    sideOpen = false;
    if (width < 1280) preview = null;
  }}
/>

<div class="xp-head">
  <div>
    <h1>{pool.label}</h1>
    <div class="meta">
      <code>{pool.slug}</code>
      <span>{fmtNumber(pool.items)} liens</span>
      <span>{pool.refreshed_at ? `matérialisé le ${fmtDate(pool.refreshed_at)}` : 'jamais matérialisé'}</span>
    </div>
  </div>
  <div class="actions">
    <CopyLinks slug={pool.slug} count={links ? visible.length : pool.items} filtered={!!links && visible.length !== all.length} load={() => visible} />
  </div>
</div>

{#if loadError}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{loadError}</div>
{:else if !links}
  <p class="terminal-line">&gt; chargement des {fmtNumber(pool.items)} liens<span class="caret" aria-hidden="true"></span></p>
{:else}
  <div class="xp" class:no-side={!side} class:side-open={sideOpen} class:has-preview={!!preview}>
    <FacetPanel
      {xs}
      links={all}
      shown={visible.length}
      {views}
      {currentView}
      onchange={update}
      onview={applyView}
      onsave={saveCurrentView}
      onremove={(params) => (views = removeView(pool.slug, params))}
      onclose={() => (sideOpen = false)}
    />

    <div class="xp-main">
      <QueryBar {xs} links={all} onchange={update} />
      <SegmentTabs {xs} links={all} onchange={update} />
      <div class="xp-bar">
        <span class="xp-count" aria-live="polite">
          {fmtNumber(visible.length)} liens{#if visible.length !== all.length}&nbsp;<span class="muted">sur {fmtNumber(all.length)}</span>{/if}
        </span>
        <button class="btn btn-sm btn-filters" type="button" aria-controls="xp-side" aria-expanded={width < 1100 ? sideOpen : side} onclick={toggleSide}>
          <Icon name="sliders" small />Filtres <span class="badge-n">{activeCount(xs) || ''}</span>
        </button>
        <label class="ctl ctl-group"
          >Grouper par
          <select value={xs.group} onchange={(e) => update({ ...xs, group: e.currentTarget.value as Group })}>
            <option value="none">aucun</option>
            <option value="source">source</option>
            <option value="media">type</option>
            <option value="usage">usage</option>
            <option value="domain">domaine</option>
          </select>
        </label>
        <div class="seg" role="group" aria-label="Densité d'affichage">
          {#each DENSITIES as d (d.key)}
            <button type="button" aria-pressed={xs.density === d.key} aria-label={d.label} onclick={() => setDensity(d.key)}>
              <Icon name={d.icon} small /><span class="lbl-d">{d.label}</span>
            </button>
          {/each}
        </div>
      </div>

      {#if visible.length === 0}
        <div class="xp-empty">
          <strong>Aucun lien pour ces filtres</strong>Retirez un filtre ou
          <button class="qclear" type="button" onclick={() => update(clearFilters(xs))}>effacez la recherche</button>.
        </div>
      {:else if xs.group === 'none'}
        <ol class="items d-{xs.density}">
          {#each shown as link (link.rank)}
            <ResultItem {link} peeked={preview?.rank === link.rank} onpeek={peek} />
          {/each}
        </ol>
        <Pager total={visible.length} limit={LIMIT} bind:offset />
      {:else}
        {#each groups as g (g.value)}
          <section class="xp-group">
            <h2 class="xp-gh">
              {#if xs.group === 'usage'}<span class="u-mark" data-usage={g.value} aria-hidden="true"></span>
              {:else if xs.group === 'media' && mediaIcon(g.value)}<Icon name={mediaIcon(g.value)!} small />{/if}
              {labelOf(xs.group, g.value)}<span class="cnt">{fmtNumber(g.links.length)} liens</span>
              <button class="btn btn-ghost btn-sm" type="button" onclick={() => copyGroup(g.value, g.links)}>
                <Icon name="copy" small />Copier ce groupe
              </button>
              {#if groupStatus[g.value]}<span class="secondary" role="status">{groupStatus[g.value]}</span>{/if}
            </h2>
            <ol class="items d-{xs.density}">
              {#each g.links as link (link.rank)}
                <ResultItem {link} peeked={preview?.rank === link.rank} onpeek={peek} />
              {/each}
            </ol>
          </section>
        {/each}
      {/if}
    </div>

    {#if preview}
      <LinkPreview link={preview} onclose={() => (preview = null)} />
    {/if}
  </div>
  <!-- voile : un toucher ferme le tiroir ou l'aperçu ; au clavier, Échap fait de même -->
  <div
    class="scrim"
    role="presentation"
    hidden={!(sideOpen || (preview && width < 1280))}
    onclick={() => ((sideOpen = false), width < 1280 && (preview = null))}
  ></div>
{/if}

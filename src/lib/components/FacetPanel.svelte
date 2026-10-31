<script lang="ts">
  import { fmtNumber } from '#lib/format.ts';
  import { MEDIA } from '#lib/kinds.ts';
  import { counts, labelOf, orderOf, toggleFilter, type Dim, type XLink, type XState } from '#lib/explore.ts';
  import type { SavedView } from '#lib/views.ts';
  import Icon from './Icon.svelte';

  // Vues enregistrées et facettes à cases cochées. Chaque effectif tient
  // compte des autres filtres (pas de la facette elle-même).
  let {
    xs,
    links,
    shown,
    views,
    currentView,
    onchange,
    onview,
    onsave,
    onremove,
    onclose,
  }: {
    xs: XState;
    links: XLink[];
    shown: number;
    views: SavedView[];
    currentView: string;
    onchange: (s: XState) => void;
    onview: (params: string) => void;
    onsave: () => void;
    onremove: (params: string) => void;
    onclose: () => void;
  } = $props();

  const FACETS: { dim: Dim; title: string; plural: string; limit: number }[] = [
    { dim: 'media', title: 'Type de média', plural: 'types', limit: 99 },
    { dim: 'source', title: 'Source', plural: 'sources', limit: 99 },
    { dim: 'usage', title: 'Usage commercial', plural: 'usages', limit: 99 },
    { dim: 'domain', title: 'Domaine', plural: 'domaines', limit: 5 },
  ];
  let expanded = $state<Record<string, boolean>>({});
  const icon = (v: string) => MEDIA.find((m) => m.key === v)?.icon;
</script>

<aside class="xp-side" id="xp-side" aria-label="Filtres">
  <div class="xp-side-head">
    <h2>Filtres</h2>
    <button class="btn btn-ghost btn-sm" type="button" aria-label="Fermer les filtres" onclick={onclose}><Icon name="close" small /></button>
  </div>
  <section>
    <h2>Vues</h2>
    <div class="views">
      <button class="view-btn" type="button" aria-current={currentView === ''} onclick={() => onview('')}>
        <Icon name="layers" small />Tout le pool
      </button>
      {#each views as v (v.params)}
        <span class="view-row">
          <button class="view-btn" type="button" aria-current={currentView === v.params} onclick={() => onview(v.params)}>
            <Icon name="bookmark" small />{v.name}
          </button>
          <button class="btn btn-ghost btn-sm" type="button" aria-label={`Supprimer la vue ${v.name}`} onclick={() => onremove(v.params)}>
            <Icon name="close" small />
          </button>
        </span>
      {/each}
      {#if currentView !== '' && !views.some((v) => v.params === currentView)}
        <button class="view-btn save" type="button" onclick={onsave}><Icon name="sparkle" small />Enregistrer la vue actuelle</button>
      {/if}
    </div>
  </section>
  {#each FACETS.filter((f) => f.dim !== xs.seg) as f (f.dim)}
    {@const c = counts(links, f.dim, xs, f.dim)}
    {@const values = orderOf(f.dim, links).filter((v) => c.get(v) || xs.f[f.dim].includes(v))}
    {@const visible = expanded[f.dim] ? values : values.slice(0, f.limit)}
    <fieldset class="facet">
      <legend>{f.title}</legend>
      {#each visible as v (v)}
        {@const on = xs.f[f.dim].includes(v)}
        {@const n = c.get(v) ?? 0}
        <label class="opt" class:plain={f.dim === 'source' || f.dim === 'domain'} class:on class:zero={!n}>
          <input type="checkbox" checked={on} onchange={() => onchange(toggleFilter(xs, f.dim, v))} />
          {#if f.dim === 'usage'}<span class="u-mark" data-usage={v} aria-hidden="true"></span>
          {:else if f.dim === 'media' && icon(v)}<Icon name={icon(v)!} small />{/if}
          <span class="lbl" class:mono={f.dim === 'domain'}>{labelOf(f.dim, v)}</span><span class="cnt">{fmtNumber(n)}</span>
        </label>
      {/each}
      {#if values.length > f.limit}
        <button class="more" type="button" onclick={() => (expanded[f.dim] = !expanded[f.dim])}>
          {expanded[f.dim] ? 'Moins' : `Voir les ${values.length} ${f.plural}`}
        </button>
      {/if}
    </fieldset>
  {/each}
  <p class="side-note">Les effectifs tiennent compte des autres filtres.</p>
  <div class="xp-side-foot">
    <button class="btn btn-primary" type="button" onclick={onclose}>Afficher les {fmtNumber(shown)} liens</button>
  </div>
</aside>

<script lang="ts">
  import { fmtNumber } from '#lib/format.ts';
  import { MEDIA } from '#lib/kinds.ts';
  import { changeSeg, counts, labelOf, orderOf, type SegDim, type XLink, type XState } from '#lib/explore.ts';
  import Icon from './Icon.svelte';

  // Composition du pool en une ligne : un onglet par valeur de la dimension
  // choisie (type, source, usage), avec son effectif et sa part.
  let { xs, links, onchange }: { xs: XState; links: XLink[]; onchange: (s: XState) => void } = $props();

  const c = $derived(counts(links, xs.seg, xs, 'tab'));
  const all = $derived([...c.values()].reduce((a, b) => a + b, 0));
  const values = $derived(orderOf(xs.seg, links).filter((v) => c.get(v) || xs.tab === v));
  const icon = (v: string) => MEDIA.find((m) => m.key === v)?.icon;
</script>

<div class="xp-segs">
  <label class="segby"
    >Segmenter par
    <select value={xs.seg} onchange={(e) => onchange(changeSeg(xs, e.currentTarget.value as SegDim))} aria-label="Segmenter par">
      <option value="media">type</option>
      <option value="source">source</option>
      <option value="usage">usage</option>
    </select>
  </label>
  <div class="tabs" role="tablist" aria-label="Segments">
    <button class="tab" role="tab" aria-selected={!xs.tab} onclick={() => onchange({ ...xs, tab: '' })}>
      Tout<span class="cnt">{fmtNumber(all)}</span>
    </button>
    {#each values as v (v)}
      {@const n = c.get(v) ?? 0}
      <button class="tab" class:zero={!n} role="tab" aria-selected={xs.tab === v} onclick={() => onchange({ ...xs, tab: v })}>
        {#if xs.seg === 'usage'}<span class="u-mark" data-usage={v} aria-hidden="true"></span>
        {:else if xs.seg === 'media' && icon(v)}<Icon name={icon(v)!} small />{/if}
        {labelOf(xs.seg, v)}<span class="cnt">{fmtNumber(n)}</span>
        <span class="share" style:width={`${all ? (n / all) * 100 : 0}%`}></span>
      </button>
    {/each}
  </div>
</div>

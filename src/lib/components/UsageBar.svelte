<script lang="ts">
  import { fmtNumber, usageSegments } from '#lib/format.ts';

  // Répartition des URLs par usage commercial du domaine : barre empilée,
  // légende chiffrée (la couleur ne porte jamais seule l'information).
  let { rows }: { rows: { usage?: string | null; urls?: number }[] } = $props();
  const segments = $derived(usageSegments(rows));
</script>

{#if segments.length}
  <div class="bar" role="img" aria-label={segments.map((s) => `${s.label} : ${s.urls}`).join(', ')}>
    {#each segments as s (s.label)}
      <span
        class="seg"
        style:flex-grow={s.urls}
        style:background={s.color}
        title={`${s.label} : ${fmtNumber(s.urls)} URLs (${Math.round(s.share * 100)} %)`}
      ></span>
    {/each}
  </div>
  <ul class="legend">
    {#each segments as s (s.label)}
      <li>
        <span class="swatch" style:background={s.color}></span>
        {s.label} <strong>{fmtNumber(s.urls)}</strong>
        <span class="muted">{Math.round(s.share * 100)} %</span>
      </li>
    {/each}
  </ul>
{:else}
  <p class="muted">Aucune URL.</p>
{/if}

<style>
  .bar { display: flex; gap: 2px; height: 16px; }
  .seg { min-width: 4px; }
  .seg:first-child { border-radius: 4px 0 0 4px; }
  .seg:last-child { border-radius: 0 4px 4px 0; }
  .seg:only-child { border-radius: 4px; }
  .seg:hover { outline: 2px solid var(--ink); outline-offset: 1px; }
  .legend { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; list-style: none; padding: 0; margin: 0.5rem 0 0; font-size: 0.85rem; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 0.25rem; }
</style>

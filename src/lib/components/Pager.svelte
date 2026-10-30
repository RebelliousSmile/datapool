<script lang="ts">
  import { fmtNumber } from '#lib/format.ts';

  let { total, limit, offset = $bindable() }: { total: number; limit: number; offset: number } = $props();
</script>

<nav class="pager" aria-label="Pagination">
  <button disabled={offset === 0} onclick={() => (offset = Math.max(0, offset - limit))}>Précédent</button>
  <span class="secondary">
    {total === 0 ? 0 : fmtNumber(offset + 1)}–{fmtNumber(Math.min(offset + limit, total))} sur {fmtNumber(total)}
  </span>
  <button disabled={offset + limit >= total} onclick={() => (offset += limit)}>Suivant</button>
</nav>

<style>
  .pager { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.75rem; }
</style>

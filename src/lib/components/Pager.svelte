<script lang="ts">
  import { fmtNumber, pageList } from '#lib/format.ts';

  let { total, limit, offset = $bindable() }: { total: number; limit: number; offset: number } = $props();

  const count = $derived(Math.max(1, Math.ceil(total / limit)));
  const current = $derived(Math.floor(offset / limit) + 1);
  const go = (page: number) => {
    if (page >= 1 && page <= count && page !== current) offset = (page - 1) * limit;
  };
</script>

<nav class="pager" aria-label="Pagination">
  <span class="range">
    {total === 0 ? 0 : fmtNumber(offset + 1)}–{fmtNumber(Math.min(offset + limit, total))} sur {fmtNumber(total)}
  </span>
  {#if count > 1}
    <ol>
      <li>
        <button class="pg" type="button" aria-label="Page précédente" aria-disabled={current === 1} onclick={() => go(current - 1)}>
          <span aria-hidden="true">‹</span>
        </button>
      </li>
      {#each pageList(current, count) as p, i (p ?? `gap-${i}`)}
        <li>
          {#if p === null}
            <span class="pg gap" aria-hidden="true">…</span>
          {:else}
            <button
              class="pg"
              type="button"
              aria-current={p === current ? 'page' : undefined}
              aria-label={`Page ${p}`}
              onclick={() => go(p)}>{p}</button
            >
          {/if}
        </li>
      {/each}
      <li>
        <button class="pg" type="button" aria-label="Page suivante" aria-disabled={current === count} onclick={() => go(current + 1)}>
          <span aria-hidden="true">›</span>
        </button>
      </li>
    </ol>
  {/if}
</nav>

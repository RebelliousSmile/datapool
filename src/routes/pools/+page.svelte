<script lang="ts">
  import Icon from '#lib/components/Icon.svelte';
  import PoolCard from '#lib/components/PoolCard.svelte';
  import { fmtNumber } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';

  const pools = $derived(session.client?.pools());
  let filter = $state('');
  const matches = (p: { slug: string; label: string }) =>
    `${p.label} ${p.slug}`.toLowerCase().includes(filter.trim().toLowerCase());
</script>

{#await pools}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{:then res}
  {@const items = res?.items ?? []}
  {@const links = items.reduce((n, p) => n + p.items, 0)}
  <div class="page-head">
    <div class="titles">
      <h1>Pools</h1>
      <div class="meta">
        <span>{fmtNumber(items.length)} pool{items.length > 1 ? 's' : ''} accessible{items.length > 1 ? 's' : ''}</span>
        <span>{fmtNumber(links)} lien{links > 1 ? 's' : ''}</span>
      </div>
    </div>
    <div class="actions">
      <label class="sr-only" for="pool-filter">Rechercher un pool</label>
      <input class="input filter-input" id="pool-filter" type="search" placeholder="Rechercher un pool…" bind:value={filter} />
    </div>
  </div>
  {@const shown = items.filter(matches)}
  {#if shown.length}
    <ul class="pool-cards">
      {#each shown as p (p.slug)}
        <PoolCard pool={p} mediaUrl={(path) => session.client?.mediaUrl(path) ?? null} />
      {/each}
    </ul>
  {:else}
    <p class="muted">{items.length ? 'Aucun pool ne correspond.' : 'Aucun pool accessible.'}</p>
  {/if}
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

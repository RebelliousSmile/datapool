<script lang="ts">
  import { resolve } from '$app/paths';
  import Icon from '#lib/components/Icon.svelte';
  import { fmtDate, fmtNumber } from '#lib/format.ts';
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
  <div class="page-head">
    <div class="titles">
      <h1>Pools</h1>
      <div class="meta">
        <span>{fmtNumber(items.length)} pool{items.length > 1 ? 's' : ''} accessible{items.length > 1 ? 's' : ''}</span>
        <span>{fmtNumber(items.reduce((n, p) => n + p.items, 0))} liens</span>
      </div>
    </div>
    <div class="actions">
      <label class="sr-only" for="pool-filter">Rechercher un pool</label>
      <input class="input filter-input" id="pool-filter" type="search" placeholder="Rechercher un pool…" bind:value={filter} />
    </div>
  </div>
  <div class="panel flush table-wrap pool-list">
    <table class="table">
      <thead><tr><th>Pool</th><th class="h-slug">Slug</th><th class="num">Liens</th><th>Matérialisé</th></tr></thead>
      <tbody>
        {#each items.filter(matches) as p (p.slug)}
          <tr>
            <td class="name"><a href={resolve('/pools/[slug]', { slug: p.slug })}>{p.label}</a></td>
            <td class="slug mono secondary">{p.slug}</td>
            <td class="num">{fmtNumber(p.items)}</td>
            <td class="nowrap"><span class="mono">{p.refreshed_at ? fmtDate(p.refreshed_at) : 'jamais'}</span></td>
          </tr>
        {:else}
          <tr><td colspan="4" class="muted">{items.length ? 'Aucun pool ne correspond.' : 'Aucun pool accessible.'}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

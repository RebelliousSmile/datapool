<script lang="ts">
  import { page } from '$app/state';
  import Pager from '#lib/components/Pager.svelte';
  import { fmtDate, fmtNumber, USAGE, usageLabel } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';

  const LIMIT = 50;
  // `?to_qualify=true` (lien du tableau de bord) présélectionne le filtre.
  let form = $state({
    q: '',
    usage: page.url.searchParams.get('to_qualify') === 'true' ? 'none' : '',
  });
  let filters = $state({ ...form });
  let offset = $state(0);

  const query = $derived({
    q: filters.q,
    usage: filters.usage && filters.usage !== 'none' ? filters.usage : undefined,
    to_qualify: filters.usage === 'none' ? true : undefined,
    limit: LIMIT,
    offset,
  });
  const domains = $derived(session.client?.domains(query));

  function apply(event: SubmitEvent) {
    event.preventDefault();
    filters = { ...form };
    offset = 0;
  }
</script>

<h1>Domaines</h1>
<p class="secondary">Qualification en ligne de commande : <code>webpool domain set --domain … --usage …</code></p>

<form class="filters" onsubmit={apply}>
  <label>Domaine <input bind:value={form.q} /></label>
  <label>Usage commercial
    <select bind:value={form.usage}>
      <option value="">tous</option>
      {#each USAGE as u (u.label)}<option value={u.key ?? 'none'}>{u.label}</option>{/each}
    </select>
  </label>
  <button>Filtrer</button>
</form>

{#await domains}
  <p class="muted">Chargement…</p>
{:then res}
  {#if res}
    <div class="card">
      <table>
        <thead><tr><th>Domaine</th><th class="num">URLs</th><th>Usage</th><th>Première requête</th><th>Vu le</th><th>Exploration</th></tr></thead>
        <tbody>
          {#each res.items as d (d.domain)}
            <tr>
              <td><a href={`/corpus?domain=${encodeURIComponent(d.domain ?? '')}`}>{d.domain}</a></td>
              <td class="num">{fmtNumber(d.urls)}</td>
              <td>{usageLabel(d.usage_commercial)}{#if d.note}<div class="muted">{d.note}</div>{/if}</td>
              <td class="secondary">{d.first_query ?? '—'}</td>
              <td>{fmtDate(d.first_seen_at)}</td>
              <td>{d.explore_excluded ? 'exclu' : ''}</td>
            </tr>
          {:else}
            <tr><td colspan="6" class="muted">Aucun domaine.</td></tr>
          {/each}
        </tbody>
      </table>
      <Pager total={res.total} limit={LIMIT} bind:offset />
    </div>
  {/if}
{:catch err}
  <p class="error" role="alert">{err.message}</p>
{/await}

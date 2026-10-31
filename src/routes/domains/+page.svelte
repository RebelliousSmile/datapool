<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Icon from '#lib/components/Icon.svelte';
  import Pager from '#lib/components/Pager.svelte';
  import UsageBadge from '#lib/components/UsageBadge.svelte';
  import { fmtDate, fmtNumber, USAGE } from '#lib/format.ts';
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

<div class="page-head">
  <div class="titles">
    <h1>Domaines</h1>
    <div class="meta"><span>registre des sites</span><span>qualification : <code>webpool domain set --domain … --usage …</code></span></div>
  </div>
</div>

<form class="filters" onsubmit={apply}>
  <label class="field"><span>Domaine</span><input class="input" bind:value={form.q} /></label>
  <label class="field"
    ><span>Usage commercial</span>
    <select class="input" bind:value={form.usage}>
      <option value="">tous</option>
      {#each USAGE as u (u.slug)}<option value={u.key ?? 'none'}>{u.label}</option>{/each}
    </select>
  </label>
  <button class="btn btn-primary"><Icon name="search" small />Filtrer</button>
</form>

{#await domains}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{:then res}
  {#if res}
    <div class="section-title"><h2>Sites</h2><span class="eyebrow">{fmtNumber(res.total)} domaines</span></div>
    <div class="panel flush table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Domaine</th><th class="num">URLs</th><th>Usage</th><th class="hide-sm">Première requête</th>
            <th class="hide-sm">Vu le</th><th>Exploration</th>
          </tr>
        </thead>
        <tbody>
          {#each res.items as d (d.domain)}
            <tr>
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus une query string -->
              <td class="mono"><a href={`${resolve('/corpus')}?domain=${encodeURIComponent(d.domain ?? '')}`}>{d.domain}</a></td>
              <td class="num">{fmtNumber(d.urls)}</td>
              <td><UsageBadge usage={d.usage_commercial} />{#if d.note}<div class="muted">{d.note}</div>{/if}</td>
              <td class="secondary hide-sm">{d.first_query ?? '—'}</td>
              <td class="mono nowrap hide-sm">{fmtDate(d.first_seen_at)}</td>
              <td>{#if d.explore_excluded}<span class="chip">exclu</span>{/if}</td>
            </tr>
          {:else}
            <tr><td colspan="6" class="muted">Aucun domaine.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pager total={res.total} limit={LIMIT} bind:offset />
  {/if}
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

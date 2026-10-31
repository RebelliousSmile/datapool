<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { fmtDate, fmtDuration, fmtNumber } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';

  // Un client read n'a pas de tableau de bord : ses pools sont la page d'accueil.
  $effect(() => {
    if (!session.isAdmin) goto(resolve('/pools'), { replaceState: true });
  });

  const data = $derived(
    session.isAdmin && session.client
      ? Promise.all([session.client.stats(), session.client.runs({ limit: 15 })])
      : null,
  );
  const count = (rows: { status?: string; n?: number }[] | undefined, status: string) =>
    rows?.find((r) => r.status === status)?.n ?? 0;
  const sum = (rows: { n?: number }[] | undefined) => rows?.reduce((t, r) => t + (r.n ?? 0), 0) ?? 0;
</script>

<h1>Tableau de bord</h1>

{#if data}
  {#await data}
    <p class="muted">Chargement…</p>
  {:then [stats, runs]}
    <h2>Corpus</h2>
    <div class="grid">
      <div class="card tile"><div class="value">{fmtNumber(sum(stats.url_item))}</div><div class="label">URLs connues</div></div>
      <div class="card tile"><div class="value">{fmtNumber(count(stats.url_item, 'classified'))}</div><div class="label">classées</div></div>
      <div class="card tile"><div class="value">{fmtNumber(count(stats.url_item, 'pending'))}</div><div class="label">en attente</div></div>
      <div class="card tile"><div class="value">{fmtNumber(count(stats.url_item, 'duplicate'))}</div><div class="label">doublons</div></div>
      <div class="card tile"><div class="value">{fmtNumber(count(stats.url_item, 'error'))}</div><div class="label">en erreur</div></div>
    </div>

    <h2>Pools, domaines, exploration</h2>
    <div class="grid">
      <a class="card tile" href={resolve('/pools')}><div class="value">{fmtNumber(stats.pools)}</div><div class="label">pools</div></a>
      <a class="card tile" href={resolve('/domains')}><div class="value">{fmtNumber(stats.domain_profile?.total)}</div><div class="label">domaines</div></a>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus une query string -->
      <a class="card tile" href={`${resolve('/domains')}?to_qualify=true`}><div class="value">{fmtNumber(stats.domain_profile?.to_qualify)}</div><div class="label">domaines à qualifier</div></a>
      <div class="card tile"><div class="value">{fmtNumber(count(stats.search_query, 'active'))}</div><div class="label">requêtes actives</div></div>
      <div class="card tile"><div class="value">{fmtNumber(count(stats.search_query, 'exhausted'))}</div><div class="label">requêtes épuisées</div></div>
    </div>

    <h2>Derniers runs</h2>
    <div class="card">
      <table>
        <thead><tr><th>#</th><th>Type</th><th>Statut</th><th>Début</th><th class="num">Durée</th><th>Détail</th></tr></thead>
        <tbody>
          {#each runs.items as r (r.id)}
            <tr>
              <td>{r.id}</td>
              <td>{r.kind}</td>
              <td><span class="badge" class:failed={r.status === 'failed'}>{r.status === 'failed' ? '✕ ' : ''}{r.status}</span></td>
              <td class="nowrap">{fmtDate(r.started_at)}</td>
              <td class="num">{fmtDuration(r.started_at, r.finished_at)}</td>
              <td class="secondary detail">{JSON.stringify(r.detail)}</td>
            </tr>
          {:else}
            <tr><td colspan="6" class="muted">Aucun run.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:catch err}
    <p class="error" role="alert">{err.message}</p>
  {/await}
{/if}

<style>
  a.tile { color: inherit; text-decoration: none; }
  a.tile:hover { border-color: var(--baseline); }
  .nowrap { white-space: nowrap; }
  .detail { font-family: ui-monospace, monospace; font-size: 0.8rem; word-break: break-all; }
</style>

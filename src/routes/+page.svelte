<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Icon from '#lib/components/Icon.svelte';
  import { fmtDate, fmtDuration, fmtNumber } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';
  import type { Schemas } from '#lib/api/client.ts';

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
  const share = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1).replace('.', ',')} %` : '—');

  const STATUS = {
    done: { cls: 'ok', icon: 'check', label: 'ok' },
    failed: { cls: 'failed', icon: 'x', label: 'échec' },
    running: { cls: 'running', icon: 'run', label: 'en cours' },
  } as Record<string, { cls: string; icon: string; label: string }>;
  // Le détail d'un échec s'affiche en clair, le reste en JSON compact.
  const detail = (r: Schemas['Run']) => {
    const d = (r.detail ?? {}) as Record<string, unknown>;
    return r.status === 'failed' && typeof d.error === 'string' ? d.error : JSON.stringify(d);
  };
</script>

<div class="page-head">
  <div class="titles">
    <h1>Tableau de bord</h1>
    <div class="meta"><span>corpus webpool</span></div>
  </div>
</div>

{#if data}
  {#await data}
    <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
  {:then [stats, runs]}
    {@const total = sum(stats.url_item)}
    {@const classified = count(stats.url_item, 'classified')}
    {@const errors = count(stats.url_item, 'error')}
    {@const pending = count(stats.url_item, 'pending')}
    {@const domains = stats.domain_profile}
    <div class="section-title"><h2>Corpus</h2><span class="eyebrow">URLs</span></div>
    <div class="tiles">
      <div class="tile"><span class="eyebrow">URLs connues</span><span class="value">{fmtNumber(total)}</span></div>
      <div class="tile">
        <span class="eyebrow">Classées</span><span class="value">{fmtNumber(classified)}</span>
        <span class="sub">{share(classified, total)} du corpus</span>
        <span class="bar" aria-hidden="true"><span style:width={total ? `${(classified / total) * 100}%` : '0'}></span></span>
      </div>
      <div class="tile" class:warn={pending > 0}>
        <span class="eyebrow">En attente</span><span class="value">{fmtNumber(pending)}</span><span class="sub">file de normalisation</span>
      </div>
      <div class="tile"><span class="eyebrow">Doublons</span><span class="value">{fmtNumber(count(stats.url_item, 'duplicate'))}</span></div>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus une query string -->
      <a class="tile" class:alert={errors > 0} href={`${resolve('/corpus')}?status=error`}>
        <span class="eyebrow">{#if errors > 0}<Icon name="alert" small />{/if}En erreur</span>
        <span class="value">{fmtNumber(errors)}</span>
        <span class="go" aria-hidden="true"><Icon name="arrow" small /></span>
      </a>
    </div>

    <div class="section-title"><h2>Pools, domaines, exploration</h2></div>
    <div class="tiles">
      <a class="tile" href={resolve('/pools')}>
        <span class="eyebrow">Pools</span><span class="value">{fmtNumber(stats.pools)}</span>
        <span class="go" aria-hidden="true"><Icon name="arrow" small /></span>
      </a>
      <a class="tile" href={resolve('/domains')}>
        <span class="eyebrow">Domaines</span><span class="value">{fmtNumber(domains?.total)}</span>
        <span class="sub">{fmtNumber(domains?.excluded)} exclus de l'exploration</span>
        <span class="go" aria-hidden="true"><Icon name="arrow" small /></span>
      </a>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus une query string -->
      <a class="tile" class:warn={(domains?.to_qualify ?? 0) > 0} href={`${resolve('/domains')}?to_qualify=true`}>
        <span class="eyebrow">Domaines à qualifier</span><span class="value">{fmtNumber(domains?.to_qualify)}</span>
        <span class="sub">{share(domains?.to_qualify ?? 0, domains?.total ?? 0)} des domaines</span>
        <span class="go" aria-hidden="true"><Icon name="arrow" small /></span>
      </a>
      <div class="tile"><span class="eyebrow">Requêtes actives</span><span class="value">{fmtNumber(count(stats.search_query, 'active'))}</span></div>
      <div class="tile"><span class="eyebrow">Requêtes épuisées</span><span class="value">{fmtNumber(count(stats.search_query, 'exhausted'))}</span></div>
    </div>

    {@const failed = runs.items.filter((r) => r.status === 'failed').length}
    <div class="section-title">
      <h2>Derniers runs</h2>
      <span class="eyebrow">{failed ? `${failed} échec${failed > 1 ? 's' : ''}` : 'aucun échec'}</span>
    </div>
    <div class="panel flush table-wrap">
      <table class="table">
        <thead>
          <tr><th>#</th><th>Type</th><th>Statut</th><th class="hide-sm">Début</th><th class="num">Durée</th><th>Détail</th></tr>
        </thead>
        <tbody>
          {#each runs.items as r (r.id)}
            {@const s = STATUS[r.status ?? ''] ?? { cls: 'idle', icon: 'run', label: r.status }}
            <tr class:failed={r.status === 'failed'}>
              <td class="mono">{r.id}</td>
              <td class="mono">{r.kind}</td>
              <td><span class="status {s.cls}"><Icon name={s.icon} small />{s.label}</span></td>
              <td class="mono nowrap hide-sm">{fmtDate(r.started_at)}</td>
              <td class="num">{fmtDuration(r.started_at, r.finished_at)}</td>
              <td class="detail" class:err={r.status === 'failed'} title={detail(r)}>{detail(r)}</td>
            </tr>
          {:else}
            <tr><td colspan="6" class="muted">Aucun run.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:catch err}
    <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
  {/await}
{/if}

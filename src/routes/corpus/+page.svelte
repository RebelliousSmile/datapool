<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import CopyLinks from '#lib/components/CopyLinks.svelte';
  import Async from '#lib/components/Async.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import { COPY_CAP, fetchAllUrls } from '#lib/copy.ts';
  import Pager from '#lib/components/Pager.svelte';
  import { fmtDate, fmtNumber, fmtScore, urlStatusLabel } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';
  import type { Schemas } from '#lib/api/client.ts';

  const LIMIT = 50;
  const STATUSES = ['pending', 'normalized', 'classified', 'duplicate', 'error'];

  // Filtres saisis, appliqués à la validation du formulaire.
  // `?domain=` et `?status=` (liens des domaines, du tableau de bord, d'une fiche) présélectionnent les filtres.
  const param = (name: string) => page.url.searchParams.get(name) ?? '';
  let form = $state({ q: '', status: param('status'), theme: '', domain: param('domain'), order: 'recent' });
  let filters = $state({ ...form });
  let offset = $state(0);

  const themes = $derived(session.client?.themes());
  const urls = $derived(session.client?.urls({ ...filters, limit: LIMIT, offset }));

  // Thèmes à plat pour le sélecteur, sous-thèmes indentés.
  const flatten = (nodes: Schemas['Theme'][], depth = 0): { slug: string; label: string; urls: number }[] =>
    nodes.flatMap((t) => [
      { slug: t.slug ?? '', label: `${'  '.repeat(depth)}${t.label}`, urls: t.urls ?? 0 },
      ...flatten(t.children ?? [], depth + 1),
    ]);

  const hasFilters = $derived(Object.entries(filters).some(([k, v]) => k !== 'order' && v !== ''));

  function apply(event: SubmitEvent) {
    event.preventDefault();
    filters = { ...form };
    offset = 0;
  }
</script>

<div class="page-head">
  <div class="titles"><h1>Corpus</h1><div class="meta"><span>toutes les URLs collectées par webpool</span></div></div>
</div>

<form class="filters" onsubmit={apply}>
  <label class="field"><span>Recherche</span><input class="input" bind:value={form.q} placeholder="titre ou URL" /></label>
  <label class="field"
    ><span>Statut</span>
    <select class="input" bind:value={form.status}>
      <option value="">tous</option>
      {#each STATUSES as s (s)}<option value={s}>{urlStatusLabel(s)}</option>{/each}
    </select>
  </label>
  <label class="field"
    ><span>Thème</span>
    <select class="input" bind:value={form.theme}>
      <option value="">tous</option>
      {#await themes then res}
        {#each flatten(res?.items ?? []) as t (t.slug)}<option value={t.slug}>{t.label} ({t.urls})</option>{/each}
      {/await}
    </select>
  </label>
  <label class="field"><span>Domaine</span><input class="input" bind:value={form.domain} placeholder="exemple.com" /></label>
  <label class="field"
    ><span>Ordre</span>
    <select class="input" bind:value={form.order}>
      <option value="recent">plus récentes</option>
      <option value="quality">qualité</option>
      <option value="relevance">pertinence</option>
    </select>
  </label>
  <button class="btn btn-primary"><Icon name="search" small />Filtrer</button>
</form>

<Async value={urls}>
  {#snippet children(res)}
    <div class="list-toolbar">
      <div class="section-title in-toolbar"><h2>URLs</h2><span class="eyebrow">{fmtNumber(res.total)} correspondent</span></div>
      <CopyLinks
        slug="corpus"
        count={Math.min(res.total, COPY_CAP)}
        capped={res.total > COPY_CAP}
        filtered={hasFilters}
        load={() => fetchAllUrls(session.client!, filters)}
      />
    </div>
    <div class="panel flush table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>URL</th><th class="hide-sm">Domaine</th><th>Statut</th><th class="hide-sm">Thème</th>
            <th class="num">Pert.</th><th class="num">Qual.</th><th class="hide-sm">Vue le</th>
          </tr>
        </thead>
        <tbody>
          {#each res.items as u (u.id)}
            <tr>
              <td class="cell-url"><a href={resolve('/urls/[id]', { id: String(u.id) })}>{u.title || u.url}</a></td>
              <td class="mono hide-sm">{u.domain ?? '—'}</td>
              <td class="mono">{urlStatusLabel(u.status)}</td>
              <td class="mono hide-sm">{u.primary_theme ?? '—'}</td>
              <td class="num">{fmtScore(u.relevance_score)}</td>
              <td class="num">{fmtScore(u.quality_score)}</td>
              <td class="mono nowrap hide-sm">{fmtDate(u.first_seen_at)}</td>
            </tr>
          {:else}
            <tr><td colspan="7" class="muted">Aucune URL.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pager total={res.total} limit={LIMIT} bind:offset />
  {/snippet}
</Async>

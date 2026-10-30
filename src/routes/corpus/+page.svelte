<script lang="ts">
  import { page } from '$app/state';
  import Pager from '#lib/components/Pager.svelte';
  import { fmtDate, fmtNumber, fmtScore } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';
  import type { Schemas } from '#lib/api/client.ts';

  const LIMIT = 50;
  const STATUSES = ['pending', 'normalized', 'classified', 'duplicate', 'error'];

  // Filtres saisis, appliqués à la validation du formulaire.
  // `?domain=` (lien depuis les domaines) présélectionne le filtre.
  let form = $state({ q: '', status: '', theme: '', domain: page.url.searchParams.get('domain') ?? '', order: 'recent' });
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

  function apply(event: SubmitEvent) {
    event.preventDefault();
    filters = { ...form };
    offset = 0;
  }
</script>

<h1>Corpus</h1>

<form class="filters" onsubmit={apply}>
  <label>Recherche <input bind:value={form.q} placeholder="titre ou URL" /></label>
  <label>Statut
    <select bind:value={form.status}>
      <option value="">tous</option>
      {#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
    </select>
  </label>
  <label>Thème
    <select bind:value={form.theme}>
      <option value="">tous</option>
      {#await themes then res}
        {#each flatten(res?.items ?? []) as t (t.slug)}<option value={t.slug}>{t.label} ({t.urls})</option>{/each}
      {/await}
    </select>
  </label>
  <label>Domaine <input bind:value={form.domain} placeholder="exemple.com" /></label>
  <label>Ordre
    <select bind:value={form.order}>
      <option value="recent">plus récentes</option>
      <option value="quality">qualité</option>
      <option value="relevance">pertinence</option>
    </select>
  </label>
  <button>Filtrer</button>
</form>

{#await urls}
  <p class="muted">Chargement…</p>
{:then res}
  {#if res}
    <div class="card">
      <table>
        <thead>
          <tr><th>URL</th><th>Domaine</th><th>Statut</th><th>Thème</th><th class="num">Pert.</th><th class="num">Qual.</th><th>Vue le</th></tr>
        </thead>
        <tbody>
          {#each res.items as u (u.id)}
            <tr>
              <td class="url"><a href={`/urls/${u.id}`}>{u.title || u.url}</a></td>
              <td>{u.domain ?? '—'}</td>
              <td>{u.status}</td>
              <td>{u.primary_theme ?? '—'}</td>
              <td class="num">{fmtScore(u.relevance_score)}</td>
              <td class="num">{fmtScore(u.quality_score)}</td>
              <td>{fmtDate(u.first_seen_at)}</td>
            </tr>
          {:else}
            <tr><td colspan="7" class="muted">Aucune URL.</td></tr>
          {/each}
        </tbody>
      </table>
      <Pager total={res.total} limit={LIMIT} bind:offset />
    </div>
    <p class="muted">{fmtNumber(res.total)} URLs correspondent.</p>
  {/if}
{:catch err}
  <p class="error" role="alert">{err.message}</p>
{/await}

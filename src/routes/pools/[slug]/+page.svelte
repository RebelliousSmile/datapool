<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import BarList from '#lib/components/BarList.svelte';
  import CopyLinks from '#lib/components/CopyLinks.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import LinkRow from '#lib/components/LinkRow.svelte';
  import Pager from '#lib/components/Pager.svelte';
  import UsageBar from '#lib/components/UsageBar.svelte';
  import { fmtDate, fmtNumber } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';

  const LIMIT = 50;
  const slug = $derived(page.params.slug ?? '');
  let offset = $state(0);
  let filter = $state('');
  let exportError = $state('');

  // Passer d'un pool à l'autre réutilise la page : on repart du début.
  $effect.pre(() => {
    void slug;
    offset = 0;
    filter = '';
  });

  const pool = $derived(session.client?.pool(slug));
  const items = $derived(session.client?.poolItems(slug, { limit: LIMIT, offset }));

  // Filtre de la page affichée (titre, URL, domaine) ; la copie, elle, prend tout le pool.
  const visible = <T extends { url: string; title?: string | null; domain?: string | null }>(list: T[]) => {
    const q = filter.trim().toLowerCase();
    return q ? list.filter((l) => `${l.title ?? ''} ${l.url} ${l.domain ?? ''}`.toLowerCase().includes(q)) : list;
  };

  async function download(format: 'json' | 'csv' | 'md') {
    exportError = '';
    try {
      const blob = await session.client!.exportPool(slug, format);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}.${format}`;
      a.click();
      // libéré après coup : certains navigateurs annulent un téléchargement révoqué trop tôt
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      exportError = (err as Error).message;
    }
  }
</script>

<nav class="crumbs" aria-label="Fil d'Ariane">
  <a href={resolve('/pools')}>pools</a><span class="sep">/</span><span>{slug}</span>
</nav>

{#await pool}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{:then p}
  {#if p}
    <div class="page-head">
      <div class="titles">
        <h1>{p.label}</h1>
        <div class="meta">
          <code>{p.slug}</code>
          <span>{fmtNumber(p.items)} liens</span>
          <span>{p.refreshed_at ? `matérialisé le ${fmtDate(p.refreshed_at)}` : 'jamais matérialisé'}</span>
        </div>
      </div>
      <div class="actions">
        <CopyLinks {slug} count={p.items} />
      </div>
    </div>

    <div class="cols">
      <section class="panel" aria-labelledby="usage-h">
        <div class="panel-head"><h2 id="usage-h">Usage commercial</h2><span class="eyebrow">{fmtNumber(p.items)} liens</span></div>
        <UsageBar rows={p.usage_commercial} />
      </section>
      <section class="panel" aria-labelledby="dom-h">
        <div class="panel-head"><h2 id="dom-h">Domaines les plus présents</h2><span class="eyebrow">top {p.top_domains.length}</span></div>
        <BarList rows={p.top_domains.map((d) => ({ label: d.domain ?? '—', value: d.urls ?? 0 }))} />
      </section>
    </div>

    {#if session.isAdmin}
      <div class="section-title"><h2>Administration</h2></div>
      <div class="admin-tools">
        <span class="eyebrow">Exporter</span>
        <button class="btn btn-sm" type="button" onclick={() => download('json')}><Icon name="download" small />JSON</button>
        <button class="btn btn-sm" type="button" onclick={() => download('csv')}><Icon name="download" small />CSV</button>
        <button class="btn btn-sm" type="button" onclick={() => download('md')}><Icon name="download" small />Markdown</button>
        {#if exportError}<span class="alert-box err" role="alert"><Icon name="alert" small />{exportError}</span>{/if}
      </div>
      {#if p.definition}
        <details class="panel definition">
          <summary class="eyebrow">Définition du pool</summary>
          <pre>{JSON.stringify(p.definition, null, 2)}</pre>
        </details>
      {/if}
    {/if}
  {/if}
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

{#await items then res}
  {#if res}
    {@const shown = visible(res.items)}
    <div class="list-toolbar">
      <div class="section-title" style="margin:0;flex:1">
        <h2>Liens</h2>
        <span class="range">
          {res.total ? `${fmtNumber(offset + 1)}–${fmtNumber(Math.min(offset + LIMIT, res.total))}` : '0'} sur {fmtNumber(res.total)} · par rang
        </span>
      </div>
      <label class="sr-only" for="link-filter">Filtrer les liens de la page</label>
      <input class="input filter-input" id="link-filter" type="search" placeholder="Filtrer cette page…" bind:value={filter} />
    </div>
    <div class="flux-wrap">
      <div class="flux-head" aria-hidden="true">
        <span class="eyebrow">Rang</span><span></span><span class="eyebrow">Titre</span><span class="eyebrow h-url">URL</span><span class="eyebrow">Usage</span>
      </div>
      <ol class="flux" aria-label="Liens du pool, par rang">
        {#each shown as it (it.rank)}
          <LinkRow link={it} />
        {:else}
          <li class="row empty muted">{res.items.length ? 'Aucun lien de cette page ne correspond.' : 'Pool vide.'}</li>
        {/each}
      </ol>
    </div>
    <Pager total={res.total} limit={LIMIT} bind:offset />
  {/if}
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

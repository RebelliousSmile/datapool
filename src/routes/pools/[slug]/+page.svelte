<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import BarList from '#lib/components/BarList.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import PoolExplorer from '#lib/components/PoolExplorer.svelte';
  import UsageBar from '#lib/components/UsageBar.svelte';
  import { session } from '#lib/session.svelte.ts';

  const slug = $derived(page.params.slug ?? '');
  const pool = $derived(session.client?.pool(slug));
  let exportError = $state('');

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
    {#key p.slug}
      <PoolExplorer pool={p} />
    {/key}

    {#if session.isAdmin}
      <details class="panel admin-panel">
        <summary class="eyebrow">Administration du pool</summary>
        <div class="cols">
          <section aria-labelledby="usage-h">
            <div class="panel-head"><h2 id="usage-h">Usage commercial</h2></div>
            <UsageBar rows={p.usage_commercial} />
          </section>
          <section aria-labelledby="dom-h">
            <div class="panel-head"><h2 id="dom-h">Domaines les plus présents</h2><span class="eyebrow">top {p.top_domains.length}</span></div>
            <BarList rows={p.top_domains.map((d) => ({ label: d.domain ?? '—', value: d.urls ?? 0 }))} />
          </section>
        </div>
        <div class="admin-tools">
          <span class="eyebrow">Exporter</span>
          <button class="btn btn-sm" type="button" onclick={() => download('json')}><Icon name="download" small />JSON</button>
          <button class="btn btn-sm" type="button" onclick={() => download('csv')}><Icon name="download" small />CSV</button>
          <button class="btn btn-sm" type="button" onclick={() => download('md')}><Icon name="download" small />Markdown</button>
          {#if exportError}<span class="alert-box err" role="alert"><Icon name="alert" small />{exportError}</span>{/if}
        </div>
        {#if p.definition}
          <pre>{JSON.stringify(p.definition, null, 2)}</pre>
        {/if}
      </details>
    {/if}
  {/if}
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

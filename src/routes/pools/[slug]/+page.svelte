<script lang="ts">
  import { page } from '$app/state';
  import BarList from '#lib/components/BarList.svelte';
  import Pager from '#lib/components/Pager.svelte';
  import UsageBar from '#lib/components/UsageBar.svelte';
  import { fmtDate, fmtNumber, fmtScore, usageLabel } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';

  const LIMIT = 50;
  const slug = $derived(page.params.slug ?? '');
  let offset = $state(0);
  let exportError = $state('');

  const pool = $derived(session.client?.pool(slug));
  const items = $derived(session.client?.poolItems(slug, { limit: LIMIT, offset }));

  async function download(format: 'json' | 'csv' | 'md') {
    exportError = '';
    try {
      const blob = await session.client!.exportPool(slug, format);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      exportError = (err as Error).message;
    }
  }
</script>

<p><a href="/pools">← Pools</a></p>

{#await pool}
  <p class="muted">Chargement…</p>
{:then p}
  {#if p}
    <h1>{p.label}</h1>
    <p class="secondary">
      <code>{p.slug}</code> · {fmtNumber(p.items)} URLs · matérialisé {p.refreshed_at ? `le ${fmtDate(p.refreshed_at)}` : 'jamais'}
    </p>

    {#if session.isAdmin}
      <p class="exports">
        Exporter :
        <button onclick={() => download('json')}>JSON</button>
        <button onclick={() => download('csv')}>CSV</button>
        <button onclick={() => download('md')}>Markdown</button>
        {#if exportError}<span class="error">{exportError}</span>{/if}
      </p>
    {/if}

    <div class="cols">
      <section class="card">
        <h2>Usage commercial des domaines</h2>
        <UsageBar rows={p.usage_commercial} />
      </section>
      <section class="card">
        <h2>Domaines les plus représentés</h2>
        <BarList rows={p.top_domains.map((d) => ({ label: d.domain ?? '—', value: d.urls ?? 0 }))} />
      </section>
    </div>

    {#if p.definition}
      <details class="card">
        <summary>Définition du pool</summary>
        <pre>{JSON.stringify(p.definition, null, 2)}</pre>
      </details>
    {/if}
  {/if}
{:catch err}
  <p class="error" role="alert">{err.message}</p>
{/await}

<h2>URLs</h2>
{#await items}
  <p class="muted">Chargement…</p>
{:then res}
  {#if res}
    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="num">#</th><th>Titre</th><th>Domaine</th><th>Usage</th>
            {#if session.isAdmin}<th class="num">Score</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each res.items as it (it.rank)}
            <tr>
              <td class="num">{it.rank}</td>
              <td class="url">
                <a href={it.url} target="_blank" rel="noopener noreferrer">{it.title || it.url}</a>
                {#if session.isAdmin && it.id}<a class="muted fiche" href={`/urls/${it.id}`}>fiche</a>{/if}
              </td>
              <td>{it.domain}</td>
              <td>{usageLabel(it.usage_commercial)}</td>
              {#if session.isAdmin}<td class="num">{fmtScore(it.score)}</td>{/if}
            </tr>
          {:else}
            <tr><td colspan="5" class="muted">Pool vide.</td></tr>
          {/each}
        </tbody>
      </table>
      <Pager total={res.total} limit={LIMIT} bind:offset />
    </div>
  {/if}
{:catch err}
  <p class="error" role="alert">{err.message}</p>
{/await}

<style>
  .cols { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-top: 1rem; }
  .cols h2 { margin-top: 0; }
  details { margin-top: 1rem; }
  .exports { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .fiche { margin-left: 0.5rem; font-size: 0.8rem; }
</style>

<script lang="ts">
  import { resolve } from '$app/paths';
  import { fmtDate, fmtNumber } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';

  const pools = $derived(session.client?.pools());
</script>

<h1>Pools</h1>

{#await pools}
  <p class="muted">Chargement…</p>
{:then res}
  <div class="card">
    <table>
      <thead><tr><th>Pool</th><th>Slug</th><th class="num">URLs</th><th>Dernière matérialisation</th></tr></thead>
      <tbody>
        {#each res?.items ?? [] as p (p.slug)}
          <tr>
            <td><a href={resolve('/pools/[slug]', { slug: p.slug })}>{p.label}</a></td>
            <td class="secondary"><code>{p.slug}</code></td>
            <td class="num">{fmtNumber(p.items)}</td>
            <td>{p.refreshed_at ? fmtDate(p.refreshed_at) : 'jamais'}</td>
          </tr>
        {:else}
          <tr><td colspan="4" class="muted">Aucun pool accessible.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{:catch err}
  <p class="error" role="alert">{err.message}</p>
{/await}

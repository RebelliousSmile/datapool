<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { fmtDate, fmtScore, usageLabel } from '#lib/format.ts';
  import ExternalLink from '#lib/components/ExternalLink.svelte';
  import { session } from '#lib/session.svelte.ts';

  const url = $derived(session.client?.url(page.params.id ?? ''));
</script>

<p><a href={resolve('/corpus')}>← Corpus</a></p>

{#await url}
  <p class="muted">Chargement…</p>
{:then u}
  {#if u}
    <h1 class="url">{u.title || u.canonical_url || u.raw_url}</h1>
    <p class="url"><ExternalLink url={u.canonical_url ?? u.raw_url}>{u.canonical_url ?? u.raw_url}</ExternalLink></p>

    <div class="grid">
      <div class="card tile"><div class="value">{u.status}</div><div class="label">statut</div></div>
      <div class="card tile"><div class="value">{fmtScore(u.relevance_score)}</div><div class="label">pertinence</div></div>
      <div class="card tile"><div class="value">{fmtScore(u.quality_score)}</div><div class="label">qualité</div></div>
      <div class="card tile"><div class="value">{fmtScore(u.confidence_score)}</div><div class="label">confiance</div></div>
      <div class="card tile"><div class="value">{usageLabel(u.usage_commercial)}</div><div class="label">usage ({u.domain})</div></div>
    </div>

    {#if u.error}<p class="error">Erreur : {u.error}</p>{/if}
    {#if u.duplicate_of}<p>Doublon de <a href={resolve('/urls/[id]', { id: String(u.duplicate_of) })}>#{u.duplicate_of}</a>.</p>{/if}

    <h2>Sources</h2>
    <div class="card">
      <table>
        <thead><tr><th>Provider</th><th>Requête</th><th class="num">Rang</th><th>Découverte</th></tr></thead>
        <tbody>
          {#each u.sources ?? [] as s, i (i)}
            <tr><td>{s.provider}</td><td>{s.query}</td><td class="num">{s.serp_rank ?? '—'}</td><td>{fmtDate(s.discovered_at)}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="cols">
      <section>
        <h2>Thèmes</h2>
        <div class="card">
          <table>
            <tbody>
              {#each u.themes ?? [] as t (t.slug)}
                <tr>
                  <td>{t.parent ? `${t.parent} / ` : ''}{t.label} {#if t.is_primary}<span class="badge">principal</span>{/if}</td>
                  <td class="num">{fmtScore(t.score)}</td>
                </tr>
              {:else}
                <tr><td class="muted">Aucun thème.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Facettes</h2>
        <div class="card">
          <table>
            <tbody>
              {#each u.facets ?? [] as f (f.slug)}
                <tr><td class="secondary">{f.label}</td><td>{f.value}</td></tr>
              {:else}
                <tr><td class="muted">Aucune facette.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Pools</h2>
        <div class="card">
          <table>
            <tbody>
              {#each u.pools ?? [] as p (p.slug)}
                <tr><td><a href={resolve('/pools/[slug]', { slug: p.slug ?? '' })}>{p.slug}</a></td><td class="num">rang {p.rank}</td></tr>
              {:else}
                <tr><td class="muted">Dans aucun pool.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <p class="muted">
      Vue le {fmtDate(u.first_seen_at)} · normalisée le {fmtDate(u.normalized_at)} · classée le {fmtDate(u.classified_at)}
      {#if u.http_status} · HTTP {u.http_status}{/if}
    </p>
  {/if}
{:catch err}
  <p class="error" role="alert">{err.message}</p>
{/await}

<style>
  .cols { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  h1.url { word-break: break-word; }
</style>

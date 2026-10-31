<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import ExternalLink from '#lib/components/ExternalLink.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import MediaThumb from '#lib/components/MediaThumb.svelte';
  import { enrich } from '#lib/explore.ts';
  import UsageBadge from '#lib/components/UsageBadge.svelte';
  import { fmtDate, fmtScore, urlStatusLabel } from '#lib/format.ts';
  import { copyText } from '#lib/copy.ts';
  import { session } from '#lib/session.svelte.ts';

  const id = $derived(page.params.id ?? '');
  const url = $derived(session.client?.url(id));
  let copied = $state('');

  const STATUS: Record<string, { cls: string; icon: string }> = {
    classified: { cls: 'ok', icon: 'check' },
    normalized: { cls: 'idle', icon: 'check' },
    pending: { cls: 'running', icon: 'run' },
    duplicate: { cls: 'warn', icon: 'alert' },
    error: { cls: 'failed', icon: 'x' },
  };

  async function copy(text: string) {
    try {
      await copyText(text);
      copied = 'URL copiée';
    } catch (err) {
      copied = (err as Error).message;
    }
  }
</script>

<nav class="crumbs" aria-label="Fil d'Ariane">
  <a href={resolve('/corpus')}>corpus</a><span class="sep">/</span><span>url #{id}</span>
</nav>

{#await url}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{:then u}
  {#if u}
    {@const link = u.canonical_url ?? u.raw_url ?? ''}
    {@const s = STATUS[u.status ?? ''] ?? { cls: 'idle', icon: 'page' }}
    {@const media = enrich(
      {
        rank: 0,
        url: link,
        title: u.title ?? null,
        domain: u.domain ?? '',
        usage_commercial: u.usage_commercial ?? null,
        description: u.description,
        media_type: u.media_type,
        source: u.source,
        thumbnail: u.thumbnail,
        favicon: u.favicon,
      },
      session.client!.mediaUrl,
    )}
    <div class="url-hero">
      <MediaThumb link={media} rank={false} />
      <div>
        <div class="meta url-meta">
          <span class="status {s.cls}"><Icon name={s.icon} small />{urlStatusLabel(u.status)}</span>
          <UsageBadge usage={u.usage_commercial} />
          {#if u.http_status}<span class="chip">HTTP {u.http_status}</span>{/if}
          {#if u.lang}<span class="chip">{u.lang}</span>{/if}
          {#if u.site_name}<span class="chip">{u.site_name}</span>{/if}
        </div>
        <h1>{u.title || link}</h1>
        {#if u.description}<p class="desc">{u.description}</p>{/if}
        <div class="url-full" title="Cliquer pour sélectionner l'URL complète">{link}</div>
        <div class="actions url-actions">
          <ExternalLink url={link}><span class="btn btn-sm"><Icon name="arrow" small />Ouvrir le site</span></ExternalLink>
          <button class="btn btn-sm" type="button" onclick={() => copy(link)}><Icon name="copy" small />Copier l'URL</button>
          {#if copied}<span class="secondary" role="status">{copied}</span>{/if}
        </div>
        {#if u.error}<div class="alert-box err mt-2"><Icon name="alert" small />{u.error}</div>{/if}
        {#if u.duplicate_of}
          <p class="secondary">Doublon de <a href={resolve('/urls/[id]', { id: String(u.duplicate_of) })}>#{u.duplicate_of}</a>.</p>
        {/if}
      </div>
    </div>

    <div class="tiles mt-5">
      {#each [['Pertinence', u.relevance_score], ['Qualité', u.quality_score], ['Confiance', u.confidence_score]] as [label, score] (label)}
        <div class="tile">
          <div class="score">
            <span class="secondary">{label}</span><span class="mono">{fmtScore(score as number | null)}</span>
            <span class="track"><span style:width={`${((score as number | null) ?? 0) * 100}%`}></span></span>
          </div>
        </div>
      {/each}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus une query string -->
      <a class="tile" href={`${resolve('/corpus')}?domain=${encodeURIComponent(u.domain ?? '')}`}>
        <span class="eyebrow">Domaine</span><span class="value"><span class="value-sm">{u.domain ?? '—'}</span></span>
        <span class="go" aria-hidden="true"><Icon name="arrow" small /></span>
      </a>
    </div>

    <div class="section-title"><h2>Sources</h2><span class="eyebrow">{u.sources?.length ?? 0} découverte{(u.sources?.length ?? 0) > 1 ? 's' : ''}</span></div>
    <div class="panel flush table-wrap">
      <table class="table">
        <thead><tr><th>Provider</th><th>Requête</th><th class="num hide-sm">Rang SERP</th><th>Découverte</th></tr></thead>
        <tbody>
          {#each u.sources ?? [] as src, i (i)}
            <tr>
              <td class="mono">{src.provider}</td><td>{src.query}</td>
              <td class="num hide-sm">{src.serp_rank ?? '—'}</td><td class="mono nowrap">{fmtDate(src.discovered_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="cols mt-6">
      <section class="panel">
        <div class="panel-head"><h2>Thèmes</h2></div>
        <dl class="kv">
          {#each u.themes ?? [] as t (t.slug)}
            <dt>{fmtScore(t.score)}</dt>
            <dd>{t.parent ? `${t.parent} / ` : ''}{t.label} {#if t.is_primary}<span class="chip primary">principal</span>{/if}</dd>
          {:else}
            <dt>—</dt><dd class="muted">aucun thème</dd>
          {/each}
        </dl>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Facettes</h2></div>
        <dl class="kv">
          {#each u.facets ?? [] as f (f.slug)}
            <dt>{f.label}</dt><dd>{f.value}</dd>
          {:else}
            <dt>—</dt><dd class="muted">aucune facette</dd>
          {/each}
        </dl>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Pools</h2></div>
        <dl class="kv">
          {#each u.pools ?? [] as p (p.slug)}
            <dt>#{p.rank}</dt><dd><a href={resolve('/pools/[slug]', { slug: p.slug ?? '' })}>{p.slug}</a></dd>
          {:else}
            <dt>—</dt><dd class="muted">dans aucun pool</dd>
          {/each}
        </dl>
      </section>
    </div>

    <p class="terminal-line mt-5">
      &gt; vue le {fmtDate(u.first_seen_at)} · normalisée le {fmtDate(u.normalized_at)} · classée le {fmtDate(u.classified_at)}
    </p>
  {/if}
{:catch err}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
{/await}

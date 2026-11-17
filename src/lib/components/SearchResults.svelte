<script lang="ts">
  import { resolve } from '$app/paths';
  import { enrich } from '#lib/explore.ts';
  import { fmtNumber, safeHref, splitUrl } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';
  import Async from './Async.svelte';
  import MediaThumb from './MediaThumb.svelte';
  import Pager from './Pager.svelte';
  import UsageBadge from './UsageBadge.svelte';

  // Recherche dans tous les pools visibles (GET /search) : un résultat par
  // URL, avec les pools qui la contiennent et son rang dans chacun.
  // La page recrée le composant à chaque terme : la pagination repart de zéro.
  let { q }: { q: string } = $props();
  let offset = $state(0);

  const LIMIT = 50;
  const MIN = 2;
  const term = $derived(q.trim());
  const results = $derived(term.length >= MIN ? session.client?.search({ q: term, limit: LIMIT, offset }) : null);
</script>

{#if term.length < MIN}
  <p class="muted">Saisissez {MIN} caractères au moins dans la recherche.</p>
{:else}
  <Async value={results}>
    {#snippet children(res)}
      <p class="secondary search-count">
        <strong>{fmtNumber(res.total)}</strong> lien{res.total > 1 ? 's' : ''} pour « {res.q} »
      </p>
      {#if res.items.length}
        <ul class="items d-comfort">
          {#each res.items as hit, i (hit.url)}
            {@const link = enrich({ ...hit, rank: res.offset + i + 1 }, (p) => session.client?.mediaUrl(p) ?? null)}
            {@const href = safeHref(link.url)}
            {@const parts = splitUrl(link.url)}
            <li class="item" data-media={link.media} data-usage={link.usage}>
              <span class="item-rank">{link.rank}</span>
              <span class="item-fav"></span>
              <div class="item-thumb"><MediaThumb {link} rank={false} /></div>
              <div class="item-body">
                {#if href}
                  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- lien externe, filtré par safeHref -->
                  <a class="item-title" class:untitled={!link.title} {href} target="_blank" rel="noopener noreferrer">{link.title || link.url}</a>
                {:else}
                  <span class="item-title" class:untitled={!link.title}>{link.title || link.url}</span>
                {/if}
                {#if link.description}<p class="item-desc">{link.description}</p>{/if}
                <div class="item-meta">
                  <span class="url" title={link.url}><span class="scheme">{parts.scheme}</span><span class="host">{parts.host}</span>{parts.rest}</span>
                </div>
                <div class="hit-pools">
                  {#each hit.pools as p (p.slug)}
                    <a class="chip" href={resolve('/pools/[slug]', { slug: p.slug })} title={`Rang ${p.rank} dans ${p.label}`}>{p.label} #{p.rank}</a>
                  {/each}
                </div>
              </div>
              <div class="item-side"><UsageBadge usage={link.usage_commercial} /></div>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">Aucun lien ne correspond dans vos pools.</p>
      {/if}
      <Pager total={res.total} limit={LIMIT} bind:offset />
    {/snippet}
  </Async>
{/if}

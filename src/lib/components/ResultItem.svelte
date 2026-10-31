<script lang="ts">
  import { resolve } from '$app/paths';
  import { safeHref, splitUrl } from '#lib/format.ts';
  import { MEDIA, SOURCES } from '#lib/kinds.ts';
  import type { XLink } from '#lib/explore.ts';
  import Icon from './Icon.svelte';
  import MediaThumb from './MediaThumb.svelte';
  import UsageBadge from './UsageBadge.svelte';

  // Un lien, même balisage pour les trois densités (confort, compact, grille) :
  // la classe de la liste (`d-…`) choisit ce qui s'affiche.
  let { link, peeked = false, onpeek }: { link: XLink; peeked?: boolean; onpeek: (link: XLink) => void } = $props();

  const href = $derived(safeHref(link.url));
  const parts = $derived(splitUrl(link.url));
  const icon = $derived(MEDIA.find((m) => m.key === link.media)!.icon);
  const source = $derived(SOURCES.find((s) => s.key === link.source)!.label);
  const title = $derived(link.title || link.url);
  let favBroken = $state(false);
</script>

<li class="item" class:peeked data-media={link.media} data-source={link.source} data-usage={link.usage}>
  <span class="item-rank">#{link.rank}</span>
  <span class="item-fav"
    ><span class="fav"
      >{#if link.favicon && !favBroken}<img src={link.favicon} alt="" width="16" height="16" onerror={() => (favBroken = true)} />{:else}<Icon
          name={icon}
          small
        />{/if}</span
    ></span
  >
  <div class="item-thumb"><MediaThumb {link} /></div>
  <div class="item-body">
    {#if href}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- lien externe, filtré par safeHref -->
      <a class="item-title" class:untitled={!link.title} {href} target="_blank" rel="noopener noreferrer" {title}>{title}</a>
    {:else}
      <span class="item-title" class:untitled={!link.title}>{title}</span>
    {/if}
    {#if link.description}<p class="item-desc">{link.description}</p>{/if}
    <div class="item-meta">
      <span class="url" title={link.url}><span class="scheme">{parts.scheme}</span><span class="host">{parts.host}</span>{parts.rest}</span>
      <span class="src">{source}</span>
      {#if link.id}<a class="src" href={resolve('/urls/[id]', { id: String(link.id) })}>fiche</a>{/if}
    </div>
  </div>
  <div class="item-side">
    <UsageBadge usage={link.usage_commercial} />
    <button class="peek" type="button" aria-pressed={peeked} aria-label={`Aperçu de « ${title.slice(0, 60)} »`} onclick={() => onpeek(link)}>
      <Icon name="eye" small />
    </button>
  </div>
</li>

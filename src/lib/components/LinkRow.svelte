<script lang="ts">
  import { resolve } from '$app/paths';
  import { safeHref, splitUrl } from '#lib/format.ts';
  import Icon from './Icon.svelte';
  import UsageBadge from './UsageBadge.svelte';

  // Une ligne de la vue flux : rang, repère, titre (ou URL), URL complète
  // sélectionnable, usage. `id` (admin) ajoute un lien vers la fiche.
  type Link = { rank: number; url: string; title?: string | null; usage_commercial?: string | null; id?: number };
  let { link }: { link: Link } = $props();

  const href = $derived(safeHref(link.url));
  const parts = $derived(splitUrl(link.url));
</script>

<li class="row">
  <span class="rank">{link.rank}</span>
  <!-- favicon en cache : phase 3 ; d'ici là, le pictogramme du type -->
  <span class="fav"><Icon name="page" small /></span>
  {#if href}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- lien externe, filtré par safeHref -->
    <a class="title" class:untitled={!link.title} {href} target="_blank" rel="noopener noreferrer" title={link.title || link.url}
      >{link.title || link.url}</a
    >
  {:else}
    <span class="title" class:untitled={!link.title}>{link.title || link.url}</span>
  {/if}
  <span class="url" title={link.url}><span class="scheme">{parts.scheme}</span><span class="host">{parts.host}</span>{parts.rest}</span>
  <UsageBadge usage={link.usage_commercial} />
  {#if link.id}
    <a class="admin-link chip" href={resolve('/urls/[id]', { id: String(link.id) })}>fiche</a>
  {/if}
</li>

<script lang="ts">
  import { MEDIA } from '#lib/kinds.ts';
  import type { XLink } from '#lib/explore.ts';
  import Icon from './Icon.svelte';

  // Vignette d'un lien, servie par le cache de webpool. Sans vignette : le
  // favicon du site agrandi, sinon le pictogramme du type ; une image qui ne
  // se charge pas bascule sur ce repli, marqué « indisponible ».
  let { link, rank = true }: { link: XLink; rank?: boolean } = $props();
  const media = $derived(MEDIA.find((m) => m.key === link.media)!);
  const label = $derived(media.one[0].toUpperCase() + media.one.slice(1));
  let broken = $state(false);
  let favBroken = $state(false);
</script>

{#snippet tags()}
  {#if rank}<span class="rank-tag">#{link.rank}</span>{/if}
  {#if link.media !== 'page'}<span class="kind-tag"><Icon name={media.icon} small />{label}</span>{/if}
{/snippet}

{#if link.thumbnail && !broken}
  <div class="thumb">
    {@render tags()}
    <img src={link.thumbnail} alt="" loading="lazy" width="320" height="200" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
    {#if link.media === 'video'}<span class="play" aria-hidden="true"><Icon name="play" /></span>{/if}
  </div>
{:else}
  <div class="thumb fallback" class:broken>
    {@render tags()}
    {#if broken}
      <Icon name="broken" />
    {:else if link.favicon && !favBroken}
      <img class="big-fav" src={link.favicon} alt="" width="44" height="44" onerror={() => (favBroken = true)} />
    {:else}
      <Icon name={media.icon} />
    {/if}
    <span class="host">{link.host}</span>
    <span class="why">{broken ? 'Vignette indisponible' : 'Pas de vignette'}</span>
  </div>
{/if}

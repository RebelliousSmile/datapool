<script lang="ts">
  import { MEDIA } from '#lib/kinds.ts';
  import type { XLink } from '#lib/explore.ts';
  import Icon from './Icon.svelte';

  // Vignette d'un lien. Le cache d'images de webpool arrive en phase 3 : d'ici
  // là, le repli (pictogramme du type, hôte), comme dans les maquettes.
  let { link, rank = true }: { link: XLink; rank?: boolean } = $props();
  const media = $derived(MEDIA.find((m) => m.key === link.media)!);
</script>

<div class="thumb fallback">
  {#if rank}<span class="rank-tag">#{link.rank}</span>{/if}
  {#if link.media !== 'page'}<span class="kind-tag"><Icon name={media.icon} small />{media.one}</span>{/if}
  <Icon name={media.icon} />
  <span class="host">{link.host}</span>
  <span class="why">Pas de vignette</span>
</div>

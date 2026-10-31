<script lang="ts">
  import type { Snippet } from 'svelte';
  import { safeHref } from '#lib/format.ts';

  // Lien vers un site du corpus : nouvel onglet, sans référent, et seulement
  // en http(s) (sinon le texte s'affiche sans lien).
  let { url, children }: { url: string | null | undefined; children: Snippet } = $props();
  const href = $derived(safeHref(url));
</script>

{#if href}
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- lien externe, filtré par safeHref -->
  <a {href} target="_blank" rel="noopener noreferrer">{@render children()}</a>
{:else}
  <span>{@render children()}</span>
{/if}

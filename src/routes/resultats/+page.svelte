<script lang="ts">
  import { page } from '$app/state';
  import SearchResults from '#lib/components/SearchResults.svelte';

  // Résultats de la recherche globale (barre de l'en-tête) dans tous les pools
  // visibles par le client.
  const q = $derived(page.url.searchParams.get('q') ?? '');
</script>

<div class="page-head search-head">
  <div class="titles">
    <h1>Recherche</h1>
    <p class="meta">Dans tous vos pools{#if q.trim()}&nbsp;: <strong>{q.trim()}</strong>{/if}</p>
  </div>
</div>
{#key q}<SearchResults {q} />{/key}

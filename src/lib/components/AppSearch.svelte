<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Icon from './Icon.svelte';

  // Recherche globale de l'en-tête : mène à /resultats?q=. La touche « / »
  // y place le curseur, hors d'un champ de saisie.
  let q = $state(page.url.searchParams.get('q') ?? '');
  let input: HTMLInputElement | undefined = $state();

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const term = q.trim();
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- chemin passé par resolve(), suivi de la requête
    if (term) goto(`${resolve('/resultats')}?q=${encodeURIComponent(term)}`);
  }

  function shortcut(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    input?.focus();
  }
</script>

<svelte:window onkeydown={shortcut} />

<form class="app-search" role="search" onsubmit={submit}>
  <Icon name="search" small />
  <label class="sr-only" for="app-search-q">Rechercher dans les pools</label>
  <input id="app-search-q" name="q" type="search" placeholder="Rechercher dans les pools" bind:value={q} bind:this={input} autocomplete="off" />
  <kbd aria-hidden="true">/</kbd>
</form>

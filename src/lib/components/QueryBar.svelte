<script lang="ts">
  import { untrack } from 'svelte';
  import { fmtNumber } from '#lib/format.ts';
  import { MEDIA } from '#lib/kinds.ts';
  import {
    KEY,
    activeCount,
    addFilter,
    clearFilters,
    labelOf,
    parseToken,
    popFilter,
    removeFilter,
    suggestions,
    tokens,
    type Dim,
    type XLink,
    type XState,
  } from '#lib/explore.ts';
  import Icon from './Icon.svelte';

  // Barre de requête : texte libre et filtres en jetons (`type:image `),
  // suggestions comptées, « / » pour y revenir, Retour arrière pour retirer le
  // dernier jeton.
  let { xs, links, onchange }: { xs: XState; links: XLink[]; onchange: (s: XState) => void } = $props();

  let input = $state<HTMLInputElement>();
  let text = $state(untrack(() => xs.q));
  let open = $state(false);
  let selected = $state(0);

  const rows = $derived(open ? suggestions(links, { ...xs, q: '' }, text) : []);
  const active = $derived(activeCount(xs) > 0 || xs.q !== '');

  // L'état peut changer ailleurs (facettes, vue, effacement) : la saisie suit,
  // sans dépendre d'elle-même (sinon chaque frappe serait effacée).
  $effect(() => {
    const q = xs.q;
    untrack(() => {
      if (!text.includes(':') && text !== q) text = q;
    });
  });

  function oninput(e: Event & { currentTarget: HTMLInputElement }) {
    text = e.currentTarget.value;
    selected = 0;
    open = true;
    const token = parseToken(text, links);
    if (token) {
      text = '';
      onchange({ ...addFilter(xs, token.dim, token.value), q: '' });
    } else if (!text.includes(':')) {
      onchange({ ...xs, q: text });
    }
  }

  function pick(dim: Dim, value: string) {
    text = '';
    open = false;
    onchange({ ...addFilter(xs, dim, value), q: '' });
    input?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Backspace' && !text && activeCount(xs)) {
      onchange(popFilter(xs));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (text && rows[selected]) pick(rows[selected].dim, rows[selected].value);
      else open = false;
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
      e.preventDefault();
      selected = (selected + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  const mediaIcon = (v: string) => MEDIA.find((m) => m.key === v)?.icon;
  const editing = (el: Element | null) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === '/' && !editing(document.activeElement)) {
      e.preventDefault();
      input?.focus();
    }
  }}
  onclick={(e) => open && !(e.target as Element).closest?.('.xp-query') && (open = false)}
/>

{#snippet mark(dim: Dim, value: string)}
  {#if dim === 'usage'}<span class="u-mark" data-usage={value} aria-hidden="true"></span>
  {:else if dim === 'media' && mediaIcon(value)}<Icon name={mediaIcon(value)!} small />{/if}
{/snippet}

<div class="xp-query">
  <form class="qfield" role="search" onsubmit={(e) => e.preventDefault()}>
    <Icon name="search" />
    {#each tokens(xs) as t (`${t.dim}:${t.value}`)}
      <span class="tok">
        <span class="k">{KEY[t.dim]}</span>{@render mark(t.dim, t.value)}{labelOf(t.dim, t.value)}
        <button type="button" aria-label={`Retirer ${labelOf(t.dim, t.value)}`} onclick={() => onchange(removeFilter(xs, t.dim, t.value))}>
          <Icon name="close" small />
        </button>
      </span>
    {/each}
    <input
      bind:this={input}
      bind:value={text}
      {oninput}
      {onkeydown}
      onfocus={() => (open = true)}
      type="search"
      aria-label="Rechercher dans le pool"
      placeholder="Titre, URL… ou type:image"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="xp-sugg"
      aria-expanded={open}
    />
    {#if active}
      <button class="qclear" type="button" onclick={() => ((text = ''), onchange(clearFilters(xs)))}>Effacer</button>
    {/if}
    <kbd aria-hidden="true">/</kbd>
  </form>
  <div class="sugg" id="xp-sugg" role="listbox" aria-label="Suggestions de filtres" hidden={!open}>
    <span class="eyebrow">{text ? 'Filtres correspondants' : 'Affiner'}</span>
    {#each rows as r, i (`${r.dim}:${r.value}`)}
      <button class="sugg-item" type="button" role="option" aria-selected={i === selected} onclick={() => pick(r.dim, r.value)}>
        <span class="k">{KEY[r.dim]}</span>{@render mark(r.dim, r.value)}{r.label}<span class="cnt">{fmtNumber(r.n)}</span>
      </button>
    {:else}
      <p class="sugg-help">Aucun filtre ne correspond : la recherche porte sur les titres et les URLs.</p>
    {/each}
    <p class="sugg-help">
      Écrire <span class="mono">type:</span> <span class="mono">source:</span> <span class="mono">usage:</span>
      <span class="mono">domaine:</span> · <kbd>/</kbd> pour revenir ici · <kbd>Échap</kbd> pour fermer
    </p>
  </div>
</div>

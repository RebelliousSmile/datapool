<script lang="ts">
  import { onDestroy } from 'svelte';
  import { countOf, fmtNumber } from '#lib/format.ts';
  import {
    COPY_FORMATS,
    copyText,
    downloadText,
    formatLinks,
    getCopyFormat,
    setCopyFormat,
    type CopyFormat,
    type CopyLink,
  } from '#lib/copy.ts';
  import Icon from './Icon.svelte';

  // « Copier les N liens » : la sélection courante (tout le pool, ou les liens
  // filtrés), au format choisi (URLs seules par défaut, mémorisé), avec
  // confirmation ; repli par téléchargement si le presse-papiers est refusé.
  // `load` fournit les liens au moment de la copie.
  // `capped` : la sélection dépasse le plafond, seuls les premiers liens partent.
  let {
    slug,
    count,
    filtered = false,
    capped = false,
    load,
  }: {
    slug: string;
    count: number;
    filtered?: boolean;
    capped?: boolean;
    load: () => Promise<CopyLink[]> | CopyLink[];
  } = $props();

  let format = $state<CopyFormat>(getCopyFormat());
  let open = $state(false);
  let status = $state<{ kind: 'busy' | 'ok' | 'err'; text: string } | null>(null);
  let fallbackUrl = $state('');
  let toggleButton = $state<HTMLButtonElement>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const current = $derived(COPY_FORMATS.find((f) => f.key === format)!);
  const menuId = $derived(`copy-menu-${slug}`);

  function choose(key: CopyFormat) {
    format = key;
    setCopyFormat(key);
    close();
  }
  function close() {
    open = false;
    toggleButton?.focus();
  }
  function clearFallback() {
    if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
    fallbackUrl = '';
  }

  async function copy() {
    clearTimeout(timer);
    clearFallback();
    status = { kind: 'busy', text: `Chargement des ${fmtNumber(count)} liens…` };
    let text = '';
    try {
      const links = await load();
      text = formatLinks(links, format);
      await copyText(text);
      status = { kind: 'ok', text: `${countOf(links.length, 'lien')} ${links.length > 1 ? 'copiés' : 'copié'} · ${current.short}` };
      timer = setTimeout(() => (status = null), 4000);
    } catch (err) {
      status = { kind: 'err', text: (err as Error).message || 'Copie impossible' };
      if (text) fallbackUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    }
  }

  // Même sélection et même format, enregistrés dans un fichier.
  async function download() {
    open = false;
    clearTimeout(timer);
    try {
      const links = await load();
      downloadText(formatLinks(links, format), `${slug}.${format}`);
      status = { kind: 'ok', text: `${countOf(links.length, 'lien')} ${links.length > 1 ? 'téléchargés' : 'téléchargé'} · ${current.short}` };
      timer = setTimeout(() => (status = null), 4000);
    } catch (err) {
      status = { kind: 'err', text: (err as Error).message || 'Téléchargement impossible' };
    }
  }

  onDestroy(() => {
    clearTimeout(timer);
    clearFallback();
  });
</script>

<svelte:window
  onkeydown={(e) => open && e.key === 'Escape' && close()}
  onclick={(e) => open && !(e.target as Element).closest?.('.copy') && (open = false)}
/>

<div class="copy">
  <div class="copy-split">
    <button class="btn btn-primary" type="button" onclick={copy} disabled={status?.kind === 'busy' || count === 0}>
      <Icon name="copy" />Copier les <span class="count">{fmtNumber(count)}</span>
      {capped ? 'premiers liens' : 'liens'}{filtered ? ' filtrés' : ''}
    </button>
    <button
      class="btn btn-primary"
      type="button"
      bind:this={toggleButton}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      aria-label={`Format de copie : ${current.label}`}
      onclick={() => (open = !open)}
    >
      <span class="fmt">{current.short}</span><Icon name="chevron" small />
    </button>
  </div>
  <div class="menu" id={menuId} role="menu" aria-label="Format de copie" hidden={!open}>
    <div class="menu-label eyebrow">Format du presse-papiers</div>
    {#each COPY_FORMATS as f (f.key)}
      <button class="menu-item" type="button" role="menuitemradio" aria-checked={f.key === format} onclick={() => choose(f.key)}>
        <span class="radio" aria-hidden="true"></span>
        <b>{f.label}{#if f.key === 'txt'}<span class="default">par défaut</span>{/if}</b>
        <span class="sample">{f.sample}</span>
      </button>
    {/each}
    <button class="menu-item download" type="button" role="menuitem" onclick={download}>
      <span class="radio" aria-hidden="true"><Icon name="download" small /></span>
      <b>Télécharger le fichier</b>
      <span class="sample">{slug}.{format}</span>
    </button>
  </div>
  <span class="copy-status {status?.kind ?? ''}" role="status" hidden={!status}>
    {#if status?.kind === 'ok'}<Icon name="check" small />{:else if status?.kind === 'err'}<Icon name="alert" small />{/if}
    {status?.text}
    {#if status?.kind === 'err' && fallbackUrl}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- blob: local, pas une route -->
      · <a href={fallbackUrl} download={`${slug}.${format}`}>télécharger la liste</a>
    {/if}
  </span>
</div>

<style>
  /* Action du menu (pas un choix de format) : séparée des formats, sans case. */
  .menu-item.download { border-top: 1px solid var(--line); margin-top: var(--space-1); padding-top: var(--space-2); }
  .menu-item.download .radio { border: 0; color: var(--accent); }
</style>

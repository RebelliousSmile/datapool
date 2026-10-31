<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fmtNumber } from '#lib/format.ts';
  import { COPY_FORMATS, copyText, fetchAllLinks, formatLinks, type CopyFormat } from '#lib/copy.ts';
  import { session } from '#lib/session.svelte.ts';
  import Icon from './Icon.svelte';

  // « Copier les N liens » : tout le pool, au format choisi (URLs seules par
  // défaut, mémorisé), avec confirmation ; repli par téléchargement si le
  // presse-papiers est refusé.
  let { slug, count }: { slug: string; count: number } = $props();

  const FORMAT_KEY = 'datapool.copyFormat';
  const saved = localStorage.getItem(FORMAT_KEY);
  let format = $state<CopyFormat>(COPY_FORMATS.some((f) => f.key === saved) ? (saved as CopyFormat) : 'txt');
  let open = $state(false);
  let status = $state<{ kind: 'busy' | 'ok' | 'err'; text: string } | null>(null);
  let fallbackUrl = $state('');
  let toggleButton = $state<HTMLButtonElement>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const current = $derived(COPY_FORMATS.find((f) => f.key === format)!);
  const menuId = $derived(`copy-menu-${slug}`);

  function choose(key: CopyFormat) {
    format = key;
    localStorage.setItem(FORMAT_KEY, key);
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
      const links = await fetchAllLinks(session.client!, slug);
      text = formatLinks(links, format);
      await copyText(text);
      status = { kind: 'ok', text: `${fmtNumber(links.length)} liens copiés · ${current.short}` };
      timer = setTimeout(() => (status = null), 4000);
    } catch (err) {
      status = { kind: 'err', text: (err as Error).message || 'Copie impossible' };
      if (text) fallbackUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
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
    <button class="btn btn-primary" type="button" onclick={copy} disabled={status?.kind === 'busy'}>
      <Icon name="copy" />Copier les <span class="count">{fmtNumber(count)}</span> liens
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
  </div>
  <span class="copy-status {status?.kind ?? ''}" role="status" hidden={!status}>
    {#if status?.kind === 'ok'}<Icon name="check" small />{:else if status?.kind === 'err'}<Icon name="alert" small />{/if}
    {status?.text}
    {#if status?.kind === 'err' && fallbackUrl}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- blob: local, pas une route -->
      · <a href={fallbackUrl} download={`${slug}.${format === 'txt' ? 'txt' : format}`}>télécharger la liste</a>
    {/if}
  </span>
</div>

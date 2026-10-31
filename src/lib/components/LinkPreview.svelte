<script lang="ts">
  import { resolve } from '$app/paths';
  import { copyText } from '#lib/copy.ts';
  import { MEDIA, SOURCES } from '#lib/kinds.ts';
  import type { XLink } from '#lib/explore.ts';
  import ExternalLink from './ExternalLink.svelte';
  import Icon from './Icon.svelte';
  import MediaThumb from './MediaThumb.svelte';
  import UsageBadge from './UsageBadge.svelte';

  // Panneau d'aperçu d'un lien, à droite de la liste (plein écran sur mobile).
  let { link, onclose }: { link: XLink; onclose: () => void } = $props();
  let copied = $state('');
  const media = $derived(MEDIA.find((m) => m.key === link.media)!);

  async function copy() {
    try {
      await copyText(link.url);
      copied = 'URL copiée';
    } catch (err) {
      copied = (err as Error).message;
    }
  }
</script>

<aside class="xp-preview" aria-label="Aperçu du lien">
  <div class="pv-head">
    <span class="eyebrow">Aperçu</span>
    <button class="btn btn-ghost btn-sm" type="button" aria-label="Fermer l'aperçu" onclick={onclose}><Icon name="close" small /></button>
  </div>
  <MediaThumb {link} />
  <h2>{link.title || link.url}</h2>
  <div class="url-full">{link.url}</div>
  <dl class="kv">
    <dt>rang</dt><dd class="mono">#{link.rank}</dd>
    <dt>type</dt><dd><Icon name={media.icon} small /> {media.one}</dd>
    <dt>source</dt><dd>{SOURCES.find((s) => s.key === link.source)!.label} · <span class="mono">{link.host}</span></dd>
    <dt>usage</dt><dd><UsageBadge usage={link.usage_commercial} /></dd>
  </dl>
  <div class="actions">
    <ExternalLink url={link.url}><span class="btn btn-primary btn-sm"><Icon name="arrow" small />Ouvrir</span></ExternalLink>
    <button class="btn btn-sm" type="button" onclick={copy}><Icon name="copy" small />Copier l'URL</button>
    {#if link.id}<a class="btn btn-sm" href={resolve('/urls/[id]', { id: String(link.id) })}>Fiche</a>{/if}
  </div>
  {#if copied}<p class="secondary" role="status">{copied}</p>{/if}
</aside>

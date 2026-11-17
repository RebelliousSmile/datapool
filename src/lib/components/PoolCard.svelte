<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Schemas } from '#lib/api/client.ts';
  import { fmtDate, fmtNumber, usageSegments } from '#lib/format.ts';
  import Icon from './Icon.svelte';

  // Carte d'un pool : mosaïque des premières vignettes (cache webpool),
  // répartition par usage commercial (barre et légende chiffrée), date de
  // matérialisation. Un pool vide est une carte en pointillés.
  let { pool, mediaUrl }: { pool: Schemas['PoolSummary']; mediaUrl: (path: string) => string | null } = $props();

  const MOSAIC = 4;
  const thumbs = $derived(pool.preview.slice(0, MOSAIC).map((p) => mediaUrl(p)));
  const segments = $derived(usageSegments(pool.usage_commercial));
  let broken = $state<Record<number, boolean>>({});
</script>

<li class="pool-card" class:empty={pool.items === 0}>
  <h2>
    <a href={resolve('/pools/[slug]', { slug: pool.slug })}>{pool.label}</a>
    {#if pool.public}<span class="chip" title="visible par tout client">public</span>{/if}
  </h2>
  <div class="mosaic" aria-hidden="true">
    {#each { length: MOSAIC }, i (i)}
      <span
        >{#if thumbs[i] && !broken[i]}<img src={thumbs[i]} alt="" loading="lazy" referrerpolicy="no-referrer" onerror={() => (broken[i] = true)} />{:else}<Icon
            name="image"
            small
          />{/if}</span
      >
    {/each}
  </div>
  {#if segments.length}
    <div class="stackbar" role="img" aria-label={segments.map((s) => `${s.label} : ${s.urls}`).join(', ')}>
      {#each segments as s (s.slug)}
        <span class="seg-u" data-usage={s.slug} style:flex-grow={s.urls}></span>
      {/each}
    </div>
    <p class="mix">
      {#each segments as s (s.slug)}
        <span><span class="u-mark" data-usage={s.slug} aria-hidden="true"></span>{s.label} {fmtNumber(s.urls)}</span>
      {/each}
    </p>
  {/if}
  <div class="foot">
    <span>{fmtNumber(pool.items)} lien{pool.items > 1 ? 's' : ''}</span>
    <span>{pool.refreshed_at ? fmtDate(pool.refreshed_at) : 'jamais matérialisé'}</span>
  </div>
</li>

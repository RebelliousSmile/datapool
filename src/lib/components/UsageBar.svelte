<script lang="ts">
  import { fmtNumber, usageSegments } from '#lib/format.ts';

  // Répartition des liens par usage commercial du domaine : barre empilée,
  // légende chiffrée et repères de forme (la couleur ne porte jamais seule l'information).
  let { rows, unit = 'liens' }: { rows: { usage?: string | null; urls?: number }[]; unit?: string } = $props();
  const segments = $derived(usageSegments(rows));
  // espace fine insécable : « 25 % » ne se coupe jamais
  const pct = (share: number) => `${Math.round(share * 100)}\u202f%`;
</script>

{#if segments.length}
  <div class="stackbar" role="img" aria-label={segments.map((s) => `${s.label} : ${s.urls}`).join(', ')}>
    {#each segments as s (s.slug)}
      <span
        class="seg-u"
        data-usage={s.slug}
        style:flex-grow={s.urls}
        title={`${s.label} : ${fmtNumber(s.urls)} ${unit} (${pct(s.share)})`}
      ></span>
    {/each}
  </div>
  <ul class="legend">
    {#each segments as s (s.slug)}
      <li>
        <span class="u-mark" data-usage={s.slug} aria-hidden="true"></span><span class="name">{s.label}</span>
        <strong>{fmtNumber(s.urls)}</strong><span class="pct">{pct(s.share)}</span>
      </li>
    {/each}
  </ul>
{:else}
  <p class="muted">Aucun lien.</p>
{/if}

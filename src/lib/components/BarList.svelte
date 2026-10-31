<script lang="ts">
  import { fmtNumber } from '#lib/format.ts';

  // Barres horizontales d'une seule série (une teinte), valeur écrite à droite.
  let { rows, unit = 'liens' }: { rows: { label: string; value: number }[]; unit?: string } = $props();
  const max = $derived(Math.max(1, ...rows.map((r) => r.value)));
</script>

<ul class="barlist">
  {#each rows as r (r.label)}
    <li title={`${r.label} : ${fmtNumber(r.value)} ${unit}`}>
      <span class="name">{r.label}</span>
      <span class="track"><span class="fill" style:width={`${(r.value / max) * 100}%`}></span></span>
      <span class="val">{fmtNumber(r.value)}</span>
    </li>
  {/each}
</ul>

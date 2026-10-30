<script lang="ts">
  import { fmtNumber } from '#lib/format.ts';

  // Barres horizontales d'une seule série (une teinte), valeur écrite à droite.
  let { rows, unit = 'URLs' }: { rows: { label: string; value: number }[]; unit?: string } = $props();
  const max = $derived(Math.max(1, ...rows.map((r) => r.value)));
</script>

<table class="barlist">
  <tbody>
    {#each rows as r (r.label)}
      <tr title={`${r.label} : ${fmtNumber(r.value)} ${unit}`}>
        <td class="name">{r.label}</td>
        <td class="track"><span class="fill" style:width={`${(r.value / max) * 100}%`}></span></td>
        <td class="num">{fmtNumber(r.value)}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .barlist td { border: 0; padding: 0.15rem 0.5rem 0.15rem 0; }
  .name { width: 40%; word-break: break-all; font-size: 0.85rem; }
  .track { width: 50%; }
  .fill { display: block; height: 10px; min-width: 2px; background: var(--series-1); border-radius: 0 4px 4px 0; }
  tr:hover .fill { outline: 2px solid var(--ink); outline-offset: 1px; }
</style>

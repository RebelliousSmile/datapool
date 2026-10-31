<script lang="ts">
  import { usageOf } from '#lib/format.ts';

  // Usage commercial : repère de forme + libellé, jamais la couleur seule.
  let { usage }: { usage: string | null | undefined } = $props();
  const u = $derived(usageOf(usage));
</script>

<span class="usage" data-usage={u.slug}><span class="u-mark" aria-hidden="true"></span>{u.label}</span>

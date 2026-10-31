<script lang="ts">
  // Pictogramme du sprite (IconSprite.svelte), décoratif : le texte voisin porte le sens.
  let { name, small = false }: { name: string; small?: boolean } = $props();
</script>

<svg class="icon" class:sm={small} aria-hidden="true"><use href={`#i-${name}`} /></svg>

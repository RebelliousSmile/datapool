<script lang="ts">
  import { session } from '#lib/session.svelte.ts';
  import Icon from './Icon.svelte';

  // Menu du compte (avatar). Pour l'instant : le client de l'API connecté et
  // la déconnexion ; vues, préférences et jetons viendront avec les comptes.
  let open = $state(false);
  let button = $state<HTMLButtonElement>();
  const name = $derived(session.me?.name ?? '');
  const initials = $derived(
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?',
  );
</script>

<svelte:window
  onclick={(e) => open && !(e.target as Element).closest?.('.account') && (open = false)}
  onkeydown={(e) => open && e.key === 'Escape' && ((open = false), button?.focus())}
/>

<div class="account">
  <button class="avatar" type="button" bind:this={button} aria-haspopup="menu" aria-expanded={open} aria-label={`Compte : ${name}`} onclick={() => (open = !open)}>
    {initials}
  </button>
  <div class="menu" role="menu" hidden={!open}>
    <div class="who"><strong>{name}</strong><span class="muted mono">client {session.me?.scope}</span></div>
    <button class="menu-item" role="menuitem" type="button" onclick={() => session.disconnect()}>
      <Icon name="close" small /><b>Se déconnecter</b>
    </button>
  </div>
</div>

<script lang="ts">
  import { resolve } from '$app/paths';
  import { session } from '#lib/session.svelte.ts';
  import Icon from './Icon.svelte';

  // Menu du compte (avatar) : client connecté, e-mail du compte, page du
  // compte (mot de passe) pour une session par e-mail, déconnexion.
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
    <div class="who"><strong>{name}</strong><span class="muted mono">{session.me?.email ?? `client ${session.me?.scope}`}</span></div>
    {#if session.isAccount}
      <a class="menu-item" role="menuitem" href={resolve('/compte')} onclick={() => (open = false)}><Icon name="user" small /><b>Mon compte</b></a>
    {/if}
    <button class="menu-item" role="menuitem" type="button" onclick={() => session.logout()}>
      <Icon name="close" small /><b>Se déconnecter</b>
    </button>
  </div>
</div>

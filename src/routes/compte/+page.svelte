<script lang="ts">
  import PasswordForm from '#lib/components/PasswordForm.svelte';
  import { session } from '#lib/session.svelte.ts';
</script>

<div class="page-head">
  <div class="titles">
    <h1>Mon compte</h1>
    <div class="meta">
      <span>{session.me?.name}</span>
      {#if session.me?.email}<span class="mono">{session.me.email}</span>{/if}
      <span>client {session.me?.scope}</span>
    </div>
  </div>
</div>

{#if session.isAccount}
  <PasswordForm />
{:else}
  <p class="muted">Connecté par jeton d'API : pas de mot de passe à changer. Un compte se crée sur invitation (<code>webpool account invite</code>).</p>
{/if}

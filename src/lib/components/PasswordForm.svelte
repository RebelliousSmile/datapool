<script lang="ts">
  import { session } from '#lib/session.svelte.ts';
  import Icon from './Icon.svelte';

  // Changement de mot de passe d'un compte : les autres sessions sont
  // révoquées par l'API, celle de ce navigateur reste ouverte.
  const PASSWORD_MIN = 12;
  let current = $state('');
  let password = $state('');
  let confirm = $state('');
  let error = $state('');
  let done = $state(false);
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    done = false;
    if (password !== confirm) {
      error = 'Les deux saisies du nouveau mot de passe diffèrent.';
      return;
    }
    busy = true;
    try {
      await session.client!.changePassword({ current, password });
      done = true;
      current = password = confirm = '';
    } catch (err) {
      error = (err as { status?: number }).status === 403 ? 'Mot de passe actuel incorrect.' : (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<form class="panel password-form" onsubmit={submit}>
  <h2>Mot de passe</h2>
  <label class="field"
    ><span>Mot de passe actuel</span><input class="input" type="password" bind:value={current} required autocomplete="current-password" /></label
  >
  <label class="field">
    <span>Nouveau mot de passe</span>
    <input class="input" type="password" bind:value={password} required minlength={PASSWORD_MIN} autocomplete="new-password" />
    <small>{PASSWORD_MIN} caractères au moins. Les autres appareils seront déconnectés.</small>
  </label>
  <label class="field"
    ><span>Confirmer</span><input class="input" type="password" bind:value={confirm} required minlength={PASSWORD_MIN} autocomplete="new-password" /></label
  >
  {#if error}<div class="alert-box err" role="alert"><Icon name="alert" small />{error}</div>{/if}
  {#if done}<p class="alert-box ok" role="status"><Icon name="check" small />Mot de passe changé ; les autres sessions sont fermées.</p>{/if}
  <button class="btn btn-primary" disabled={busy}>Changer le mot de passe</button>
</form>

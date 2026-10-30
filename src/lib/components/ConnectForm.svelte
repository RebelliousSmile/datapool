<script lang="ts">
  import { session } from '#lib/session.svelte.ts';

  let baseUrl = $state(import.meta.env.VITE_WEBPOOL_API_URL ?? 'http://127.0.0.1:3000/api/v1');
  let token = $state('');
  let error = $state('');
  let busy = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    try {
      await session.connect({ baseUrl: baseUrl.trim(), token: token.trim() });
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<form class="card connect" onsubmit={submit}>
  <h1>datapool</h1>
  <p class="secondary">Connexion à l'API webpool. Le jeton se crée avec <code>webpool client add</code>.</p>
  <label>URL de l'API <input bind:value={baseUrl} required type="url" /></label>
  <label>Jeton <input bind:value={token} required type="password" autocomplete="off" /></label>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <button disabled={busy}>Se connecter</button>
</form>

<style>
  .connect { max-width: 420px; margin: 10vh auto; display: grid; gap: 0.75rem; }
</style>

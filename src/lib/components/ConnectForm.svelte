<script lang="ts">
  import { session } from '#lib/session.svelte.ts';
  import { theme } from '#lib/theme.svelte.ts';
  import Icon from './Icon.svelte';

  // `notice` : message venu d'ailleurs (reprise de connexion impossible).
  let { notice = '' }: { notice?: string } = $props();

  let baseUrl = $state(import.meta.env.VITE_WEBPOOL_API_URL ?? 'http://127.0.0.1:3000/api/v1');
  let token = $state('');
  let error = $state('');
  let refused = $state(false);
  let busy = $state(false);
  const message = $derived(error || notice);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    refused = false;
    try {
      await session.connect({ baseUrl: baseUrl.trim(), token: token.trim() });
    } catch (err) {
      error = (err as Error).message;
      refused = (err as { status?: number }).status === 401;
    } finally {
      busy = false;
    }
  }
</script>

<main class="jack" id="main">
  <form class="panel jack-panel" onsubmit={submit}>
    <p class="terminal-line">&gt; datapool · terminal d'accès au pool</p>
    <h1 class="jack-title">data<b>pool</b></h1>
    <p class="secondary jack-lead">
      Branchez-vous sur l'API webpool. Le jeton se crée avec <code>webpool client add</code>.
    </p>
    <div class="jack-fields">
      <label class="field"
        ><span>URL de l'API</span><input class="input" bind:value={baseUrl} required type="url" autocomplete="url" /></label
      >
      <label class="field">
        <span>Jeton</span>
        <input class="input" bind:value={token} required type="password" autocomplete="off" aria-invalid={refused} />
        <small>Gardé dans ce navigateur uniquement.</small>
      </label>
      {#if message}
        <div class="alert-box err" role="alert"><Icon name="alert" small />{message}</div>
      {/if}
      <button class="btn btn-primary jack-submit" disabled={busy}>
        <Icon name="plug" />Jack in<span class="sr-only"> (se connecter)</span>
      </button>
    </div>
    <p class="terminal-line jack-status">
      &gt; {busy ? 'liaison en cours' : 'en attente du jeton'}<span class="caret" aria-hidden="true"></span>
    </p>
    <div class="jack-corner">
      <button class="btn btn-ghost btn-sm theme-toggle" type="button" aria-pressed={theme.light} onclick={() => theme.toggle()}>
        <Icon name={theme.light ? 'moon' : 'sun'} /><span class="lbl">{theme.light ? 'Sombre' : 'Clair'}</span>
      </button>
    </div>
  </form>
</main>

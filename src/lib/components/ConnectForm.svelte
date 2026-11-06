<script lang="ts">
  import { session } from '#lib/session.svelte.ts';
  import { theme } from '#lib/theme.svelte.ts';
  import Icon from './Icon.svelte';

  // Connexion : un compte (e-mail et mot de passe), son activation avec le
  // code d'invitation remis par l'admin, ou un jeton brut d'API.
  // `notice` : message venu d'ailleurs (reprise de connexion impossible).
  let { notice = '' }: { notice?: string } = $props();

  type Mode = 'compte' | 'activation' | 'jeton';
  const TABS: { key: Mode; label: string }[] = [
    { key: 'compte', label: 'Compte' },
    { key: 'activation', label: 'Activation' },
    { key: 'jeton', label: "Jeton d'API" },
  ];
  const PASSWORD_MIN = 12;

  let mode = $state<Mode>('compte');
  let baseUrl = $state(import.meta.env.VITE_WEBPOOL_API_URL ?? 'http://127.0.0.1:3000/api/v1');
  let email = $state('');
  let password = $state('');
  let code = $state('');
  let token = $state('');
  let error = $state('');
  let refused = $state(false);
  let busy = $state(false);
  const message = $derived(error || notice);

  function choose(next: Mode) {
    mode = next;
    error = '';
    refused = false;
    password = '';
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    refused = false;
    const api = baseUrl.trim();
    try {
      if (mode === 'jeton') await session.connect({ baseUrl: api, token: token.trim() });
      else if (mode === 'compte') await session.login(api, { email: email.trim(), password });
      else await session.activate(api, { email: email.trim(), code: code.trim(), password });
    } catch (err) {
      error = (err as Error).message;
      refused = (err as { status?: number }).status === 401;
    } finally {
      busy = false;
    }
  }
</script>

<main class="auth" id="main">
  <section class="auth-side">
    <p class="terminal-line">&gt; datapool · terminal d'accès au pool</p>
    <h1>data<b>pool</b> : des liens triés, prêts à copier.</h1>
    <p>Les pools de webpool : des listes de liens classées, avec leurs vignettes et leur usage commercial.</p>
    <ul class="auth-points">
      <li><Icon name="layers" />Vos pools en cartes, filtrés par type, source, usage ou domaine.</li>
      <li><Icon name="search" />Une recherche dans tous les pools auxquels vous avez accès.</li>
      <li><Icon name="copy" />Une liste entière copiée d'un geste : URLs, Markdown ou CSV.</li>
    </ul>
    <div class="jack-corner">
      <button class="btn btn-ghost btn-sm theme-toggle" type="button" aria-pressed={theme.light} onclick={() => theme.toggle()}>
        <Icon name={theme.light ? 'moon' : 'sun'} /><span class="lbl">{theme.light ? 'Sombre' : 'Clair'}</span>
      </button>
    </div>
  </section>

  <form class="auth-form" onsubmit={submit}>
    <h2>Se connecter</h2>
    <nav class="auth-tabs" aria-label="Mode de connexion">
      {#each TABS as t (t.key)}
        <button type="button" aria-current={mode === t.key ? 'page' : undefined} onclick={() => choose(t.key)}>{t.label}</button>
      {/each}
    </nav>

    {#if mode === 'jeton'}
      <label class="field"
        ><span>URL de l'API</span><input class="input" bind:value={baseUrl} required type="url" autocomplete="url" /></label
      >
      <label class="field">
        <span>Jeton</span>
        <input class="input" bind:value={token} required type="password" autocomplete="off" aria-invalid={refused} />
        <small>Créé par <code>webpool client add</code>. Gardé dans ce navigateur uniquement.</small>
      </label>
    {:else}
      <label class="field"
        ><span>E-mail</span><input class="input" bind:value={email} required type="email" autocomplete="username" aria-invalid={refused} /></label
      >
      {#if mode === 'activation'}
        <label class="field">
          <span>Code d'invitation</span>
          <input class="input" bind:value={code} required autocomplete="one-time-code" aria-invalid={refused} />
          <small>Remis par l'administrateur, valable 7 jours, à usage unique.</small>
        </label>
      {/if}
      <label class="field">
        <span>{mode === 'activation' ? 'Choisir un mot de passe' : 'Mot de passe'}</span>
        <input
          class="input"
          bind:value={password}
          required
          type="password"
          minlength={mode === 'activation' ? PASSWORD_MIN : undefined}
          autocomplete={mode === 'activation' ? 'new-password' : 'current-password'}
          aria-invalid={refused}
        />
        {#if mode === 'activation'}<small>{PASSWORD_MIN} caractères au moins.</small>{/if}
      </label>
    {/if}

    {#if message}
      <div class="alert-box err" role="alert"><Icon name="alert" small />{message}</div>
    {/if}
    <button class="btn btn-primary jack-submit" disabled={busy}>
      <Icon name="plug" />{#if mode === 'activation'}Activer le compte{:else}Jack in<span class="sr-only"> (se connecter)</span>{/if}
    </button>
    <p class="auth-alt">
      {#if mode === 'compte'}
        Pas encore de compte ? L'accès se fait sur invitation : le code reçu sert à l'<button class="link-btn" type="button" onclick={() => choose('activation')}>activation</button>.
      {:else if mode === 'activation'}
        Compte déjà activé ? <button class="link-btn" type="button" onclick={() => choose('compte')}>Se connecter</button>.
      {:else}
        Le jeton brut reste accepté, pour un script comme pour l'administrateur.
      {/if}
    </p>
    <p class="terminal-line jack-status">
      &gt; {busy ? 'liaison en cours' : mode === 'jeton' ? 'en attente du jeton' : 'en attente des identifiants'}<span class="caret" aria-hidden="true"></span>
    </p>
  </form>
</main>

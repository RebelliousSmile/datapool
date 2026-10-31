<script lang="ts">
  import { resolve } from '$app/paths';
  import '../app.css';
  import { page } from '$app/state';
  import ConnectForm from '#lib/components/ConnectForm.svelte';
  import { session } from '#lib/session.svelte.ts';

  let { children } = $props();

  // Reprise de la connexion enregistrée. Une API injoignable n'empêche pas de
  // se reconnecter depuis le formulaire.
  let ready = $state(false);
  let restoreError = $state('');
  session
    .restore()
    .catch((err: Error) => (restoreError = err.message))
    .finally(() => (ready = true));

  const links = $derived([
    { href: resolve('/'), label: 'Tableau de bord', admin: true },
    { href: resolve('/pools'), label: 'Pools', admin: false },
    { href: resolve('/corpus'), label: 'Corpus', admin: true },
    { href: resolve('/domains'), label: 'Domaines', admin: true },
  ].filter((l) => session.isAdmin || !l.admin));

  const current = (href: string) =>
    href === resolve('/') ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

{#if !ready}
  <p class="muted center">Connexion…</p>
{:else if session.me}
  <header>
    <nav>
      <strong>datapool</strong>
      {#each links as l (l.href)}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href déjà passé par resolve() dans links -->
        <a href={l.href} aria-current={current(l.href) ? 'page' : undefined}>{l.label}</a>
      {/each}
    </nav>
    <span class="secondary">
      {session.me.name} <span class="badge">{session.me.scope}</span>
      <button onclick={() => session.disconnect()}>Déconnexion</button>
    </span>
  </header>
  <main>{@render children()}</main>
{:else}
  {#if restoreError}<p class="error center" role="alert">{restoreError}</p>{/if}
  <ConnectForm />
{/if}

<style>
  header {
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;
    padding: 0.6rem 1.5rem; background: var(--surface); border-bottom: 1px solid var(--border);
  }
  nav { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  nav a { color: var(--ink-2); text-decoration: none; }
  nav a[aria-current='page'] { color: var(--ink); font-weight: 600; }
  main { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
  .center { text-align: center; margin-top: 10vh; }
</style>

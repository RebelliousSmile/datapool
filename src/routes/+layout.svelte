<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import ConnectForm from '#lib/components/ConnectForm.svelte';
  import { session } from '#lib/session.svelte.ts';

  let { children } = $props();
  const restoring = session.restore();

  const links = $derived([
    { href: '/', label: 'Tableau de bord', admin: true },
    { href: '/pools', label: 'Pools', admin: false },
    { href: '/corpus', label: 'Corpus', admin: true },
    { href: '/domains', label: 'Domaines', admin: true },
  ].filter((l) => session.isAdmin || !l.admin));

  const current = (href: string) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#await restoring}
  <p class="muted center">Connexion…</p>
{:then}
  {#if session.me}
    <header>
      <nav>
        <strong>datapool</strong>
        {#each links as l (l.href)}
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
    <ConnectForm />
  {/if}
{:catch err}
  <p class="error center" role="alert">{err.message}</p>
  <ConnectForm />
{/await}

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

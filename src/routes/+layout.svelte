<script lang="ts">
  import '../app.css';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import ConnectForm from '#lib/components/ConnectForm.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import IconSprite from '#lib/components/IconSprite.svelte';
  import { session } from '#lib/session.svelte.ts';
  import { theme } from '#lib/theme.svelte.ts';

  let { children } = $props();

  // Reprise de la connexion enregistrée. Une API injoignable n'empêche pas de
  // se reconnecter depuis le formulaire.
  let ready = $state(false);
  let restoreError = $state('');
  session
    .restore()
    .catch((err: Error) => (restoreError = err.message))
    .finally(() => (ready = true));

  const links = $derived(
    [
      { href: resolve('/'), label: 'Tableau de bord', admin: true },
      { href: resolve('/pools'), label: 'Pools', admin: false },
      { href: resolve('/corpus'), label: 'Corpus', admin: true },
      { href: resolve('/domains'), label: 'Domaines', admin: true },
    ].filter((l) => session.isAdmin || !l.admin),
  );

  const current = (href: string) =>
    href === resolve('/') ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<IconSprite />

{#if !ready}
  <main class="jack"><p class="terminal-line">&gt; liaison<span class="caret" aria-hidden="true"></span></p></main>
{:else if session.me}
  <header class="app-header">
    <a class="brand" href={resolve('/pools')} aria-label="datapool, pools"
      ><span class="brand-mark" aria-hidden="true">dp</span><span>data<b>pool</b></span></a
    >
    <nav class="app-nav" aria-label="Navigation principale">
      {#each links as l (l.href)}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href déjà passé par resolve() dans links -->
        <a href={l.href} aria-current={current(l.href) ? 'page' : undefined}>{l.label}</a>
      {/each}
    </nav>
    <div class="app-user">
      <span class="link-status">liaison ok</span>
      <span class="who">{session.me.name} <span class="chip">{session.me.scope}</span></span>
      <button class="btn btn-ghost btn-sm theme-toggle" type="button" aria-pressed={theme.light} onclick={() => theme.toggle()}>
        <Icon name={theme.light ? 'moon' : 'sun'} /><span class="lbl">{theme.light ? 'Sombre' : 'Clair'}</span>
      </button>
      <button class="btn btn-sm" type="button" onclick={() => session.disconnect()}>Déconnexion</button>
    </div>
  </header>
  <main class="page" id="main">{@render children()}</main>
{:else}
  <ConnectForm notice={restoreError} />
{/if}

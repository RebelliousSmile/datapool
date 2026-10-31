<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { Generation, errorMessage } from '../purchase.svelte';
  import Icon from './Icon.svelte';

  // Chargement, erreur, contenu : le motif des pages qui lisent l'API.
  // Pendant un rechargement, le contenu précédent reste affiché (atténué,
  // `aria-busy`) ; une réponse arrivée après une plus récente est ignorée.
  // `value` absent (pas de client) : rien n'est affiché.
  let { value, children }: { value: Promise<T> | undefined | null; children: Snippet<[T]> } = $props();

  let current = $state<{ value: T } | null>(null);
  let error = $state('');
  let pending = $state(false);
  const gen = new Generation();

  $effect(() => {
    const promise = value;
    const n = gen.next();
    if (!promise) {
      pending = false;
      return;
    }
    pending = true;
    promise.then(
      (v) => {
        if (!gen.isCurrent(n)) return;
        current = { value: v };
        error = '';
        pending = false;
      },
      (err) => {
        if (!gen.isCurrent(n)) return;
        error = errorMessage(err);
        pending = false;
      },
    );
  });
</script>

{#if error}<div class="alert-box err" role="alert"><Icon name="alert" small />{error}</div>{/if}
{#if current}
  <div class="async" class:stale={pending} aria-busy={pending}>{@render children(current.value)}</div>
{:else if pending}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{/if}

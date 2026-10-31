<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import ExternalLink from '#lib/components/ExternalLink.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Pager from '#lib/components/Pager.svelte';
  import { REQUEST_STATUS_LABELS, fmtEuros, fmtGiri, parseLimit, payersFor, quote, spentOn } from '#lib/billing.ts';
  import { fmtDate, fmtNumber } from '#lib/format.ts';
  import { session } from '#lib/session.svelte.ts';
  import type { Schemas } from '#lib/api/client.ts';

  // Les pools sont gratuits ; une recherche (appel à un provider) se paie
  // d'avance en giri, sur le portefeuille personnel (crédité par un don) ou sur
  // celui d'une communauté, pour un de ses pools. webpool l'exécute dans le
  // quart d'heure et rembourse les pages non lancées.
  const LIMIT = 20;

  let reload = $state(0);
  let billing = $state<Schemas['Billing'] | null>(null);
  let loadError = $state('');
  let pools = $state<Schemas['PoolSummary'][]>([]);

  $effect(() => {
    void reload;
    const client = session.client;
    if (!client) return;
    Promise.all([client.billing(), client.pools()])
      .then(([b, p]) => {
        billing = b;
        pools = p.items;
        if (!form.provider && b.prices.length) form.provider = b.prices[0].provider;
      })
      .catch((err: Error) => (loadError = err.message));
  });

  let form = $state({ query: '', provider: '', pages: 1, pool: page.url.searchParams.get('pool') ?? '', payer: '' });
  let sending = $state(false);
  let sendError = $state('');
  let notice = $state('');

  const payers = $derived(billing ? payersFor(billing, form.pool) : []);
  const payer = $derived(payers.find((p) => p.value === form.payer));
  const devis = $derived(billing ? quote(billing, { provider: form.provider, pages: form.pages, payer }) : null);
  const giriPerEur = $derived(billing?.giri_per_eur ?? 1000);

  // Une communauté qui ne paie pas le pool choisi rend la main au portefeuille personnel.
  $effect(() => {
    if (payer?.disabled) form.payer = '';
  });
  // OpenRouter n'achète qu'une page.
  $effect(() => {
    if (devis && form.pages > devis.maxPages) form.pages = devis.maxPages;
  });

  async function buy(event: SubmitEvent) {
    event.preventDefault();
    if (!session.client || !devis || devis.problem || !form.query.trim()) return;
    sending = true;
    sendError = '';
    notice = '';
    try {
      const res = await session.client.createRequest({
        query: form.query.trim(),
        provider: form.provider,
        pages: form.pages,
        ...(form.pool ? { pool: form.pool } : {}),
        ...(form.payer ? { community: form.payer } : {}),
      });
      notice = `Recherche #${res.request.id} achetée : ${fmtGiri(res.request.price)} débités, solde ${fmtGiri(res.balance)}. Elle sera lancée dans le quart d'heure.`;
      form.query = '';
      offset = 0;
      reload += 1;
    } catch (err) {
      sendError = (err as Error).message;
    } finally {
      sending = false;
    }
  }

  // Historique : mes recherches, ou celles d'une communauté que je possède.
  let view = $state('');
  let offset = $state(0);
  const owned = $derived(billing?.communities.filter((c) => c.role === 'owner') ?? []);
  const history = $derived.by(() => {
    void reload;
    return session.client?.requests({ community: view, limit: LIMIT, offset });
  });

  async function cancel(r: Schemas['SearchRequest']) {
    sendError = '';
    try {
      const res = await session.client!.cancelRequest(r.id);
      notice = `Recherche #${r.id} annulée : ${fmtGiri(res.refunded)} remboursés.`;
      reload += 1;
    } catch (err) {
      sendError = (err as Error).message;
    }
  }

  // Membres d'une communauté possédée : rôle et plafond (champ vide : sans plafond).
  let crew = $state('');
  let crewReload = $state(0);
  let crewError = $state('');
  let newMember = $state({ name: '', role: 'member', limit: '' });
  const crewSlug = $derived(crew || owned[0]?.slug || '');
  const members = $derived.by(() => {
    void crewReload;
    return crewSlug ? session.client?.members(crewSlug) : undefined;
  });

  async function saveMember(name: string, role: string, limitRaw: string | number | null) {
    crewError = '';
    const limit = parseLimit(limitRaw);
    if (limit === undefined) {
      crewError = 'Plafond : un entier positif ou nul, ou vide pour aucun plafond.';
      return false;
    }
    try {
      await session.client!.setMember(crewSlug, name, { role: role as 'owner' | 'member', monthly_limit: limit });
      crewReload += 1;
      reload += 1;
      return true;
    } catch (err) {
      crewError = (err as Error).message;
      return false;
    }
  }

  async function addMember(event: SubmitEvent) {
    event.preventDefault();
    if (newMember.name.trim() && (await saveMember(newMember.name.trim(), newMember.role, newMember.limit))) {
      newMember = { name: '', role: 'member', limit: '' };
    }
  }

  async function removeMember(name: string) {
    crewError = '';
    try {
      await session.client!.removeMember(crewSlug, name);
      crewReload += 1;
      reload += 1;
    } catch (err) {
      crewError = (err as Error).message;
    }
  }

  const STATUS_CLASS: Record<string, string> = { queued: 'idle', running: 'running', done: 'ok', failed: 'failed', cancelled: 'idle' };
</script>

<div class="page-head">
  <div class="titles">
    <h1>Recherches</h1>
    <div class="meta"><span>les pools sont gratuits</span><span>une recherche se paie en giri, d'avance</span></div>
  </div>
</div>

{#if loadError}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{loadError}</div>
{:else if !billing}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{:else}
  <div class="section-title"><h2>Portefeuilles</h2><span class="eyebrow">1 € = {fmtNumber(billing.giri_per_eur)} giri</span></div>
  <div class="tiles">
    <div class="tile">
      <span class="eyebrow">Personnel</span><span class="value">{fmtGiri(billing.personal.balance)}</span>
      <span class="sub">{fmtEuros(billing.personal.balance, giriPerEur)} · crédité par un don</span>
    </div>
    {#each billing.communities as c (c.slug)}
      <div class="tile">
        <span class="eyebrow">{c.label} · {c.role === 'owner' ? 'propriétaire' : 'membre'}</span>
        <span class="value">{fmtGiri(c.balance)}</span>
        <span class="sub"
          >{c.monthly_limit === null
            ? 'sans plafond'
            : `${fmtGiri(c.spent_30d)} dépensés sur ${fmtGiri(c.monthly_limit)} en 30 jours`} · pools : {c.pools.join(', ') || 'aucun'}</span
        >
      </div>
    {/each}
  </div>
  <p class="muted">
    Le prix d'une recherche suit le coût des tokens du provider, majoré. Une page non lancée, un appel en échec ou une annulation
    sont remboursés en giri. Les giri ne se transfèrent pas et ne se remboursent pas en euros.
    {#if billing.funding_url}
      <ExternalLink url={billing.funding_url}>Faire un don ou acheter des giri pour une communauté</ExternalLink>.
    {:else}
      Pour un don ou un achat de giri, contacter l'administrateur.
    {/if}
  </p>

  <div class="section-title"><h2>Nouvelle recherche</h2><span class="eyebrow">{fmtNumber(billing.max_queued)} en attente au plus</span></div>
  {#if billing.prices.length === 0}
    <p class="muted">Aucun provider n'est ouvert aux recherches.</p>
  {:else}
    <form class="filters" onsubmit={buy}>
      <label class="field"
        ><span>Requête</span><input class="input" bind:value={form.query} maxlength="200" required placeholder="長崎 写真 フリー素材" /></label
      >
      <label class="field"
        ><span>Provider</span>
        <select class="input" bind:value={form.provider}>
          {#each billing.prices as p (p.provider)}
            <option value={p.provider}>{p.provider} — {fmtGiri(p.unit_price)} la page</option>
          {/each}
        </select>
      </label>
      <label class="field"
        ><span>Pages</span><input class="input" type="number" min="1" max={devis?.maxPages ?? 1} bind:value={form.pages} /></label
      >
      <label class="field"
        ><span>Pool visé</span>
        <select class="input" bind:value={form.pool}>
          <option value="">aucun (corpus seulement)</option>
          {#each pools as p (p.slug)}<option value={p.slug}>{p.label}</option>{/each}
        </select>
      </label>
      <label class="field"
        ><span>Payé par</span>
        <select class="input" bind:value={form.payer}>
          {#each payers as p (p.value)}
            <option value={p.value} disabled={!!p.disabled}>{p.label} ({fmtGiri(p.balance)}){p.disabled ? ` — ${p.disabled}` : ''}</option>
          {/each}
        </select>
      </label>
      <button class="btn btn-primary" disabled={sending || !devis || !!devis.problem || !form.query.trim()}>
        <Icon name="search" small />Acheter{devis ? ` · ${fmtGiri(devis.price)}` : ''}
      </button>
    </form>
    {#if devis}
      <p class="muted" aria-live="polite">
        {fmtGiri(devis.price)} ({fmtEuros(devis.price, giriPerEur)}) pour {devis.price / devis.unitPrice} page{devis.price / devis.unitPrice > 1 ? 's' : ''}
        {#if !devis.problem}· solde après achat : {fmtGiri(devis.after)}{/if}
        {#if form.pool}· les liens trouvés entrent dans le pool s'il les accepte{/if}
      </p>
      {#if devis.problem}<div class="alert-box err" role="alert"><Icon name="alert" small />{devis.problem}</div>{/if}
    {/if}
  {/if}
  {#if sendError}<div class="alert-box err" role="alert"><Icon name="alert" small />{sendError}</div>{/if}
  {#if notice}<p class="terminal-line ok" role="status">&gt; {notice}</p>{/if}

  <div class="section-title">
    <h2>Historique</h2>
    {#if owned.length}
      <label class="field"
        ><span class="sr-only">Recherches affichées</span>
        <select class="input" bind:value={view} onchange={() => (offset = 0)}>
          <option value="">mes recherches</option>
          {#each owned as c (c.slug)}<option value={c.slug}>communauté {c.label}</option>{/each}
        </select>
      </label>
    {/if}
  </div>
  {#await history}
    <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
  {:then res}
    {#if res}
      <div class="panel flush table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>#</th><th>Requête</th><th>Statut</th><th class="hide-sm">Provider</th><th class="hide-sm">Pool</th>
              <th class="num">giri</th><th class="num">Liens</th><th class="hide-sm">Achetée</th><th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {#each res.items as r (r.id)}
              <tr class:failed={r.status === 'failed'}>
                <td class="mono">{r.id}</td>
                <td>
                  {r.query}
                  {#if view}<div class="muted">par {r.client}</div>{/if}
                  {#if r.error}<div class="muted" title={r.error}>{r.error}</div>{/if}
                </td>
                <td><span class="status {STATUS_CLASS[r.status]}">{REQUEST_STATUS_LABELS[r.status]}</span></td>
                <td class="mono hide-sm">{r.provider} · {r.calls_done}/{r.pages}</td>
                <td class="hide-sm">
                  {#if r.pool}<a href={resolve('/pools/[slug]', { slug: r.pool })}>{r.pool}</a>{:else}—{/if}
                  {#if r.community}<div class="muted">payé par {r.community}</div>{/if}
                </td>
                <td class="num" title={r.refunded ? `${fmtGiri(r.price)} payés, ${fmtGiri(r.refunded)} remboursés` : undefined}
                  >{fmtNumber(spentOn(r))}</td
                >
                <td class="num" title="résultats · nouveaux · dans le pool"
                  >{fmtNumber(r.results)} · {fmtNumber(r.new_urls)}{r.in_pool === null ? '' : ` · ${fmtNumber(r.in_pool)}`}</td
                >
                <td class="mono nowrap hide-sm">{fmtDate(r.created_at)}</td>
                <td>
                  {#if r.status === 'queued' && !view}
                    <button class="btn btn-sm btn-ghost" type="button" onclick={() => cancel(r)}><Icon name="x" small />Annuler</button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr><td colspan="9" class="muted">Aucune recherche.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pager total={res.total} limit={LIMIT} bind:offset />
    {/if}
  {:catch err}
    <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
  {/await}

  {#if owned.length}
    <div class="section-title">
      <h2>Membres</h2>
      {#if owned.length > 1}
        <label class="field"
          ><span class="sr-only">Communauté</span>
          <select class="input" bind:value={crew}>
            {#each owned as c (c.slug)}<option value={c.slug}>{c.label}</option>{/each}
          </select>
        </label>
      {:else}
        <span class="eyebrow">{owned[0].label} · plafond en giri sur 30 jours, vide : aucun</span>
      {/if}
    </div>
    {#await members}
      <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
    {:then res}
      {#if res}
        <div class="panel flush table-wrap">
          <table class="table">
            <thead>
              <tr><th>Client</th><th>Rôle</th><th>Plafond</th><th class="num">Dépensé (30 j)</th><th><span class="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {#each res.items as m (m.name)}
                {@const edit = { role: m.role, limit: m.monthly_limit === null ? '' : String(m.monthly_limit) }}
                <tr>
                  <td class="mono">{m.name}{#if m.revoked}<span class="chip">révoqué</span>{/if}</td>
                  <td>
                    <label class="sr-only" for={`role-${m.name}`}>Rôle de {m.name}</label>
                    <select class="input" id={`role-${m.name}`} bind:value={edit.role}>
                      <option value="member">membre</option><option value="owner">propriétaire</option>
                    </select>
                  </td>
                  <td>
                    <label class="sr-only" for={`limit-${m.name}`}>Plafond de {m.name}</label>
                    <input class="input" id={`limit-${m.name}`} inputmode="numeric" placeholder="aucun" bind:value={edit.limit} />
                  </td>
                  <td class="num">{fmtNumber(m.spent_30d)}</td>
                  <td class="nowrap">
                    <button class="btn btn-sm" type="button" onclick={() => saveMember(m.name, edit.role, edit.limit)}
                      ><Icon name="check" small />Enregistrer</button
                    >
                    <button class="btn btn-sm btn-ghost" type="button" onclick={() => removeMember(m.name)}><Icon name="x" small />Retirer</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <form class="filters" onsubmit={addMember}>
          <label class="field"><span>Ajouter un client</span><input class="input" bind:value={newMember.name} required placeholder="nom du client" /></label>
          <label class="field"
            ><span>Rôle</span>
            <select class="input" bind:value={newMember.role}><option value="member">membre</option><option value="owner">propriétaire</option></select>
          </label>
          <label class="field"><span>Plafond</span><input class="input" inputmode="numeric" placeholder="aucun" bind:value={newMember.limit} /></label>
          <button class="btn btn-primary"><Icon name="user" small />Ajouter</button>
        </form>
      {/if}
    {:catch err}
      <div class="alert-box err" role="alert"><Icon name="alert" small />{err.message}</div>
    {/await}
    {#if crewError}<div class="alert-box err" role="alert"><Icon name="alert" small />{crewError}</div>{/if}
  {/if}
{/if}

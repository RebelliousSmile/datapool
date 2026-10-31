<script lang="ts">
  import { untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Async from '#lib/components/Async.svelte';
  import ExternalLink from '#lib/components/ExternalLink.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import Pager from '#lib/components/Pager.svelte';
  import {
    ALL_REQUESTS,
    ENTRY_KIND_LABELS,
    REQUEST_STATUSES,
    REQUEST_STATUS_LABELS,
    STATUS_CLASS,
    defaultPayer,
    entryDetail,
    fmtDelta,
    fmtEuros,
    fmtGiri,
    historyQuery,
    knownPool,
    parseLimit,
    payersFor,
    quote,
    spentOn,
  } from '#lib/billing.ts';
  import { fmtDate, fmtNumber } from '#lib/format.ts';
  import { RequestsScreen, errorMessage } from '#lib/purchase.svelte.ts';
  import { session } from '#lib/session.svelte.ts';
  import type { Schemas } from '#lib/api/client.ts';

  // Les pools sont gratuits ; une recherche (appel à un provider) se paie
  // d'avance en giri. Hors communauté, sur le portefeuille personnel (crédité
  // par un don) ; dans une communauté, on ne paie pas pour soi : les pools de la
  // communauté se paient sur son pot, alimenté par les apports des membres.
  // webpool l'exécute dans le quart d'heure et rembourse les pages non lancées.
  // L'état (chargement, achat, annulation, invitations) vit dans RequestsScreen.
  const LIMIT = 20;
  const screen = new RequestsScreen();

  // Soldes à l'arrivée (les pools ne sont lus qu'une fois).
  $effect(() => {
    const client = session.client;
    if (client) untrack(() => screen.load(client));
  });
  const billing = $derived(screen.billing);

  let form = $state({ query: '', provider: '', pages: 1, pool: page.url.searchParams.get('pool') ?? '', payer: '' });

  const payers = $derived(billing ? payersFor(billing, form.pool) : []);
  const payer = $derived(payers.find((p) => p.value === form.payer));
  const devis = $derived(billing ? quote(billing, { provider: form.provider, pages: form.pages, payer }) : null);
  const giriPerEur = $derived(billing?.giri_per_eur ?? 1000);

  $effect(() => {
    if (billing && !form.provider && billing.prices.length) form.provider = billing.prices[0].provider;
  });
  // `?pool=` d'un pool absent de la liste : on n'envoie pas un slug invisible.
  $effect(() => {
    if (screen.poolsLoaded && form.pool) form.pool = knownPool(screen.pools, form.pool);
  });
  // Le payeur suit le pool : pot de la communauté pour ses pools, personnel ailleurs.
  $effect(() => {
    if (!payer || payer.disabled) form.payer = defaultPayer(payers);
  });
  // OpenRouter n'achète qu'une page.
  $effect(() => {
    if (devis && form.pages > devis.maxPages) form.pages = devis.maxPages;
  });

  async function buy(event: SubmitEvent) {
    event.preventDefault();
    if (screen.sending) return;
    const client = session.client;
    if (!client || !devis || devis.problem || !form.query.trim()) return;
    const bought = await screen.buy(client, {
      query: form.query.trim(),
      provider: form.provider,
      pages: form.pages,
      ...(form.pool ? { pool: form.pool } : {}),
      ...(form.payer ? { community: form.payer } : {}),
    });
    if (bought) {
      form.query = '';
      offset = 0;
    }
  }

  // Historique : mes recherches, celles d'une communauté que je possède, ou
  // toutes pour l'admin ; filtre de statut.
  let view = $state('');
  let status = $state('');
  let offset = $state(0);
  const owned = $derived(billing?.communities.filter((c) => c.role === 'owner') ?? []);
  const history = $derived.by(() => {
    void screen.version;
    const client = session.client;
    if (!client) return undefined;
    const { admin, query } = historyQuery(view, { status, limit: LIMIT, offset });
    return admin ? client.adminRequests(query) : client.requests(query);
  });

  // Quitter une communauté : confirmation sur la tuile.
  let leaving = $state('');
  async function leave(slug: string) {
    leaving = '';
    if (session.client) await screen.membership(session.client, 'leave', slug);
  }

  // Mouvements (grand livre), lus à l'ouverture de la section.
  let ledgerOpen = $state(false);
  let ledgerView = $state('');
  let ledgerOffset = $state(0);
  const ledger = $derived.by(() => {
    void screen.version;
    const client = session.client;
    if (!client || !ledgerOpen) return undefined;
    return client.billingEntries({ community: ledgerView, limit: LIMIT, offset: ledgerOffset });
  });

  // Membres d'une communauté possédée : rôle et plafond (champ vide : sans plafond).
  // Ajouter un client l'invite : il devient membre en acceptant.
  let crew = $state('');
  let crewError = $state('');
  let crewNotice = $state('');
  let newMember = $state({ name: '', limit: '' });
  const crewSlug = $derived(crew || owned[0]?.slug || '');
  const members = $derived.by(() => {
    void screen.version;
    return crewSlug ? session.client?.members(crewSlug) : undefined;
  });

  // Le rôle ne se donne pas : le propriétaire est le membre qui a versé le plus au pot.
  async function saveMember(name: string, limitRaw: string | number | null) {
    crewError = '';
    crewNotice = '';
    const limit = parseLimit(limitRaw);
    if (limit === undefined) {
      crewError = 'Plafond : un entier positif ou nul, ou vide pour aucun plafond.';
      return null;
    }
    try {
      const res = await session.client!.setMember(crewSlug, name, { monthly_limit: limit });
      await screen.refresh(session.client!);
      return res;
    } catch (err) {
      crewError = errorMessage(err);
      return null;
    }
  }

  async function addMember(event: SubmitEvent) {
    event.preventDefault();
    const name = newMember.name.trim();
    const res = name ? await saveMember(name, newMember.limit) : null;
    if (res) {
      newMember = { name: '', limit: '' };
      if (!res.accepted) crewNotice = `${name} est invité : il deviendra membre en acceptant l'invitation.`;
    }
  }

  async function removeMember(name: string) {
    crewError = '';
    crewNotice = '';
    try {
      await session.client!.removeMember(crewSlug, name);
      await screen.refresh(session.client!);
    } catch (err) {
      crewError = errorMessage(err);
    }
  }
</script>

{#snippet cancelButton(r: Schemas['SearchRequest'])}
  <button
    class="btn btn-sm btn-ghost"
    type="button"
    disabled={screen.isCancelling(r.id)}
    aria-busy={screen.isCancelling(r.id)}
    onclick={() => session.client && screen.cancel(session.client, r)}
    ><Icon name="x" small />{screen.isCancelling(r.id) ? 'Annulation…' : 'Annuler'}<span class="sr-only"> la recherche #{r.id}</span></button
  >
{/snippet}

<div class="page-head">
  <div class="titles">
    <h1>Recherches</h1>
    <div class="meta"><span>les pools sont gratuits</span><span>une recherche se paie en giri, d'avance</span></div>
  </div>
</div>

{#if screen.fatalError}
  <div class="alert-box err" role="alert"><Icon name="alert" small />{screen.fatalError}</div>
{:else if !billing}
  <p class="terminal-line">&gt; chargement<span class="caret" aria-hidden="true"></span></p>
{:else}
  {#if screen.loadError}
    <div class="alert-box err" role="alert"><Icon name="alert" small />Soldes non rafraîchis : {screen.loadError}</div>
  {/if}

  {#if billing.invitations.length}
    <div class="section-title"><h2>Invitations</h2><span class="eyebrow">{billing.invitations.length} en attente</span></div>
    <ul class="invitations">
      {#each billing.invitations as inv (inv.slug)}
        <li class="panel invitation">
          <div>
            <strong>{inv.label}</strong> vous invite comme membre
            <div class="muted">
              {inv.monthly_limit === null ? 'sans plafond' : `plafond : ${fmtGiri(inv.monthly_limit)} sur 30 jours`} · le {fmtDate(inv.invited_at)}
            </div>
          </div>
          <div class="nowrap">
            <button
              class="btn btn-sm btn-primary"
              type="button"
              disabled={screen.isMembershipBusy(inv.slug)}
              onclick={() => session.client && screen.membership(session.client, 'accept', inv.slug)}
              ><Icon name="check" small />Accepter<span class="sr-only"> l'invitation de {inv.label}</span></button
            >
            <button
              class="btn btn-sm btn-ghost"
              type="button"
              disabled={screen.isMembershipBusy(inv.slug)}
              onclick={() => session.client && screen.membership(session.client, 'decline', inv.slug)}
              ><Icon name="x" small />Décliner<span class="sr-only"> l'invitation de {inv.label}</span></button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="section-title"><h2>Portefeuilles</h2><span class="eyebrow">1 € = {fmtNumber(billing.giri_per_eur)} giri</span></div>
  <div class="tiles">
    <div class="tile">
      <span class="eyebrow">Personnel</span><span class="value">{fmtGiri(billing.personal.balance)}</span>
      <span class="sub">{fmtEuros(billing.personal.balance, giriPerEur)} · crédité par un don</span>
    </div>
    {#each billing.communities as c (c.slug)}
      <div class="tile">
        <span class="eyebrow"
          >{c.label} · {c.role === 'owner' ? 'propriétaire' : 'membre'}</span
        >
        <span class="value">{fmtGiri(c.balance)}</span>
        <span class="sub"
          >{c.role === 'owner'
            ? 'propriétaire : plus gros apport au pot, sans plafond'
            : c.monthly_limit === null
            ? 'sans plafond'
            : `${fmtGiri(c.spent_30d)} dépensés sur ${fmtGiri(c.monthly_limit)} en 30 jours`} · vos apports : {fmtGiri(c.contributed)} · pools :
          {c.pools.join(', ') || 'aucun'}</span
        >
        <div class="tile-actions">
          {#if leaving === c.slug}
            <span class="sub">Quitter {c.label} ? Vos apports restent au pot.</span>
            <button class="btn btn-sm" type="button" disabled={screen.isMembershipBusy(c.slug)} onclick={() => leave(c.slug)}
              >Confirmer</button
            >
            <button class="btn btn-sm btn-ghost" type="button" onclick={() => (leaving = '')}>Rester</button>
          {:else}
            <button class="btn btn-sm btn-ghost" type="button" disabled={screen.isMembershipBusy(c.slug)} onclick={() => (leaving = c.slug)}
              ><Icon name="x" small />Quitter<span class="sr-only"> {c.label}</span></button
            >
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if screen.membershipError}<div class="alert-box err" role="alert"><Icon name="alert" small />{screen.membershipError}</div>{/if}
  <p class="muted">
    Le prix d'une recherche suit le coût des tokens du provider, majoré. Une page non lancée, un appel en échec ou une annulation
    sont remboursés en giri. Dans une communauté, on ne paie pas pour soi : on verse des giri au pot commun, qui paie les
    recherches de ses pools ; chaque apport reste à votre nom. Les giri ne se transfèrent pas et ne se remboursent pas en
    euros.
    {#if billing.funding_url}
      <ExternalLink url={billing.funding_url}>Faire un don, ou verser au pot d'une communauté</ExternalLink> (préciser la
      communauté).
    {:else}
      Pour un don ou un apport à une communauté, contacter l'administrateur.
    {/if}
  </p>

  <details class="ledger" bind:open={ledgerOpen}>
    <summary><h2>Mouvements</h2><span class="eyebrow">dons, apports, achats, remboursements</span></summary>
    {#if owned.length}
      <label class="field"
        ><span>Grand livre</span>
        <select class="input" bind:value={ledgerView} onchange={() => (ledgerOffset = 0)}>
          <option value="">portefeuille personnel</option>
          {#each owned as c (c.slug)}<option value={c.slug}>pot de {c.label}</option>{/each}
        </select>
      </label>
    {/if}
    <Async value={ledger}>
      {#snippet children(res)}
        <div class="panel flush table-wrap">
          <table class="table">
            <thead>
              <tr><th>Date</th><th>Mouvement</th><th class="num">giri</th><th class="hide-sm">Client</th><th>Détail</th></tr>
            </thead>
            <tbody>
              {#each res.items as e (e.id)}
                <tr>
                  <td class="mono nowrap">{fmtDate(e.created_at)}</td>
                  <td>{ENTRY_KIND_LABELS[e.kind]}</td>
                  <td class="num">{fmtDelta(e.delta)}</td>
                  <td class="mono hide-sm">{e.client ?? '—'}</td>
                  <td class="muted">{entryDetail(e)}</td>
                </tr>
              {:else}
                <tr><td colspan="5" class="muted">Aucun mouvement.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
        <Pager total={res.total} limit={LIMIT} bind:offset={ledgerOffset} />
      {/snippet}
    </Async>
  </details>

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
          {#each screen.pools as p (p.slug)}<option value={p.slug}>{p.label}</option>{/each}
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
      <button class="btn btn-primary" disabled={screen.sending || !devis || !!devis.problem || !form.query.trim()}>
        <Icon name="search" small />{screen.sending ? 'Achat…' : 'Acheter'}{devis ? ` · ${fmtGiri(devis.price)}` : ''}
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
  {#if screen.sendError}<div class="alert-box err" role="alert"><Icon name="alert" small />{screen.sendError}</div>{/if}
  {#if screen.notice}<p class="terminal-line ok" role="status">&gt; {screen.notice}</p>{/if}

  <div class="section-title">
    <h2>Historique</h2>
    {#if owned.length || session.isAdmin}
      <label class="field"
        ><span class="sr-only">Recherches affichées</span>
        <select class="input" bind:value={view} onchange={() => (offset = 0)}>
          <option value="">mes recherches</option>
          {#each owned as c (c.slug)}<option value={c.slug}>communauté {c.label}</option>{/each}
          {#if session.isAdmin}<option value={ALL_REQUESTS}>toutes les recherches</option>{/if}
        </select>
      </label>
    {/if}
    <label class="field"
      ><span class="sr-only">Statut</span>
      <select class="input" bind:value={status} onchange={() => (offset = 0)}>
        <option value="">tous les statuts</option>
        {#each REQUEST_STATUSES as st (st)}<option value={st}>{REQUEST_STATUS_LABELS[st]}</option>{/each}
      </select>
    </label>
  </div>
  <Async value={history}>
    {#snippet children(res)}
      <div class="panel flush table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>#</th><th>Requête</th><th>Statut</th><th class="hide-sm">Provider</th><th class="hide-sm">Pool</th>
              <th class="num">giri</th><th class="num">Liens</th><th class="hide-sm">Achetée</th><th class="hide-sm"><span class="sr-only">Actions</span></th>
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
                  <!-- petit écran : la colonne Actions est masquée, l'annulation passe ici -->
                  {#if r.status === 'queued' && !view}<div class="show-sm">{@render cancelButton(r)}</div>{/if}
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
                <td class="hide-sm">{#if r.status === 'queued' && !view}{@render cancelButton(r)}{/if}</td>
              </tr>
            {:else}
              <tr><td colspan="9" class="muted">Aucune recherche.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pager total={res.total} limit={LIMIT} bind:offset />
    {/snippet}
  </Async>

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
    <p class="muted">
      Le propriétaire est le membre qui a versé le plus de giri au pot (ex æquo : tous les premiers ; tant que personne n'a
      versé, le fondateur). Le rôle ne se donne pas : il change de mains quand un autre membre verse davantage. Un
      propriétaire n'a pas de plafond et ne peut pas être retiré par un autre.
    </p>
    <Async value={members}>
      {#snippet children(res)}
        <div class="panel flush table-wrap">
          <table class="table">
            <thead>
              <tr><th>Client</th><th>Rôle</th><th>Plafond</th><th class="num">Dépensé (30 j)</th><th class="num">Apports</th><th><span class="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {#each res.items as m (m.name)}
                {@const edit = { limit: m.monthly_limit === null ? '' : String(m.monthly_limit) }}
                {@const owner = m.role === 'owner'}
                <tr>
                  <td class="mono"
                    >{m.name}{#if !m.accepted}<span class="chip">invité</span>{/if}{#if m.revoked}<span class="chip">révoqué</span>{/if}</td
                  >
                  <td>
                    {#if owner}<span class="chip primary">propriétaire</span>{:else}membre{/if}{#if m.founder}<span
                        class="chip"
                        title="désigné par l'admin : propriétaire tant que personne n'a versé">fondateur</span
                      >{/if}
                  </td>
                  <td>
                    {#if owner}
                      <span class="muted">aucun</span>
                    {:else}
                      <label class="sr-only" for={`limit-${m.name}`}>Plafond de {m.name}</label>
                      <input class="input" id={`limit-${m.name}`} inputmode="numeric" placeholder="aucun" bind:value={edit.limit} />
                    {/if}
                  </td>
                  <td class="num">{fmtNumber(m.spent_30d)}</td>
                  <td class="num">{fmtNumber(m.contributed)}</td>
                  <td class="nowrap">
                    {#if !owner}
                      <button class="btn btn-sm" type="button" onclick={() => saveMember(m.name, edit.limit)}
                        ><Icon name="check" small />Enregistrer</button
                      >
                      <button class="btn btn-sm btn-ghost" type="button" onclick={() => removeMember(m.name)}><Icon name="x" small />Retirer</button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <form class="filters" onsubmit={addMember}>
          <label class="field"><span>Inviter un client</span><input class="input" bind:value={newMember.name} required placeholder="nom du client" /></label>
          <label class="field"><span>Plafond</span><input class="input" inputmode="numeric" placeholder="aucun" bind:value={newMember.limit} /></label>
          <button class="btn btn-primary"><Icon name="user" small />Inviter</button>
        </form>
      {/snippet}
    </Async>
    {#if crewNotice}<p class="terminal-line ok" role="status">&gt; {crewNotice}</p>{/if}
    {#if crewError}<div class="alert-box err" role="alert"><Icon name="alert" small />{crewError}</div>{/if}
  {/if}
{/if}

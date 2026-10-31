import { ApiError, type Client, type Schemas } from './api/client';
import { fmtGiri } from './billing';

// État de l'écran Recherches, hors affichage : chargement des soldes et des
// pools, achat (garde, clé d'idempotence), annulation, invitations et départ
// d'une communauté. La page (src/routes/recherches) ne fait que l'afficher.

type Billing = Schemas['Billing'];
type SearchRequest = Schemas['SearchRequest'];
export type ScreenApi = Pick<
  Client,
  'billing' | 'pools' | 'createRequest' | 'cancelRequest' | 'acceptInvitation' | 'declineInvitation' | 'leaveCommunity'
>;

// Compteur de génération : seule la dernière réponse demandée est appliquée,
// une réponse arrivée en retard est ignorée.
export class Generation {
  #n = 0;
  next() {
    return ++this.#n;
  }
  isCurrent(n: number) {
    return n === this.#n;
  }
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
// Statut 0 : panne réseau ou délai dépassé, l'achat est peut-être passé.
const unsure = (err: unknown) => err instanceof ApiError && err.status === 0;
// 402 solde insuffisant, 429 trop de recherches en attente : soldes à relire.
const staleBalance = (err: unknown) => err instanceof ApiError && (err.status === 402 || err.status === 429);

export class RequestsScreen {
  billing = $state<Billing | null>(null);
  pools = $state<Schemas['PoolSummary'][]>([]);
  poolsLoaded = $state(false);
  // erreur du dernier chargement des soldes ou des pools
  loadError = $state('');
  sending = $state(false);
  sendError = $state('');
  notice = $state('');
  // recherches dont l'annulation est en cours
  cancelling = $state<number[]>([]);
  // invitations ou départs en cours (slug de la communauté)
  membershipBusy = $state<string[]>([]);
  membershipError = $state('');
  // incrémenté après chaque changement : l'historique et les membres se relisent
  version = $state(0);

  #billingGen = new Generation();
  #poolsLoading: Promise<void> | null = null;
  // clé d'idempotence de l'achat en cours, gardée tant que son sort est inconnu
  #pending: { input: string; key: string } | null = null;

  constructor(private readonly newKey: () => string = () => crypto.randomUUID()) {}

  // Erreur plein écran : seulement tant que rien n'a été chargé. Ensuite, les
  // soldes déjà affichés restent et l'erreur passe en alerte (`loadError`).
  get fatalError() {
    return this.billing ? '' : this.loadError;
  }

  // Soldes à chaque appel, pools une seule fois (et de nouveau après un échec).
  async load(api: ScreenApi) {
    const n = this.#billingGen.next();
    this.loadError = '';
    this.#poolsLoading ??= api.pools().then(
      (res) => {
        this.pools = res.items;
        this.poolsLoaded = true;
      },
      (err) => {
        this.#poolsLoading = null;
        throw err;
      },
    );
    try {
      const [billing] = await Promise.all([api.billing(), this.#poolsLoading]);
      if (this.#billingGen.isCurrent(n)) this.billing = billing;
    } catch (err) {
      if (this.#billingGen.isCurrent(n)) this.loadError = errorMessage(err);
    }
  }

  // Changement fait ailleurs (membres) : soldes et listes à relire.
  async refresh(api: ScreenApi) {
    this.version += 1;
    await this.load(api);
  }

  // Achat. Un seul à la fois ; la même clé repart si l'utilisateur relance le
  // même achat après une panne réseau (l'API rend alors la recherche déjà
  // achetée, sans débit). Nouvelle clé après un succès, une erreur métier ou
  // un achat différent. Renvoie true si la recherche est achetée.
  async buy(api: ScreenApi, input: Schemas['SearchRequestInput']): Promise<boolean> {
    if (this.sending) return false;
    this.sending = true;
    this.sendError = '';
    this.notice = '';
    const body = JSON.stringify(input);
    if (this.#pending?.input !== body) this.#pending = { input: body, key: this.newKey() };
    try {
      const res = await api.createRequest(input, { idempotencyKey: this.#pending.key });
      this.#pending = null;
      this.notice = res.replayed
        ? `Recherche #${res.request.id} déjà achetée (envoi repris, rien de plus débité) : solde ${fmtGiri(res.balance)}.`
        : `Recherche #${res.request.id} achetée : ${fmtGiri(res.request.price)} débités, solde ${fmtGiri(res.balance)}. Elle sera lancée dans le quart d'heure.`;
      await this.refresh(api);
      return true;
    } catch (err) {
      if (!unsure(err)) this.#pending = null;
      this.sendError = unsure(err)
        ? `${errorMessage(err)}. L'achat est peut-être passé : relancez-le, il ne sera pas débité deux fois.`
        : errorMessage(err);
      if (staleBalance(err)) await this.load(api);
      return false;
    } finally {
      this.sending = false;
    }
  }

  // Clé d'idempotence en attente (tests, diagnostic).
  get pendingKey() {
    return this.#pending?.key ?? null;
  }

  isCancelling(id: number) {
    return this.cancelling.includes(id);
  }

  // Annulation : jamais deux DELETE pour la même recherche.
  async cancel(api: ScreenApi, r: Pick<SearchRequest, 'id'>) {
    if (this.isCancelling(r.id)) return;
    this.cancelling.push(r.id);
    this.sendError = '';
    this.notice = '';
    try {
      const res = await api.cancelRequest(r.id);
      this.notice = `Recherche #${r.id} annulée : ${fmtGiri(res.refunded)} remboursés.`;
      await this.refresh(api);
    } catch (err) {
      this.sendError = errorMessage(err);
      // statut changé entre-temps (lancée, déjà annulée) : la ligne se relit
      this.version += 1;
    } finally {
      this.cancelling = this.cancelling.filter((id) => id !== r.id);
    }
  }

  isMembershipBusy(slug: string) {
    return this.membershipBusy.includes(slug);
  }

  // Accepter ou décliner une invitation, quitter une communauté. Erreur 400
  // « plus de propriétaire » affichée telle quelle.
  async membership(api: ScreenApi, action: 'accept' | 'decline' | 'leave', slug: string) {
    if (this.isMembershipBusy(slug)) return;
    this.membershipBusy.push(slug);
    this.membershipError = '';
    try {
      if (action === 'accept') await api.acceptInvitation(slug);
      else if (action === 'decline') await api.declineInvitation(slug);
      else await api.leaveCommunity(slug);
      await this.refresh(api);
    } catch (err) {
      this.membershipError = errorMessage(err);
    } finally {
      this.membershipBusy = this.membershipBusy.filter((s) => s !== slug);
    }
  }
}

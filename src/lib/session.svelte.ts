import { createClient, type Client, type Connection, type Schemas } from './api/client';

// Connexion à l'API : URL et jeton gardés dans le localStorage du navigateur.
// Le jeton y est lisible par tout script de la page : l'interface n'en charge
// aucun tiers (pas de CDN, Content-Security-Policy à poser à l'hébergement).
const KEY = 'datapool.connection';

export function readConnection(storage: Pick<Storage, 'getItem'>): Connection | null {
  try {
    const value = JSON.parse(storage.getItem(KEY) ?? 'null');
    return typeof value?.baseUrl === 'string' && typeof value?.token === 'string' ? value : null;
  } catch {
    return null;
  }
}

class Session {
  connection = $state<Connection | null>(null);
  me = $state<Schemas['Me'] | null>(null);
  client = $derived<Client | null>(this.connection ? createClient(this.connection) : null);
  isAdmin = $derived(this.me?.scope === 'admin');

  // Vérifie le jeton (GET /me) avant de l'enregistrer.
  async connect(connection: Connection) {
    this.me = await createClient(connection).me();
    this.connection = connection;
    localStorage.setItem(KEY, JSON.stringify(connection));
  }

  // Reprend la connexion enregistrée ; un jeton révoqué la supprime.
  async restore() {
    const saved = readConnection(localStorage);
    if (!saved) return;
    try {
      await this.connect(saved);
    } catch (err) {
      if ((err as { status?: number }).status === 401) this.disconnect();
      else throw err;
    }
  }

  disconnect() {
    localStorage.removeItem(KEY);
    this.connection = null;
    this.me = null;
  }
}

export const session = new Session();

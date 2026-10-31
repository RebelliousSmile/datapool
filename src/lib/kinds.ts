// Type de média et famille de source d'un lien, déduits de son URL et de son
// domaine. PROVISOIRE : webpool les fournira (phase 3 : `media_type` ; famille
// de source dans le registre des domaines). D'ici là, ces règles suffisent aux
// filtres et aux segments de l'explorateur.

export type Media = 'page' | 'image' | 'video' | 'pdf' | 'data' | 'code' | 'model';
export type Source = 'research' | 'archives' | 'stock' | 'community' | 'video' | 'press' | 'other';

// Ordre d'affichage fixe ; `icon` : pictogramme du sprite.
export const MEDIA: { key: Media; label: string; one: string; icon: string }[] = [
  { key: 'page', label: 'Pages', one: 'page', icon: 'page' },
  { key: 'image', label: 'Images', one: 'image', icon: 'image' },
  { key: 'video', label: 'Vidéos', one: 'vidéo', icon: 'video' },
  { key: 'pdf', label: 'PDF', one: 'PDF', icon: 'pdf' },
  { key: 'data', label: 'Données', one: 'données', icon: 'data' },
  { key: 'code', label: 'Code', one: 'code', icon: 'code' },
  { key: 'model', label: 'Modèles', one: 'modèle', icon: 'model' },
];

export const SOURCES: { key: Source; label: string }[] = [
  { key: 'research', label: 'Recherche' },
  { key: 'archives', label: 'Archives et musées' },
  { key: 'stock', label: "Banques d'images" },
  { key: 'community', label: 'Communautés' },
  { key: 'video', label: 'Plateformes vidéo' },
  { key: 'press', label: 'Presse et guides' },
  { key: 'other', label: 'Autres sources' },
];

const SOURCE_DOMAINS: Record<Exclude<Source, 'other'>, string[]> = {
  research: [
    'plos.org', 'frontiersin.org', 'osf.io', 'nature.com', 'cairn.info', 'arxiv.org', 'hal.science',
    'pnas.org', 'elifesciences.org', 'sagepub.com', 'apa.org', 'cambridge.org', 'nejm.org',
    'researchgate.net', 'annualreviews.org', 'sciencedirect.com', 'springer.com', 'wiley.com',
    'biorxiv.org', 'ncbi.nlm.nih.gov', 'semanticscholar.org', 'jstor.org', 'persee.fr',
    'openedition.org', 'zenodo.org', 'bps.org.uk', 'santepubliquefrance.fr',
  ],
  archives: [
    'europeana.eu', 'commons.wikimedia.org', 'pastvu.com', 'hermitagemuseum.org', 'gallica.bnf.fr',
    'archive.org', 'loc.gov', 'rijksmuseum.nl', 'metmuseum.org', 'britishmuseum.org',
  ],
  stock: [
    'flickr.com', 'pexels.com', 'polyhaven.com', 'ambientcg.com', 'shutterstock.com', 'unsplash.com',
    'pixabay.com', 'gettyimages.com', 'stock.adobe.com', 'freepik.com', 'vecteezy.com',
  ],
  community: [
    'civitai.com', 'huggingface.co', 'github.com', 'gitlab.com', 'reddit.com', 'artstation.com',
    'deviantart.com', 'behance.net', 'stackoverflow.com', 'kaggle.com',
  ],
  video: ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv'],
  press: [
    'theconversation.com', 'aeon.co', 'atlasobscura.com', 'wikipedia.org', 'medium.com', 'substack.com',
    'lemonde.fr', 'bbc.co.uk', 'theguardian.com', 'nytimes.com',
  ],
};

const within = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function sourceOf(domain: string | null | undefined): Source {
  const host = (domain ?? '').toLowerCase().replace(/^www\./, '');
  for (const [source, domains] of Object.entries(SOURCE_DOMAINS)) {
    if (domains.some((d) => within(host, d))) return source as Source;
  }
  return 'other';
}

const EXT: [RegExp, Media][] = [
  [/\.pdf$/, 'pdf'],
  [/\.(jpe?g|png|gif|webp|avif|svg|tiff?|exr|hdr)$/, 'image'],
  [/\.(mp4|webm|mov|mkv)$/, 'video'],
  [/\.(csv|tsv|json|parquet|xlsx?|zip)$/, 'data'],
  [/\.(safetensors|ckpt|gguf|onnx)$/, 'model'],
];

export function mediaOf(url: string): Media {
  let host = '';
  let path = '';
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase().replace(/^www\./, '');
    path = u.pathname.toLowerCase();
  } catch {
    return 'page';
  }
  for (const [re, media] of EXT) if (re.test(path)) return media;
  if (SOURCE_DOMAINS.video.some((d) => within(host, d))) return 'video';
  if (within(host, 'huggingface.co')) return path.startsWith('/datasets/') ? 'data' : path.startsWith('/spaces/') ? 'code' : 'model';
  if (within(host, 'civitai.com') && path.startsWith('/models')) return 'model';
  if (['github.com', 'gitlab.com', 'codeberg.org'].some((d) => within(host, d))) return 'code';
  if ((within(host, 'kaggle.com') && path.startsWith('/datasets')) || within(host, 'zenodo.org') || within(host, 'data.gouv.fr')) {
    return 'data';
  }
  const imagePages: [string, RegExp][] = [
    ['flickr.com', /^\/photos\/[^/]+\/\d/],
    ['unsplash.com', /^\/photos\//],
    ['pexels.com', /^\/photo\//],
    ['pixabay.com', /^\/(photos|illustrations|vectors)\//],
    ['commons.wikimedia.org', /^\/wiki\/file:/],
    ['polyhaven.com', /^\/a\//],
    ['ambientcg.com', /^\/view/],
  ];
  if (imagePages.some(([d, re]) => within(host, d) && re.test(path))) return 'image';
  return 'page';
}

// Vignettes de remplacement générées localement (SVG 320×200), déterministes.
// Elles figurent les vignettes que l'API webpool sert depuis son cache.

function rng(seed) {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => n.toFixed(1);

const PALETTES = {
  forest: ['#cfd9c4', '#7f9a76', '#3c5640', '#1d2d22'],
  forest2: ['#e3e6c8', '#9cae6b', '#4f6b36', '#22331a'],
  forest3: ['#c9d6dc', '#86a0a8', '#3e5a60', '#16262a'],
  forest4: ['#d8d4b8', '#8a9a62', '#46562e', '#1b2412'],
  fog: ['#e9ecee', '#b9c3c6', '#7c8b8f', '#46534f'],
  rain: ['#a9b8bf', '#6c8088', '#3a4a50', '#1a2428'],
  swamp: ['#f2b880', '#c06c4c', '#4c3a40', '#1c1a24'],
  canopy: ['#1a2a2a', '#2f5b4f', '#5fa38a', '#cdeccc'],
  ruins: ['#18303a', '#2d5562', '#4f8f8c', '#b6e0c9'],
  birch: ['#ece9e0', '#c9c4b5', '#4a4a44', '#1e1e1c'],
  moss: ['#20301c', '#3f5f2a', '#6f9440', '#a7c76a'],
  moss2: ['#5a5f5a', '#8c9188', '#b8c46e', '#e1e4a0'],
  moss3: ['#142414', '#2e5230', '#4f8a3f', '#8fc062'],
  glow: ['#05080c', '#0d2a2a', '#22c7a8', '#b6ffe9'],
  leaves: ['#1f2b18', '#4d6b2b', '#87a83f', '#d5e08a'],
  leaves2: ['#162616', '#2f5a2c', '#5c9a4a', '#a9d48a'],
  autumn: ['#3a1e10', '#8a3c18', '#d07a2a', '#f2c46a'],
  autumn2: ['#2a1a12', '#7a3416', '#c25a1e', '#efa94a'],
  roots: ['#2a2018', '#5a4430', '#8c6f4c', '#c9ae86'],
  river: ['#1c2a2c', '#2f5050', '#5e8a6a', '#a8c98c'],
  herbarium: ['#efe6d0', '#d8c9a4', '#8d8a52', '#4d5530'],
  bark: ['#2a2018', '#4c3a2a', '#7a624a', '#a8906e'],
  bark2: ['#3a1e14', '#6a3422', '#9a5236', '#c88a64'],
  bark3: ['#222222', '#444038', '#6c665a', '#9a9384'],
  engraving: ['#f1e8d4', '#c9b894', '#6e5f44', '#2e2618'],
  postcard: ['#ead9bc', '#c2a47a', '#7a6248', '#3a2c20'],
  canal_old: ['#e6dcc6', '#b8a888', '#6c6050', '#2c2822'],
  tower: ['#f4c48c', '#c96f5a', '#5a3a5a', '#1c1830'],
  roofs: ['#9fc0e0', '#5a7fa8', '#3a4a6a', '#141c2c'],
  dome: ['#2a2a5a', '#5a4a8a', '#e0a050', '#141428'],
  canal: ['#f6d7a8', '#e48f7a', '#5a5a8a', '#1a2040'],
  fort: ['#b8c8d0', '#7890a0', '#4a5a68', '#1c242c'],
  factory: ['#b0a090', '#8a5a48', '#5a3a30', '#221812'],
  loft: ['#d0c8b8', '#9a8a78', '#5a504a', '#242020'],
  ship: ['#c0d8e8', '#7aa0c0', '#c03030', '#142030'],
  garden: ['#e8ecf0', '#b8c4cc', '#7a5a3a', '#2c3438'],
  courtyard: ['#d8c49a', '#b08a5a', '#6a4a34', '#2a1e18'],
  arch: ['#c8d8e0', '#e0c890', '#8a6a4a', '#2a2a30'],
  metro: ['#f0e0b8', '#c8a060', '#6a5030', '#20180e'],
  museum: ['#e0d8c8', '#4a8a7a', '#2a5048', '#101c1a'],
  mosaic: ['#1a2a5a', '#3a6aa0', '#e0b040', '#701a2a'],
  cat: ['#e8d8c0', '#b08050', '#5a4030', '#201812'],
  cat2: ['#d8d0c8', '#9a7a60', '#4a3a30', '#1a1410'],
};

const KIND = {
  trees: ['forest', 'forest2', 'forest3', 'forest4', 'fog', 'rain', 'swamp', 'birch'],
  canopy: ['canopy', 'ruins'],
  blobs: ['moss', 'moss2', 'moss3', 'glow', 'leaves', 'leaves2', 'autumn', 'autumn2', 'river', 'herbarium'],
  stripes: ['bark', 'bark2', 'bark3', 'roots'],
  hatch: ['engraving', 'postcard', 'canal_old'],
  city: ['tower', 'roofs', 'dome', 'canal', 'fort', 'factory', 'loft', 'ship', 'garden'],
  arches: ['courtyard', 'arch', 'metro', 'museum', 'mosaic', 'cat', 'cat2'],
};
const kindOf = (name) => Object.keys(KIND).find((k) => KIND[k].includes(name)) ?? 'blobs';

function scene(name) {
  const r = rng(name);
  const [c1, c2, c3, c4] = PALETTES[name] ?? PALETTES.moss;
  const out = [];
  const kind = kindOf(name);
  out.push(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`);
  out.push(`<rect width="320" height="200" fill="url(#g)"/>`);

  if (kind === 'trees') {
    for (let layer = 0; layer < 4; layer++) {
      const col = [c2, c3, c3, c4][layer];
      const op = [0.45, 0.6, 0.8, 1][layer];
      const n = 7 + layer * 2;
      for (let i = 0; i < n; i++) {
        const x = r() * 340 - 10, w = 3 + layer * 2.5 + r() * 4, top = 10 + r() * 60 - layer * 8;
        if (name === 'birch' && layer === 3) {
          out.push(`<rect x="${f(x)}" y="${f(top)}" width="${f(w + 4)}" height="200" fill="#efece4"/><rect x="${f(x)}" y="${f(top + 40 + r() * 60)}" width="${f(w + 4)}" height="4" fill="${c4}"/>`);
        } else if (layer < 2 && r() > 0.3) {
          const h = 70 + r() * 70, b = 150 + layer * 12;
          out.push(`<polygon points="${f(x)},${f(b - h)} ${f(x - 16 - layer * 4)},${f(b)} ${f(x + 16 + layer * 4)},${f(b)}" fill="${col}" opacity="${op}"/>`);
        } else {
          out.push(`<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(200 - top)}" fill="${col}" opacity="${op}"/>`);
        }
      }
    }
    out.push(`<rect y="120" width="320" height="80" fill="${c1}" opacity="${name === 'fog' ? 0.5 : 0.18}"/>`);
    if (name === 'rain') for (let i = 0; i < 60; i++) { const x = r() * 320, y = r() * 200; out.push(`<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - 4)}" y2="${f(y + 12)}" stroke="#dfe8ec" stroke-width="0.8" opacity="0.5"/>`); }
    if (name === 'swamp') out.push(`<circle cx="230" cy="70" r="26" fill="#ffd9a0" opacity="0.85"/>`);
  }

  if (kind === 'canopy') {
    for (let i = 0; i < 9; i++) { const x = 60 + r() * 200; out.push(`<polygon points="${f(x)},0 ${f(x + 18)},0 ${f(x - 40 + r() * 80)},200 ${f(x - 70 + r() * 80)},200" fill="${c4}" opacity="0.12"/>`); }
    for (let i = 0; i < 40; i++) out.push(`<circle cx="${f(r() * 320)}" cy="${f(r() * 60)}" r="${f(14 + r() * 26)}" fill="${[c2, c3][i % 2]}" opacity="0.85"/>`);
    for (let i = 0; i < 6; i++) { const x = r() * 320; out.push(`<rect x="${f(x)}" y="50" width="${f(6 + r() * 8)}" height="150" fill="${c1}"/>`); }
    if (name === 'ruins') out.push(`<path d="M120 200 V120 a40 40 0 0 1 80 0 V200 h-14 V124 a26 26 0 0 0 -52 0 V200z" fill="${c1}" opacity="0.9"/>`);
  }

  if (kind === 'blobs') {
    for (let i = 0; i < 90; i++) {
      const col = [c2, c3, c4][Math.floor(r() * 3)];
      const x = r() * 320, y = r() * 200, s = 4 + r() * 22;
      if (name.startsWith('leaves') || name.startsWith('autumn') || name === 'herbarium') {
        out.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.42)}" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})" fill="${col}" opacity="${f(0.55 + r() * 0.45)}"/>`);
      } else {
        out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.7)}" fill="${col}" opacity="${f(0.4 + r() * 0.6)}"/>`);
      }
    }
    if (name === 'glow') for (let i = 0; i < 14; i++) { const x = 30 + r() * 260, y = 60 + r() * 120; out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="${c4}" opacity="0.25"/><path d="M${f(x - 8)} ${f(y)} q8 -10 16 0z" fill="${c3}"/><rect x="${f(x - 1)}" y="${f(y)}" width="2" height="14" fill="${c3}"/>`); }
    if (name === 'river') out.push(`<path d="M0 120 Q80 100 160 130 T320 120 V160 Q240 150 160 170 T0 160z" fill="#cfe6ea" opacity="0.35"/>`);
  }

  if (kind === 'stripes') {
    for (let i = 0; i < 26; i++) {
      const x = i * 13 + r() * 6, col = [c1, c3, c4][i % 3];
      let d = `M${f(x)} 0`;
      for (let y = 20; y <= 200; y += 20) d += ` Q${f(x + (r() - 0.5) * 18)} ${y - 10} ${f(x + (r() - 0.5) * 8)} ${y}`;
      out.push(`<path d="${d}" stroke="${col}" stroke-width="${f(3 + r() * 6)}" fill="none" opacity="0.85"/>`);
    }
    if (name === 'roots') for (let i = 0; i < 8; i++) out.push(`<path d="M${f(r() * 320)} 0 C ${f(r() * 320)} 80, ${f(r() * 320)} 120, ${f(r() * 320)} 200" stroke="${c4}" stroke-width="${f(6 + r() * 8)}" fill="none" stroke-linecap="round"/>`);
  }

  if (kind === 'hatch') {
    out.push(`<rect width="320" height="200" fill="${c1}"/>`);
    for (let i = 0; i < 70; i++) { const y = i * 3; out.push(`<line x1="0" y1="${y}" x2="320" y2="${y + 18}" stroke="${c2}" stroke-width="0.6" opacity="0.6"/>`); }
    if (name === 'engraving') {
      for (let i = 0; i < 12; i++) { const x = 10 + i * 27 + r() * 10; out.push(`<path d="M${f(x)} 200 V${f(70 + r() * 40)}" stroke="${c4}" stroke-width="${f(3 + r() * 4)}"/><circle cx="${f(x)}" cy="${f(60 + r() * 30)}" r="${f(20 + r() * 14)}" fill="${c3}" opacity="0.75"/>`); }
    } else {
      out.push(`<rect x="0" y="120" width="320" height="80" fill="${c2}" opacity="0.7"/>`);
      for (let i = 0; i < 9; i++) { const x = i * 36, h = 40 + r() * 40; out.push(`<rect x="${x}" y="${f(120 - h)}" width="34" height="${f(h)}" fill="${c3}"/>`); for (let w = 0; w < 3; w++) out.push(`<rect x="${x + 5 + w * 10}" y="${f(126 - h)}" width="5" height="8" fill="${c1}" opacity="0.8"/>`); }
    }
    out.push(`<rect x="6" y="6" width="308" height="188" fill="none" stroke="${c4}" stroke-width="2"/>`);
  }

  if (kind === 'city') {
    const sky = name === 'dome' || name === 'roofs' ? c4 : c1;
    out.push(`<rect width="320" height="200" fill="url(#g)"/>`);
    if (name === 'canal' || name === 'tower') out.push(`<circle cx="250" cy="60" r="22" fill="${c1}" opacity="0.9"/>`);
    let x = -10;
    while (x < 330) {
      const w = 22 + r() * 34, h = 40 + r() * 70;
      out.push(`<rect x="${f(x)}" y="${f(135 - h)}" width="${f(w)}" height="${f(h)}" fill="${c3}"/>`);
      for (let wy = 135 - h + 8; wy < 128; wy += 12) for (let wx = x + 4; wx < x + w - 6; wx += 9) if (r() > 0.45) out.push(`<rect x="${f(wx)}" y="${f(wy)}" width="4" height="6" fill="${name === 'dome' || name === 'roofs' ? '#ffd27a' : c1}" opacity="0.8"/>`);
      x += w + 2;
    }
    if (name === 'dome' || name === 'tower') out.push(`<rect x="140" y="40" width="40" height="95" fill="${c3}"/><circle cx="160" cy="40" r="20" fill="${name === 'dome' ? '#7fd0e0' : c2}"/><rect x="158" y="8" width="4" height="14" fill="${c2}"/>`);
    if (name === 'ship') out.push(`<path d="M60 128 H260 L240 150 H80z" fill="${c3}"/><rect x="120" y="96" width="70" height="32" fill="#e8e8e8"/><rect x="140" y="70" width="14" height="28" fill="${c4}"/>`);
    if (name === 'garden') for (let i = 0; i < 6; i++) out.push(`<rect x="${30 + i * 48}" y="88" width="22" height="46" fill="#a07850" stroke="${c4}"/>`);
    out.push(`<rect y="135" width="320" height="65" fill="${c4}"/>`);
    for (let i = 0; i < 26; i++) { const y = 140 + r() * 56, x2 = r() * 300; out.push(`<rect x="${f(x2)}" y="${f(y)}" width="${f(10 + r() * 30)}" height="1.6" fill="${sky === c4 ? '#ffd27a' : c1}" opacity="0.5"/>`); }
  }

  if (kind === 'arches') {
    out.push(`<rect width="320" height="200" fill="${c2}"/>`);
    const n = name === 'metro' ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const w = 320 / n, x = i * w + w * 0.18, aw = w * 0.64;
      out.push(`<path d="M${f(x)} 200 V${f(90)} a${f(aw / 2)} ${f(aw / 2)} 0 0 1 ${f(aw)} 0 V200z" fill="${c4}"/>`);
      out.push(`<path d="M${f(x + 6)} 200 V${f(92)} a${f(aw / 2 - 6)} ${f(aw / 2 - 6)} 0 0 1 ${f(aw - 12)} 0 V200z" fill="${c3}" opacity="0.65"/>`);
    }
    if (name === 'metro') for (let i = 0; i < 5; i++) out.push(`<circle cx="${40 + i * 60}" cy="34" r="8" fill="#fff6d0"/>`);
    if (name === 'mosaic') for (let i = 0; i < 120; i++) out.push(`<rect x="${f(r() * 320)}" y="${f(r() * 80)}" width="6" height="6" fill="${[c1, c3, c4][i % 3]}"/>`);
    if (name.startsWith('cat')) out.push(`<g fill="${c4}"><ellipse cx="160" cy="150" rx="30" ry="24"/><circle cx="160" cy="112" r="17"/><polygon points="146,102 150,86 158,98"/><polygon points="174,102 170,86 162,98"/><path d="M188 160 q24 -4 20 -30" stroke="${c4}" stroke-width="6" fill="none"/></g>`);
    if (name === 'courtyard') out.push(`<rect x="100" y="0" width="120" height="70" fill="#cfe2f0"/><rect x="100" y="0" width="120" height="70" fill="none" stroke="${c4}" stroke-width="6"/>`);
  }

  // Grain léger
  for (let i = 0; i < 40; i++) out.push(`<rect x="${f(r() * 320)}" y="${f(r() * 200)}" width="1" height="1" fill="#fff" opacity="0.18"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">${out.join('')}</svg>\n`;
}

export const thumbSvg = scene;

// Favicon de remplacement : carré arrondi coloré + initiales (ce que webpool met en cache par domaine).
const FAV_COLORS = ['#1f6feb', '#e8590c', '#2b8a3e', '#c2255c', '#5f3dc4', '#0b7285', '#a61e4d', '#364fc7', '#5c940d', '#d9480f', '#495057', '#087f5b'];
const FAV_KNOWN = {
  'youtube.com': ['#e5322d', '▶'], 'vimeo.com': ['#1ab7ea', 'v'], 'github.com': ['#24292f', 'gh'], 'reddit.com': ['#ff4500', 'r'],
  'flickr.com': ['#0063dc', 'fl'], 'commons.wikimedia.org': ['#3366cc', 'W'], 'ru.wikipedia.org': ['#54595d', 'W'], 'osf.io': ['#2a6496', 'osf'],
  'nature.com': ['#000000', 'n'], 'frontiersin.org': ['#d1305c', 'F'], 'journals.plos.org': ['#4c6280', 'P'], 'polyhaven.com': ['#c7432f', 'ph'],
  'ambientcg.com': ['#2c7a3a', 'cg'], 'huggingface.co': ['#ffb000', 'hf'], 'civitai.com': ['#1c7ed6', 'c'], 'pexels.com': ['#05a081', 'P'],
  'theconversation.com': ['#d8352a', 'tc'], 'atlasobscura.com': ['#2c2c2c', 'AO'], 'europeana.eu': ['#0a72cc', 'e'],
};
export function faviconUri(host) {
  const key = host.replace(/^www\./, '');
  let [bg, txt] = FAV_KNOWN[key] ?? [];
  if (!bg) {
    const h = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    bg = FAV_COLORS[h % FAV_COLORS.length];
    txt = key.split('.')[0].slice(0, 2);
  }
  const fs = txt.length > 2 ? 11 : txt.length > 1 ? 14 : 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${bg}"/><text x="16" y="${txt === '▶' ? 22 : 21.5}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fs}" fill="#fff" text-anchor="middle">${txt}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

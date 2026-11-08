import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* =====================================================================
   SOVEREIGN — Nation Builder  ·  single-file prototype
   ===================================================================== */
const MAP = 160, HALF = MAP / 2, DAY_SEC = 0.8, SAVE_KEY = 'sovereign_save_v1', MAX_PLAYER_NATIONS = 5;
const T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, HILL: 5, MTN: 6 };
const TNAME = ['Laut Dalam', 'Perairan Dangkal', 'Pantai', 'Padang Rumput', 'Hutan', 'Perbukitan', 'Pegunungan'];
const ix = (x, z) => z * MAP + x, inb = (x, z) => x >= 0 && z >= 0 && x < MAP && z < MAP;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const $ = s => document.querySelector(s);
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NCOLORS = ['#22d3ee', '#34d399', '#3b82f6', '#8b5cf6', '#f43f5e', '#fb923c', '#a3e635', '#ec4899', '#14b8a6', '#facc15'];

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function makeNoise(rand) {
  const perm = new Uint8Array(512), p = []; for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const g = (h, dx, dy) => { const v = G[h & 7]; return v[0] * dx + v[1] * dy; };
  function n2(x, y) {
    const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
    const aa = perm[xi + perm[yi]], ab = perm[xi + perm[yi + 1]], ba = perm[xi + 1 + perm[yi]], bb = perm[xi + 1 + perm[yi + 1]];
    const u = fade(xf), v = fade(yf);
    return lerp(lerp(g(aa, xf, yf), g(ba, xf - 1, yf), u), lerp(g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1), u), v);
  }
  return { n2, fbm(x, y, o = 5) { let s = 0, a = 1, f = 1, m = 0; for (let i = 0; i < o; i++) { s += a * n2(x * f, y * f); m += a; a *= 0.5; f *= 2.02; } return s / m; } };
}
function fmt(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : ''; let v, u;
  if (a >= 1e12) { v = a / 1e12; u = ' T'; } else if (a >= 1e9) { v = a / 1e9; u = ' M'; } else if (a >= 1e6) { v = a / 1e6; u = ' jt'; } else if (a >= 1e3) { v = a / 1e3; u = ' rb'; } else { v = a; u = ''; }
  const d = (u === '' || v >= 100) ? 0 : v >= 10 ? 1 : 2;
  return s + v.toFixed(d).replace('.', ',') + u;
}
const money = n => (n < 0 ? '-$' : '$') + fmt(Math.abs(n));
const fmtPop = n => Math.round(n).toLocaleString('id-ID');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _C = new Map();
function C(hex) { let v = _C.get(hex); if (!v) { const c = new THREE.Color(hex); v = [c.r, c.g, c.b]; _C.set(hex, v); } return v; }

/* ---------------- icons ---------------- */
const I = {
  cursor: '<path d="M5 3l14 7-6 2-2 6z"/>',
  road: '<path d="M8 3L5 21M16 3l3 18M12 4v3M12 10.5v3M12 17v3"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  shop: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v1.5a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 13.5a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 10.5z"/><path d="M5 13v7h14v-7"/><path d="M10 20v-4h4v4"/>',
  factory: '<path d="M3 21V11l5 3v-3l5 3V7h3v14"/><path d="M16 4h3v17"/><path d="M2 21h20"/><path d="M7 17h2M11 17h2"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v6M9 11h6"/>',
  tree: '<path d="M12 3l6 8h-3l4 6H5l4-6H6z"/><path d="M12 17v4"/>',
  gov: '<path d="M2 10l10-6 10 6z"/><path d="M4 21h16M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  thumb: '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7a2 2 0 0 1 3 2l-1 4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  ff: '<path d="M3 5l8 7-8 7zM12 5l8 7-8 7z"/>',
  fff: '<path d="M2 6l6 6-6 6zM9 6l6 6-6 6zM16 6l6 6-6 6z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 21h14"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  grid: '<path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a3 3 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  bank: '<path d="M3 10h18L12 4zM5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  hand: '<path d="M7 12l3-3 3 2 4-4"/><path d="M2 12l4-4h3M22 12l-4-4h-2"/><path d="M6 14l4 4 2-1 2 1 4-4"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  compass: '<path d="M12 2l3 10h-6z" fill="#fb7185" stroke="none"/><path d="M12 22l-3-10h6z" fill="#cfd8e8" stroke="none"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  vote: '<path d="M4 20h16"/><path d="M6 20V9h12v11"/><path d="M9 9V4h6v5"/><path d="M10 13l1.5 1.5L15 11"/>',
};
const ico = (n, sw = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;
function flagSVG(n) {
  const c1 = n.color, c2 = n.flag2 || '#f3f5f8', st = n.fstyle || 0;
  let inner;
  if (st === 0) inner = `<rect width="60" height="20" fill="${c1}"/><rect y="20" width="60" height="20" fill="${c2}"/>`;
  else if (st === 1) inner = `<rect width="20" height="40" fill="${c1}"/><rect x="20" width="20" height="40" fill="${c2}"/><rect x="40" width="20" height="40" fill="${c1}"/>`;
  else if (st === 2) inner = `<rect width="60" height="40" fill="${c2}"/><path d="M0 0L30 20L0 40z" fill="${c1}"/><circle cx="12" cy="20" r="4" fill="#fff"/>`;
  else inner = `<rect width="60" height="40" fill="${c1}"/><circle cx="30" cy="20" r="9" fill="${c2}"/><circle cx="30" cy="20" r="4" fill="${c1}"/>`;
  return `<svg viewBox="0 0 60 40" preserveAspectRatio="none">${inner}<rect width="60" height="40" fill="url(#fg)" opacity=".25"/><defs><linearGradient id="fg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs></svg>`;
}

/* ---------------- building catalogue ---------------- */
const CATS = [
  { id: 'select', name: 'Pilih & Inspeksi', icon: 'cursor', key: 'V' },
  { id: 'road', name: 'Jalan & Jembatan', icon: 'road', key: '1' },
  { id: 'res', name: 'Perumahan', icon: 'home', key: '2' },
  { id: 'com', name: 'Komersial', icon: 'shop', key: '3' },
  { id: 'ind', name: 'Industri', icon: 'factory', key: '4' },
  { id: 'util', name: 'Energi & Air', icon: 'bolt', key: '5' },
  { id: 'svc', name: 'Layanan Publik', icon: 'shield', key: '6' },
  { id: 'rec', name: 'Taman & Rekreasi', icon: 'tree', key: '7' },
  { id: 'gov', name: 'Pemerintahan & Strategis', icon: 'gov', key: '8' },
  { id: 'lm', name: 'Landmark Nasional', icon: 'star', key: '9' },
  { sep: 1 },
  { id: 'land', name: 'Wilayah & Negara Baru', icon: 'map', key: 'L' },
  { id: 'bulldoze', name: 'Buldoser', icon: 'trash', key: 'B' },
];
const BT = {
  house: { n: 'Rumah Tapak', c: 'res', cost: 15e3, s: 1, cap: 40, pw: 1, wt: 1, up: 25, lv: 3, days: 2, desc: 'Kompleks rumah keluarga yang asri.' },
  apartment: { n: 'Apartemen', c: 'res', cost: 140e3, s: 1, cap: 280, pw: 5, wt: 5, up: 220, lv: 3, days: 4, unlock: 3000, desc: 'Hunian vertikal kelas menengah.' },
  villa: { n: 'Kawasan Elit', c: 'res', cost: 650e3, s: 2, cap: 140, pw: 6, wt: 6, up: 600, lv: 1, days: 6, unlock: 10000, taxm: 5, desc: 'Warga kaya — pajak 5× per orang.' },
  tower: { n: 'Menara Hunian', c: 'res', cost: 950e3, s: 2, cap: 1900, pw: 26, wt: 24, up: 1400, lv: 3, days: 8, unlock: 16000, desc: 'Kondominium tinggi dengan podium.' },
  shop: { n: 'Ruko', c: 'com', cost: 35e3, s: 1, jobs: 48, pw: 2, wt: 1, up: 60, rev: 45, lv: 3, days: 2, desc: 'Usaha kecil penggerak ekonomi.' },
  mall: { n: 'Mal', c: 'com', cost: 450e3, s: 2, jobs: 520, pw: 16, wt: 8, up: 650, rev: 50, lv: 3, days: 6, unlock: 6000, desc: 'Pusat belanja modern.' },
  office: { n: 'Perkantoran', c: 'com', cost: 1.3e6, s: 1, jobs: 1500, pw: 28, wt: 10, up: 1700, rev: 59, lv: 3, days: 7, unlock: 20000, desc: 'Menara kantor kaca.' },
  hotel: { n: 'Hotel Bintang 5', c: 'com', cost: 2.4e6, s: 2, jobs: 880, pw: 22, wt: 20, up: 2200, rev: 50, tour: 110e3, lv: 1, days: 8, unlock: 24000, desc: 'Menarik turis mancanegara.' },
  skyscraper: { n: 'Pencakar Langit', c: 'com', cost: 6.5e6, s: 2, jobs: 6400, pw: 110, wt: 40, up: 7500, rev: 64, lv: 3, days: 14, unlock: 60000, desc: 'Simbol kemajuan ekonomi.' },
  farm: { n: 'Pertanian', c: 'ind', cost: 45e3, s: 2, jobs: 64, pw: 0, wt: 4, up: 70, rev: 40, lv: 1, days: 3, desc: 'Lumbung pangan nasional.' },
  factory: { n: 'Pabrik', c: 'ind', cost: 280e3, s: 2, jobs: 640, pw: 24, wt: 12, up: 420, rev: 52, poll: 6, lv: 2, days: 5, unlock: 2400, desc: 'Produksi massal. Menghasilkan polusi.' },
  mine: { n: 'Tambang', c: 'ind', cost: 350e3, s: 2, jobs: 360, pw: 10, wt: 3, up: 380, rev: 100, poll: 4, lv: 1, days: 5, needs: 'hill', unlock: 2400, desc: 'Hanya di perbukitan. Untung besar.' },
  industrial: { n: 'Kawasan Industri', c: 'ind', cost: 3.2e6, s: 3, jobs: 3800, pw: 80, wt: 40, up: 3400, rev: 56, poll: 9, lv: 1, days: 10, unlock: 36000, desc: 'Klaster industri raksasa.' },
  solar: { n: 'Ladang Surya', c: 'util', cost: 420e3, s: 2, pgen: 140, up: 300, road: false, days: 3, desc: 'Energi bersih tanpa polusi.' },
  wind: { n: 'Turbin Angin', c: 'util', cost: 260e3, s: 1, pgen: 90, up: 180, road: false, days: 3, desc: 'Listrik dari angin.' },
  coal: { n: 'PLTU', c: 'util', cost: 1.5e6, s: 2, pgen: 750, up: 2400, poll: 8, days: 7, unlock: 4000, desc: 'Daya besar, polusi tinggi.' },
  nuclear: { n: 'PLTN', c: 'util', cost: 14e6, s: 3, pgen: 4200, up: 11000, days: 18, unlock: 80000, desc: 'Daya raksasa & bersih.' },
  watertower: { n: 'Menara Air', c: 'util', cost: 180e3, s: 1, wgen: 320, up: 180, days: 2, desc: 'Pasokan air bersih.' },
  waterplant: { n: 'Instalasi Air', c: 'util', cost: 1.4e6, s: 2, wgen: 2400, up: 1400, days: 6, unlock: 16000, desc: 'Pengolahan air skala kota.' },
  clinic: { n: 'Puskesmas', c: 'svc', cost: 220e3, s: 1, svc: 'health', r: 7, jobs: 80, pw: 3, wt: 2, up: 450, days: 3, desc: 'Layanan kesehatan dasar.' },
  hospital: { n: 'Rumah Sakit', c: 'svc', cost: 1.8e6, s: 2, svc: 'health', r: 15, sv: 1.25, jobs: 800, pw: 20, wt: 15, up: 2800, days: 8, unlock: 12000, desc: 'Kesehatan lengkap + helipad.' },
  school: { n: 'Sekolah', c: 'svc', cost: 380e3, s: 2, svc: 'edu', r: 9, jobs: 160, pw: 5, wt: 3, up: 850, days: 4, desc: 'Pendidikan dasar & menengah.' },
  university: { n: 'Universitas', c: 'svc', cost: 3.5e6, s: 3, svc: 'edu', r: 17, sv: 1.3, jobs: 1280, pw: 30, wt: 15, up: 4200, days: 12, unlock: 32000, desc: 'Kampus riset kelas dunia.' },
  police: { n: 'Kantor Polisi', c: 'svc', cost: 420e3, s: 1, svc: 'safety', r: 11, jobs: 140, pw: 4, wt: 2, up: 850, days: 3, desc: 'Keamanan & ketertiban.' },
  fire: { n: 'Pemadam Kebakaran', c: 'svc', cost: 380e3, s: 1, svc: 'fire', r: 11, jobs: 120, pw: 3, wt: 4, up: 750, days: 3, desc: 'Siaga kebakaran.' },
  park: { n: 'Taman Kota', c: 'rec', cost: 28e3, s: 1, r: 5, hap: 0.07, up: 40, road: false, days: 1, desc: 'Ruang hijau warga.' },
  forest: { n: 'Hutan Kota', c: 'rec', cost: 12e3, s: 1, r: 4, hap: 0.03, up: 15, road: false, days: 1, desc: 'Paru-paru kota.' },
  plaza: { n: 'Alun-Alun', c: 'rec', cost: 320e3, s: 2, r: 8, hap: 0.12, up: 300, days: 3, unlock: 4000, desc: 'Lapangan kota dengan air mancur.' },
  stadium: { n: 'Stadion Nasional', c: 'rec', cost: 5.5e6, s: 3, r: 26, hap: 0.1, tour: 90e3, jobs: 480, pw: 30, wt: 10, up: 4800, days: 14, unlock: 24000, desc: 'Arena olahraga kebanggaan.' },
  palace: { n: 'Istana Presiden', c: 'gov', cost: 0, s: 3, uniq: 1, nobuild: 1, r: 10, hap: 0.06, jobs: 320, pw: 8, wt: 4, up: 1000, days: 1, desc: 'Kantor & kediaman Presiden.' },
  parliament: { n: 'Gedung Parlemen', c: 'gov', cost: 8e6, s: 3, uniq: 1, appr: 5, jobs: 600, pw: 12, wt: 6, up: 3000, days: 12, unlock: 8000, desc: 'Approval presiden +5.' },
  port: { n: 'Pelabuhan', c: 'gov', cost: 6e6, s: 2, needs: 'coast', trade: 260e3, jobs: 880, pw: 14, wt: 6, up: 2500, days: 10, unlock: 10000, desc: 'Gerbang perdagangan laut.' },
  military: { n: 'Pangkalan Militer', c: 'gov', cost: 9e6, s: 3, appr: 2, jobs: 1600, pw: 20, wt: 12, up: 6000, days: 12, unlock: 20000, desc: 'Pertahanan & wibawa negara.' },
  airport: { n: 'Bandara Internasional', c: 'gov', cost: 22e6, s: 4, uniq: 1, trade: 300e3, tourm: 1.5, jobs: 3600, pw: 60, wt: 20, up: 9000, days: 20, unlock: 48000, desc: 'Wisata ×1,5 + perdagangan.' },
  monument: { n: 'Monumen Nasional', c: 'lm', cost: 15e6, s: 2, uniq: 1, r: 22, hap: 0.08, tour: 220e3, up: 1200, days: 14, unlock: 12000, desc: 'Ikon kebanggaan bangsa.' },
  opera: { n: 'Gedung Opera', c: 'lm', cost: 24e6, s: 2, uniq: 1, r: 22, hap: 0.08, tour: 320e3, jobs: 320, pw: 10, wt: 4, up: 2400, days: 16, unlock: 32000, desc: 'Mahakarya arsitektur.' },
  spire: { n: 'Menara Ikonik', c: 'lm', cost: 45e6, s: 2, uniq: 1, r: 30, hap: 0.1, tour: 650e3, jobs: 1200, pw: 60, wt: 20, up: 5000, days: 24, unlock: 120000, desc: 'Menara tertinggi di dunia.' },
};
const VARS = { house: 6, apartment: 4, shop: 5, office: 4, mall: 2, tower: 3, skyscraper: 3, factory: 2 };
const FLAGGED = new Set(['palace', 'parliament', 'military', 'school']);
const LVM = [1, 1.7, 2.6], LVU = [1, 1.5, 2.1], LVC = [0, 0.7, 1.2];
const ROAD_COST = 2500, BRIDGE_COST = [30000, 15000];
const POL = {
  edu: { n: 'Subsidi Pendidikan', d: 'Efek sekolah & kampus terhadap kebahagiaan +65%', cost: n => n.pop * 1.2 },
  health: { n: 'Kesehatan Gratis', d: '+9% kebahagiaan seluruh warga', cost: n => n.pop * 1.6 },
  green: { n: 'Energi Hijau', d: 'Polusi berkurang 60%', cost: n => n.pop * 0.8 + 20000 },
  tour: { n: 'Promosi Pariwisata', d: 'Pendapatan wisata +40%', cost: n => 150000 },
  sez: { n: 'Zona Ekonomi Khusus', d: 'Pendapatan bisnis +20%, kebahagiaan −3%', cost: n => 0 },
  housing: { n: 'Program Rumah Rakyat', d: 'Kapasitas semua hunian +15%', cost: n => n.pop * 0.9 },
};
const MILESTONES = [[2000, 2e6], [5000, 4e6], [10000, 8e6], [25000, 15e6], [50000, 30e6], [100000, 60e6], [250000, 120e6], [500000, 250e6], [1e6, 500e6]];
const AI_DEFS = [
  { name: 'Republik Varanta', leader: 'Presiden Arvid Kallen', fstyle: 1, flag2: '#ffffff' },
  { name: 'Kesultanan Meridia', leader: 'Sultan Rahmat Dirgantara', fstyle: 3, flag2: '#fde68a' },
  { name: 'Federasi Norvalt', leader: 'Kanselir Elena Moravec', fstyle: 2, flag2: '#e2e8f0' },
];

/* ---------------- state ---------------- */
const S = {
  seed: 0, started: false, president: '', day: 0, speed: 1, paused: false,
  nations: [], active: 0, blds: new Map(), nextId: 1,
  tool: { mode: 'select', type: null, rot: 0 }, political: false, showGrid: true, dayNight: true, sfx: true,
  cleared: new Set(), roadSet: new Set(), news: [], mis: [], cnt: { road: 0, land: 0, up: 0, trade: 0, b: {} }, unl: { diplo: false, found: false }, overlay: null, trackOpen: true, terrDirty: true, selected: null, drawer: null, cycle: 0.32,
};
const W = { uTime: { value: 0 }, treeAt: new Map(), treeMesh: [], noise: null };
let terr, elev, owner, road, tileB, H;

/* ---------------- three setup ---------------- */
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.3, 4000);
scene.fog = new THREE.Fog('#cfe5f3', 150, 520);
const hemi = new THREE.HemisphereLight('#d6ebff', '#6b7a55', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e2', 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);
const worldG = new THREE.Group(); scene.add(worldG);     // terrain, trees, water
const bldG = new THREE.Group(); scene.add(bldG);         // pools
const fxG = new THREE.Group(); scene.add(fxG);           // overlays

const skyU = { top: { value: new THREE.Color('#4f93d8') }, hor: { value: new THREE.Color('#cfe5f3') }, bot: { value: new THREE.Color('#1d4b66') } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0.0 ? mix(hor, top, pow(clamp(h*1.4,0.0,1.0),0.6)) : mix(hor, bot, clamp(-h*4.0,0.0,1.0)); gl_FragColor=vec4(c,1.0); \n#include <colorspace_fragment>\n }'
}));
sky.renderOrder = -10; scene.add(sky);

/* ---------------- terrain generation ---------------- */
const TC = { sand: '#e6d5a2', grass1: '#62a045', grass2: '#93c25b', forest: '#467f37', hill1: '#93a05c', hill2: '#ab9c69', rock1: '#77736d', rock2: '#9b958b', snow: '#f4f7fb', bedS: '#d4c08c', bedD: '#0d3550', shore: '#eadcab' };
function genTerrain(seed) {
  const R = mulberry32(seed); const N = makeNoise(R); const M = makeNoise(mulberry32(seed ^ 0x9e3779b9));
  W.noise = N;
  terr = new Uint8Array(MAP * MAP); elev = new Float32Array(MAP * MAP);
  const moist = new Float32Array(MAP * MAP);
  const ox = R() * 200, oz = R() * 200, cxo = (R() - 0.5) * 0.08, czo = (R() - 0.5) * 0.08;
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const nx = x / MAP - 0.5 - cxo, nz = z / MAP - 0.5 - czo;
    const qx = N.fbm(nx * 2.5 + ox, nz * 2.5 + oz, 3), qz = N.fbm(nx * 2.5 + oz + 7.3, nz * 2.5 + ox + 1.7, 3);
    let e = N.fbm((nx + qx * 0.35) * 3.3 + ox, (nz + qz * 0.35) * 3.3 + oz, 6);
    const d = Math.hypot(nx * 1.05, nz) * 2;
    e += 0.32 - Math.pow(d, 2.3) * 0.85;
    const edge = Math.min(x, z, MAP - 1 - x, MAP - 1 - z); if (edge < 10) e -= (10 - edge) * 0.05;
    elev[ix(x, z)] = e; moist[ix(x, z)] = M.fbm(nx * 5 + 11, nz * 5 + 3, 4);
  }
  const sorted = Float32Array.from(elev).sort(); const q = p => sorted[Math.floor(clamp(p, 0, 0.9999) * sorted.length)];
  const sea = q(0.46), shallow = q(0.385);
  const land = sorted.filter(v => v >= sea); const ql = p => land[Math.floor(p * (land.length - 1))];
  const hill = ql(0.8), mtn = ql(0.915);
  Object.assign(W, { sea, mtn, hill, maxE: sorted[sorted.length - 1], minE: sorted[0] });
  for (let i = 0; i < MAP * MAP; i++) { const e = elev[i]; terr[i] = e < shallow ? T.DEEP : e < sea ? T.SHALLOW : e >= mtn ? T.MTN : e >= hill ? T.HILL : T.GRASS; }
  // clean specks
  for (let pass = 0; pass < 2; pass++) for (let z = 1; z < MAP - 1; z++) for (let x = 1; x < MAP - 1; x++) {
    const i = ix(x, z); let l = 0; for (const [dx, dz] of DIRS) if (terr[ix(x + dx, z + dz)] >= 2) l++;
    if (terr[i] >= 2 && l <= 1) terr[i] = T.SHALLOW; else if (terr[i] <= 1 && l >= 4) terr[i] = T.GRASS;
  }
  const t2 = Uint8Array.from(terr);
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const i = ix(x, z); if (t2[i] !== T.GRASS) continue;
    let w = false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Z = z + dz; if (inb(X, Z) && t2[ix(X, Z)] <= 1) w = true; }
    if (w) terr[i] = T.SAND;
  }
  const gm = []; for (let i = 0; i < MAP * MAP; i++) if (terr[i] === T.GRASS) gm.push(moist[i]); gm.sort((a, b) => a - b);
  const ft = gm[Math.floor(gm.length * 0.64)] ?? 1;
  for (let i = 0; i < MAP * MAP; i++) if (terr[i] === T.GRASS && moist[i] > ft) terr[i] = T.FOREST;
  owner = new Int8Array(MAP * MAP).fill(-1); road = new Uint8Array(MAP * MAP); tileB = new Int32Array(MAP * MAP);
}
function buildHeights() {
  const V = MAP + 1; H = new Float32Array(V * V); const R = mulberry32(S.seed + 77);
  for (let vz = 0; vz < V; vz++) for (let vx = 0; vx < V; vx++) {
    let n = 0, w = 0, m = 0, es = 0;
    for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) {
      const x = vx + dx, z = vz + dz; if (!inb(x, z)) continue; n++; const t = terr[ix(x, z)]; es += elev[ix(x, z)];
      if (t <= 1) w++; else if (t === T.MTN) m++;
    }
    let h = 0; const e = n ? es / n : W.minE;
    if (n === 0 || w === n) h = -0.3 - Math.pow(clamp((W.sea - e) / (W.sea - W.minE), 0, 1), 0.75) * 3.2;
    else if (m === n) h = 0.55 + Math.pow(clamp((e - W.mtn) / (W.maxE - W.mtn), 0, 1), 0.8) * 7.8 + R() * 0.4;
    H[vz * V + vx] = h;
  }
}
function tileColor(t, nv, out, P) {
  if (t === T.SAND) out.copy(P.sand); else if (t === T.GRASS) out.copy(P.grass1).lerp(P.grass2, nv);
  else if (t === T.FOREST) out.copy(P.forest).lerp(P.grass1, nv * 0.35); else if (t === T.HILL) out.copy(P.hill1).lerp(P.hill2, nv);
  else if (t === T.MTN) out.copy(P.rock1); else out.copy(P.shore);
}
function buildTerrainMesh() {
  const V = MAP + 1, pos = new Float32Array(V * V * 3), col = new Float32Array(V * V * 3);
  const N = W.noise, c = new THREE.Color(), c2 = new THREE.Color(), P = {}; for (const k in TC) P[k] = new THREE.Color(TC[k]);
  const R = mulberry32(S.seed + 5);
  for (let vz = 0; vz < V; vz++) for (let vx = 0; vx < V; vx++) {
    const vi = vz * V + vx, h = H[vi];
    pos[vi * 3] = vx - HALF; pos[vi * 3 + 1] = h; pos[vi * 3 + 2] = vz - HALF;
    const nv = clamp(N.fbm(vx * 0.07, vz * 0.07, 3) * 0.9 + 0.5, 0, 1);
    if (h < -0.05) { c.copy(P.bedS).lerp(P.bedD, Math.pow(clamp(-h / 3.5, 0, 1), 0.6)); }
    else if (h > 0.3) { c.copy(P.rock1).lerp(P.rock2, nv); if (h > 4.4) c.lerp(P.snow, smooth(4.4, 5.6, h)); }
    else {
      let r = 0, g = 0, b = 0, k = 0;
      for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) { const x = vx + dx, z = vz + dz; if (!inb(x, z)) continue; tileColor(terr[ix(x, z)], nv, c2, P); r += c2.r; g += c2.g; b += c2.b; k++; }
      c.setRGB(r / k, g / k, b / k);
    }
    const j = 1 + (R() - 0.5) * 0.07; col[vi * 3] = c.r * j; col[vi * 3 + 1] = c.g * j; col[vi * 3 + 2] = c.b * j;
  }
  const idx = new Uint32Array(MAP * MAP * 6); let p = 0;
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const a = z * V + x, b = a + 1, cc = a + V, d = cc + 1;
    if ((x + z) & 1) { idx[p++] = a; idx[p++] = cc; idx[p++] = b; idx[p++] = b; idx[p++] = cc; idx[p++] = d; }
    else { idx[p++] = a; idx[p++] = cc; idx[p++] = d; idx[p++] = a; idx[p++] = d; idx[p++] = b; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
  m.receiveShadow = true; m.castShadow = true; worldG.add(m); W.terrain = m;
  // ocean floor + water
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ color: '#0d3550', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -3.55; worldG.add(floor);
  const wm = new THREE.MeshStandardMaterial({ color: '#2a8fb0', transparent: true, opacity: 0.74, roughness: 0.1, metalness: 0.2 });
  wm.onBeforeCompile = sh => {
    sh.uniforms.uTime = W.uTime;
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = 'uniform float uTime; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float w1=sin(vWp.x*1.3+uTime*1.1)+sin(vWp.z*1.7-uTime*0.9)+sin((vWp.x+vWp.z)*0.6+uTime*0.7);
      float w2=cos(vWp.z*1.2+uTime*0.8)+cos(vWp.x*1.9+uTime*1.3)+sin((vWp.x-vWp.z)*0.9-uTime*0.5);
      normal=normalize(normal+vec3(w1*0.04,0.0,w2*0.04));`);
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), wm);
  water.rotation.x = -Math.PI / 2; water.position.y = -0.13; water.receiveShadow = true; water.renderOrder = 1; worldG.add(water); W.water = water;
}
function buildTrees() {
  const pine = new GB(), round = new GB(), rock = new GB();
  pine.cyl(0.03, 0.045, 0.2, 5, 0, 0, 0, '#6b4a33'); pine.cone(0.2, 0.4, 7, 0, 0.14, 0, '#2f6b3a'); pine.cone(0.15, 0.32, 7, 0, 0.34, 0, '#3a7d43');
  round.cyl(0.03, 0.045, 0.2, 5, 0, 0, 0, '#6e4c35'); round.ico(0.19, 0, 0.34, 0, '#4f9a45'); round.ico(0.13, 0.07, 0.46, 0.03, '#62ad50');
  rock.ico(0.16, 0, 0.05, 0, '#8d8a84', 0.6); rock.ico(0.1, 0.13, 0.03, 0.06, '#9c988f', 0.7);
  const geos = [pine.build(), round.build(), rock.build()];
  const R = mulberry32(S.seed + 999), list = [[], [], []];
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const i = ix(x, z), t = terr[i]; if (S.cleared.has(i)) continue;
    let n = 0, kindP = 0.4;
    if (t === T.FOREST) n = 3; else if (t === T.GRASS) n = R() < 0.045 ? 1 : 0; else if (t === T.HILL) { n = R() < 0.22 ? 1 : 0; kindP = 0.85; if (R() < 0.35) list[2].push([i, x + 0.2 + R() * 0.6, z + 0.2 + R() * 0.6, 0.7 + R() * 0.8]); }
    else if (t === T.SAND) n = R() < 0.02 ? 1 : 0;
    if (elev[i] > (W.hill + W.sea) / 2) kindP += 0.3;
    for (let k = 0; k < n; k++) list[R() < kindP ? 0 : 1].push([i, x + 0.15 + R() * 0.7, z + 0.15 + R() * 0.7, 0.75 + R() * 0.65]);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  W.treeMesh = []; W.treeAt = new Map();
  list.forEach((L, k) => {
    const im = new THREE.InstancedMesh(geos[k], mat, Math.max(1, L.length)); im.count = L.length;
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    L.forEach((t, n) => {
      p.set(t[1] - HALF, 0, t[2] - HALF); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28); s.setScalar(t[3]);
      im.setMatrixAt(n, m4.compose(p, q, s));
      const b = 0.82 + R() * 0.32; col.setRGB(b * (0.95 + R() * 0.1), b, b * (0.9 + R() * 0.1)); im.setColorAt(n, col);
      let a = W.treeAt.get(t[0]); if (!a) W.treeAt.set(t[0], a = []); a.push([k, n]);
    });
    worldG.add(im); W.treeMesh.push(im);
  });
}
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
function clearTrees(i) {
  const L = W.treeAt.get(i); S.cleared.add(i); if (!L) return;
  for (const [m, k] of L) { W.treeMesh[m].setMatrixAt(k, ZERO_M); W.treeMesh[m].instanceMatrix.needsUpdate = true; }
  W.treeAt.delete(i);
}
function disposeGroup(g) {
  for (const o of [...g.children]) { g.remove(o); o.geometry?.dispose?.(); if (o.material && o !== sky) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }
}
function generateWorld(seed) {
  S.seed = seed; disposeGroup(worldG);
  genTerrain(seed); buildHeights(); buildTerrainMesh(); buildTrees(); buildMinimapBase();
  S.terrDirty = true;
}

/* ---------------- territory overlay ---------------- */
const terrFillMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const terrLineMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
function rebuildTerritory() {
  S.terrDirty = false;
  if (W.tFill) { fxG.remove(W.tFill); W.tFill.geometry.dispose(); } if (W.tLine) { fxG.remove(W.tLine); W.tLine.geometry.dispose(); }
  const fp = [], fc = [], lp = [], lc = [], V = MAP + 1;
  const hy = (vx, vz) => Math.max(H[vz * V + vx], -0.1) + 0.075;
  const cols = S.nations.map(n => new THREE.Color(n.color)), lcols = S.nations.map(n => new THREE.Color(n.color).lerp(new THREE.Color('#ffffff'), 0.22));
  const bw = S.political ? 0.2 : 0.13;
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const o = owner[ix(x, z)]; if (o < 0) continue;
    const c = cols[o], lc2 = lcols[o], x0 = x - HALF, x1 = x0 + 1, z0 = z - HALF, z1 = z0 + 1;
    const y00 = hy(x, z), y10 = hy(x + 1, z), y01 = hy(x, z + 1), y11 = hy(x + 1, z + 1);
    fp.push(x0, y00, z0, x0, y01, z1, x1, y10, z0, x1, y10, z0, x0, y01, z1, x1, y11, z1);
    for (let k = 0; k < 6; k++) fc.push(c.r, c.g, c.b);
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0], nz = z + DIRS[d][1]; const no = inb(nx, nz) ? owner[ix(nx, nz)] : -2; if (no === o) continue;
      let A, B, Ai, Bi;
      if (d === 0) { A = [x0, y00, z0]; B = [x1, y10, z0]; Ai = [x0, y00, z0 + bw]; Bi = [x1, y10, z0 + bw]; }
      else if (d === 1) { A = [x1, y10, z0]; B = [x1, y11, z1]; Ai = [x1 - bw, y10, z0]; Bi = [x1 - bw, y11, z1]; }
      else if (d === 2) { A = [x1, y11, z1]; B = [x0, y01, z1]; Ai = [x1, y11, z1 - bw]; Bi = [x0, y01, z1 - bw]; }
      else { A = [x0, y01, z1]; B = [x0, y00, z0]; Ai = [x0 + bw, y01, z1]; Bi = [x0 + bw, y00, z0]; }
      lp.push(...A, ...B, ...Bi, ...A, ...Bi, ...Ai);
      const ao = 1, ai = 0;
      lc.push(lc2.r, lc2.g, lc2.b, ao, lc2.r, lc2.g, lc2.b, ao, lc2.r, lc2.g, lc2.b, ai, lc2.r, lc2.g, lc2.b, ao, lc2.r, lc2.g, lc2.b, ai, lc2.r, lc2.g, lc2.b, ai);
    }
  }
  if (fp.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
    W.tFill = new THREE.Mesh(g, terrFillMat); W.tFill.renderOrder = 3; W.tFill.visible = S.political; fxG.add(W.tFill);
  } else W.tFill = null;
  if (lp.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(lc, 4));
    W.tLine = new THREE.Mesh(g, terrLineMat); W.tLine.renderOrder = 4; fxG.add(W.tLine);
  } else W.tLine = null;
  mmDirty = true;
}

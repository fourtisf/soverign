/* =====================================================================
   REALISM · WEATHER · SEASONS · LIVING CITY · TRANSPORT · CITIZENS · CALENDAR · ECONOMY
   ===================================================================== */
Object.assign(I, {
  bus: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 18v2M16 18v2M7.5 14.5h.01M16.5 14.5h.01"/>',
  metro: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 17l-2 4M15 17l2 4M8.5 14h.01M15.5 14h.01"/>',
  rain: '<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 17 16H7"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.5 11 3.5 3.5 0 0 1 18 18z"/>',
  sunwx: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  storm: '<path d="M7 14a4 4 0 1 1 1-7.9A5 5 0 0 1 17.5 8 3.5 3.5 0 0 1 17 15"/><path d="M12 13l-2 4h3l-2 4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
});

/* ---------------- transport buildings ---------------- */
Object.assign(BT, {
  busterminal: { n: 'Bus Terminal', c: 'trans', cost: 600e3, s: 2, jobs: 120, pw: 4, wt: 2, up: 900, days: 4, unlock: 3000, tcap: 6000, desc: 'City buses: +6,000 commuter capacity. Buses run on your roads.' },
  metro: { n: 'Metro Station', c: 'trans', cost: 4.5e6, s: 2, jobs: 260, pw: 30, wt: 6, up: 3500, days: 10, unlock: 30000, tcap: 40000, desc: 'Underground rail: +40,000 commuter capacity.' },
});
function busBody(g, x, z, col, ry = 0, len = 0.56) {
  g.box(0.16, 0.12, len, x, 0.035, z, col, ry); g.box(0.165, 0.012, len + 0.005, x, 0.155, z, '#f2f4f6', ry);
  g.lit().box(0.17, 0.04, len - 0.1, x, 0.1, z, '#cfe3ff', ry);
}
Object.assign(GEO, {
  busterminal(g) {
    pave(g, 2, '#9aa3ad'); g.box(1.6, 0.05, 0.5, 0, 0.03, -0.4, '#c9ced4');
    for (const x of [-0.7, -0.23, 0.23, 0.7]) g.box(0.04, 0.34, 0.04, x, 0.08, -0.4, '#5b6573');
    g.box(1.72, 0.04, 0.64, 0, 0.42, -0.4, '#2fa58f');
    g.box(0.6, 0.38, 0.5, -0.55, 0.03, 0.55, '#e7e2d8'); g.box(0.66, 0.04, 0.56, -0.55, 0.41, 0.55, '#3b4a59');
    winGrid(g, -0.55, 0.55, 0.6, 0.5, 0.1, 0.38, { lit: 0.6 });
    for (const [x, c] of [[-0.45, '#e5a33d'], [0, '#2e6fd8'], [0.45, '#e5a33d']]) busBody(g, x, 0.25, c);
    lamp(g, 0.88, 0.88); lamp(g, -0.88, -0.05); bush(g, 0.35, 0.8); bush(g, 0.6, 0.85, 0.07);
  },
  metro(g) {
    pave(g, 2, '#cfd3d8'); g.box(1.3, 0.035, 0.9, 0, 0.03, 0.15, '#8e98a3');
    g.box(0.95, 0.3, 0.6, 0, 0.065, 0.15, '#7fa9cf'); g.lit().box(0.9, 0.18, 0.006, 0, 0.12, 0.455, '#d6ecff');
    g.box(1.1, 0.05, 0.75, 0, 0.365, 0.15, '#e8ebef'); g.box(0.5, 0.06, 0.3, 0.75, 0.03, -0.7, '#9aa4ae');
    g.cyl(0.02, 0.022, 0.75, 6, -0.75, 0.03, -0.62, '#48505c'); g.box(0.24, 0.24, 0.03, -0.75, 0.66, -0.62, '#c0392b'); g.lit().box(0.13, 0.13, 0.033, -0.75, 0.7, -0.62, '#ffffff');
    treeG(g, 0.72, 0.78, 0.9); treeG(g, -0.75, 0.75, 0.85); bush(g, 0.2, -0.75); lamp(g, 0.85, -0.2);
  },
});

/* ---------------- districts ---------------- */
const DIST_A = ['North', 'South', 'East', 'West', 'Old', 'New', 'Upper', 'Lower', 'Royal', 'Sunrise', 'Golden', 'Silver'];
const DIST_B = { coast: ['Harbor', 'Bayside', 'Beach', 'Marina', 'Cove'], hill: ['Heights', 'Ridge', 'Hills', 'Summit'], forest: ['Grove', 'Woods', 'Garden', 'Orchard'], plain: ['Town', 'Park', 'Square', 'Gate', 'Market', 'Fields', 'Village', 'Quarter'] };
const distCache = new Map();
function districtAt(x, z) {
  const k = (Math.floor(z / 12) * 20 + Math.floor(x / 12)) + S.seed * 1000; let v = distCache.get(k); if (v) return v;
  const cx = Math.floor(x / 12) * 12 + 6, cz = Math.floor(z / 12) * 12 + 6; let w = 0, h = 0, f = 0;
  for (let dz = -6; dz < 6; dz += 2) for (let dx = -6; dx < 6; dx += 2) { if (!inb(cx + dx, cz + dz)) continue; const t = terr[ix(cx + dx, cz + dz)]; if (t <= 2) w++; else if (t >= 5) h++; else if (t === 4) f++; }
  const R = mulberry32(hashStr('d' + k)), kind = w > 6 ? 'coast' : h > 8 ? 'hill' : f > 10 ? 'forest' : 'plain', B = DIST_B[kind];
  const cap = S.nations.some(n => Math.abs(n.capital.x - cx) <= 7 && Math.abs(n.capital.z - cz) <= 7);
  v = cap ? (R() < 0.5 ? 'Downtown' : 'Old Town') : `${DIST_A[Math.floor(R() * DIST_A.length)]} ${B[Math.floor(R() * B.length)]}`;
  distCache.set(k, v); return v;
}

/* ---------------- weather & seasons ---------------- */
const WX = {
  clear: { n: 'Clear', i: 'sunwx', light: 1, tour: 1, solar: 1, rain: 0 },
  cloudy: { n: 'Cloudy', i: 'cloud', light: 0.78, tour: 0.97, solar: 0.72, rain: 0 },
  rain: { n: 'Rain', i: 'rain', light: 0.58, tour: 0.88, solar: 0.45, rain: 0.65 },
  storm: { n: 'Thunderstorm', i: 'storm', light: 0.42, tour: 0.75, solar: 0.3, rain: 1, wind: 1.25 },
};
const monthOf = () => Math.floor(S.day / 30) % 12;
const isRainySeason = () => { const m = monthOf(); return m >= 10 || m <= 3; };       // tropical: Nov–Apr wet, May–Oct dry
const wxNow = () => WX[S.wx?.k] || WX.clear;
function wxDay() {
  if (!S.wx) S.wx = { k: 'clear', left: 2, temp: 30 };
  if (--S.wx.left > 0) return;
  const R = Math.random(), wet = isRainySeason();
  const k = wet ? (R < 0.22 ? 'clear' : R < 0.5 ? 'cloudy' : R < 0.88 ? 'rain' : 'storm') : (R < 0.58 ? 'clear' : R < 0.86 ? 'cloudy' : R < 0.97 ? 'rain' : 'storm');
  S.wx = { k, left: 1 + Math.floor(Math.random() * (k === 'storm' ? 2 : 4)), temp: Math.round((wet ? 25 : 28) + Math.random() * 6 - (k === 'rain' || k === 'storm' ? 2 : 0)) };
  if (k === 'storm' && S.started) toast('Thunderstorm warning', 'Solar output drops, tourism slows, coastal flooding is more likely', 'wa', 'storm');
}
// season-aware disaster weights (used by disasterRoll)
function seasonW(id) { const wet = isRainySeason(), k = S.wx?.k; if (id === 'flood' || id === 'storm') return (wet ? 2 : 0.5) * (k === 'storm' ? 2 : k === 'rain' ? 1.4 : 1); if (id === 'fire') return wet ? 0.6 : 1.8; return 1; }

/* weather visuals: rain streaks, overcast light, lightning */
const RAIN_N = 1600, rainPos = new Float32Array(RAIN_N * 6), rainSeed = new Float32Array(RAIN_N * 3);
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
const rainMat = new THREE.LineBasicMaterial({ color: '#cfe0f2', transparent: true, opacity: 0, depthWrite: false, fog: false });
const rainLines = new THREE.LineSegments(rainGeo, rainMat); rainLines.frustumCulled = false; rainLines.renderOrder = 8; rainLines.visible = false; scene.add(rainLines);
for (let i = 0; i < RAIN_N; i++) { rainSeed[i * 3] = Math.random(); rainSeed[i * 3 + 1] = Math.random(); rainSeed[i * 3 + 2] = Math.random(); }
const wxv = { light: 1, rain: 0, flash: 0, thunder: 0 }, _grey = new THREE.Color('#8c96a3');
function thunder() {
  if (!S.sfx) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const len = AC.sampleRate * 1.6, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0.16;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(AC.destination); src.start();
  } catch (e) { }
}
function updateWeatherFx(dt) {
  const T = S.started ? wxNow() : WX.clear;
  wxv.light += (T.light - wxv.light) * Math.min(1, dt * 0.7); wxv.rain += (T.rain - wxv.rain) * Math.min(1, dt * 0.6);
  const L = wxv.light;
  sun.intensity *= L; hemi.intensity *= 0.55 + 0.45 * L;
  skyU.top.value.lerp(_grey, (1 - L) * 0.9); skyU.hor.value.lerp(_grey, (1 - L) * 0.7); scene.fog.color.copy(skyU.hor.value);
  if (S.started && S.wx?.k === 'storm' && !S.paused && Math.random() < dt * 0.22) { wxv.flash = 0.12; wxv.thunder = 0.4 + Math.random() * 1.4; }
  if (wxv.flash > 0) { wxv.flash -= dt; hemi.intensity *= 3.2; sun.intensity *= 1.8; }
  if (wxv.thunder > 0) { wxv.thunder -= dt; if (wxv.thunder <= 0) thunder(); }
  rainLines.visible = wxv.rain > 0.02; if (!rainLines.visible) return;
  rainMat.opacity = 0.55 * wxv.rain;
  const half = clamp(cam.dist * 0.65, 10, 70), top = cam.dist * 0.75 + 8, len = 0.5 + cam.dist * 0.012, fall = (S.paused ? 0.3 : 1) * dt;
  const shown = Math.floor(RAIN_N * Math.min(1, 0.35 + wxv.rain * 0.65)), wind = S.wx?.k === 'storm' ? 0.35 : 0.12;
  for (let i = 0; i < RAIN_N; i++) {
    const o = i * 6; if (i >= shown) { rainPos[o + 1] = rainPos[o + 4] = -999; continue; }
    rainSeed[i * 3 + 1] -= fall * (0.9 + rainSeed[i * 3 + 2] * 0.4) * 1.6; if (rainSeed[i * 3 + 1] < 0) { rainSeed[i * 3 + 1] += 1; rainSeed[i * 3] = Math.random(); rainSeed[i * 3 + 2] = Math.random(); }
    const x = cam.tx + (rainSeed[i * 3] - 0.5) * 2 * half, z = cam.tz + (rainSeed[i * 3 + 2] - 0.5) * 2 * half, y = rainSeed[i * 3 + 1] * top;
    rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z; rainPos[o + 3] = x - wind * len; rainPos[o + 4] = y - len; rainPos[o + 5] = z;
  }
  rainGeo.attributes.position.needsUpdate = true;
}
const wxChip = () => S.wx ? `<button class="gc" data-g="wx" title="${isRainySeason() ? 'Rainy season (Nov–Apr)' : 'Dry season (May–Oct)'}">${ico(wxNow().i)}${wxNow().n === 'Thunderstorm' ? 'Storm' : wxNow().n} · ${S.wx.temp}°C</button>` : '';
function weatherModal() {
  const wet = isRainySeason(), T = wxNow();
  modal({
    title: 'Weather & Seasons', sub: `${T.n} · ${S.wx.temp}°C · ${wet ? 'Rainy season (November–April)' : 'Dry season (May–October)'}`, icon: T.i,
    html: `<div class="lst" style="font-size:12.5px"><div class="kv"><span>Solar farm output</span><span>${Math.round(T.solar * 100)}%</span></div><div class="kv"><span>Wind turbine output</span><span>${Math.round((T.wind || 1) * 100)}%</span></div><div class="kv"><span>Tourism</span><span>${Math.round(T.tour * 100)}%</span></div></div>
      <p class="ms" style="margin-top:10px">The rainy season brings more storms and coastal floods; the dry season brings more fires. Mix solar with wind or coal so cloudy weeks do not cause blackouts.</p>`,
    buttons: [{ l: 'Got it', pri: 1 }]
  });
}

/* ---------------- fireworks ---------------- */
const FW_N = 900, fwPos = new Float32Array(FW_N * 3), fwCol = new Float32Array(FW_N * 3), fwVel = new Float32Array(FW_N * 3), fwLife = new Float32Array(FW_N);
const fwGeo = new THREE.BufferGeometry(); fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3).setUsage(THREE.DynamicDrawUsage)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3).setUsage(THREE.DynamicDrawUsage));
const fwPts = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
fwPts.frustumCulled = false; fwPts.renderOrder = 9; scene.add(fwPts); let fwHead = 0; const fwShows = [];
const FW_COLS = ['#ff5c7a', '#ffd166', '#5ad1ff', '#9b8cff', '#7dffb2', '#ffffff', '#ff9f43'].map(c => new THREE.Color(c));
function fwBurst(x, y, z) {
  const c = FW_COLS[Math.floor(Math.random() * FW_COLS.length)], c2 = FW_COLS[Math.floor(Math.random() * FW_COLS.length)];
  for (let k = 0; k < 70; k++) {
    const i = fwHead; fwHead = (fwHead + 1) % FW_N; const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 2.4 + Math.random() * 1.2;
    fwPos[i * 3] = x; fwPos[i * 3 + 1] = y; fwPos[i * 3 + 2] = z; fwVel[i * 3] = r * Math.cos(a) * sp; fwVel[i * 3 + 1] = u * sp; fwVel[i * 3 + 2] = r * Math.sin(a) * sp; fwLife[i] = 1.6 + Math.random() * 0.6;
    const cc = k % 3 ? c : c2; fwCol[i * 3] = cc.r; fwCol[i * 3 + 1] = cc.g; fwCol[i * 3 + 2] = cc.b;
  }
}
function fireworks(n, secs = 12) { fwShows.push({ x: n.capital.x - HALF + 0.5, z: n.capital.z - HALF + 0.5, t: secs, acc: 0 }); }
function updateFireworks(dt) {
  for (let s = fwShows.length - 1; s >= 0; s--) { const f = fwShows[s]; f.t -= dt; f.acc += dt; if (f.acc > 0.45) { f.acc = 0; fwBurst(f.x + (Math.random() - 0.5) * 8, 7 + Math.random() * 4, f.z + (Math.random() - 0.5) * 8); } if (f.t <= 0) fwShows.splice(s, 1); }
  let alive = false;
  for (let i = 0; i < FW_N; i++) {
    if (fwLife[i] <= 0) continue; alive = true; fwLife[i] -= dt; const k = Math.max(0, fwLife[i] / 2);
    fwVel[i * 3 + 1] -= 2.2 * dt; for (let j = 0; j < 3; j++) { fwVel[i * 3 + j] *= 1 - dt * 0.9; fwPos[i * 3 + j] += fwVel[i * 3 + j] * dt; }
    if (fwLife[i] <= 0) fwPos[i * 3 + 1] = -999; else { fwCol[i * 3] *= 0.995 + k * 0.004; fwCol[i * 3 + 1] *= 0.995 + k * 0.004; fwCol[i * 3 + 2] *= 0.995 + k * 0.004; }
  }
  fwPts.visible = alive || fwShows.length > 0;
  if (fwPts.visible) { fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true; }
}

/* ---------------- living city: buses, pedestrians, planes, ships ---------------- */
function moverMesh(build, cap, colors) {
  const g = new GB(); build(g); const body = g.build(), lit = g.L ? g.L.build() : null;
  const m = new THREE.InstancedMesh(body, matBody, cap); m.count = 0; m.castShadow = true; m.frustumCulled = false; fxG.add(m);
  const l = lit ? new THREE.InstancedMesh(lit, matLit, cap) : null; if (l) { l.count = 0; l.frustumCulled = false; fxG.add(l); }
  if (colors) { const c = new THREE.Color(); for (let i = 0; i < cap; i++) m.setColorAt(i, c.set(colors[i % colors.length])); }
  return { m, l, cap, list: [] };
}
const BUS_CAP = 60, PED_CAP = 500;
let busM = null, pedM = null;
function initLiving() {
  busM = moverMesh(g => { g.box(0.15, 0.12, 0.5, 0, 0.02, 0, '#ffffff'); g.box(0.155, 0.012, 0.505, 0, 0.14, 0, '#eef1f4'); g.lit().box(0.158, 0.035, 0.42, 0, 0.085, 0, '#d4e8ff'); g.lit().box(0.11, 0.02, 0.01, 0, 0.05, 0.252, '#fff6d8'); }, BUS_CAP, ['#e5a33d', '#2e6fd8', '#e5a33d', '#16a085']);
  pedM = moverMesh(g => { g.cyl(0.016, 0.02, 0.055, 6, 0, 0.0, 0, '#ffffff'); g.sph(0.016, 0, 0.072, 0, '#e2b48f', { ws: 6, hs: 4 }); }, PED_CAP, ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1', '#34495e', '#e67e22', '#1abc9c', '#ff7aa2']);
}
function spawnOn(arr, sp) { const k = spawnCar(arr); if (!k) return null; k.sp = sp * (0.8 + Math.random() * 0.4); k.side = Math.random() < 0.5 ? -1 : 1; return k; }
function stepMover(M, dt, speed, off, y, ped) {
  const L = M.list;
  for (let j = 0; j < L.length; j++) {
    const k = L[j]; k.t += dt * k.sp * speed;
    while (k.t >= 1) { k.t -= 1; k.p = k.c; k.c = k.n; k.n = pickNext(k.p, k.c); if (!road[k.c] || !road[k.n]) { k.t = 0; break; } }
    const cx = cxw(k.c), cz = czw(k.c), ax = (cxw(k.p) + cx) / 2, az = (czw(k.p) + cz) / 2, bx = (cxw(k.n) + cx) / 2, bz = (czw(k.n) + cz) / 2, t = k.t, u = 1 - t;
    const px = u * u * ax + 2 * u * t * cx + t * t * bx, pz = u * u * az + 2 * u * t * cz + t * t * bz;
    let tx = 2 * u * (cx - ax) + 2 * t * (bx - cx), tz = 2 * u * (cz - az) + 2 * t * (bz - cz); const l = Math.hypot(tx, tz);
    if (l > 1e-4) { tx /= l; tz /= l; k.yaw = Math.atan2(tx, tz); } else { tx = Math.sin(k.yaw); tz = Math.cos(k.yaw); }
    const o = ped ? off * k.side : off;
    _p.set(px + tz * o, y + (ped ? Math.abs(Math.sin((k.t + j) * 18)) * 0.008 : 0), pz - tx * o); _q.setFromAxisAngle(_up, k.yaw); _s.set(1, 1, 1); _m.compose(_p, _q, _s);
    M.m.setMatrixAt(j, _m); if (M.l) M.l.setMatrixAt(j, _m);
  }
  M.m.count = L.length; M.m.instanceMatrix.needsUpdate = true; if (M.l) { M.l.count = L.length; M.l.instanceMatrix.needsUpdate = true; }
}
function roadsNear(x, z, r, nid) { const L = []; for (const i of S.roadSet) { if (nid != null && owner[i] !== nid) continue; if (Math.abs(i % MAP - x) <= r && Math.abs(((i / MAP) | 0) - z) <= r) L.push(i); } return L; }
let livT = 0;
function retargetLiving() {
  // buses: 4 per terminal, 3 per metro, +6 with the public-transport policy
  const want = [];
  for (const n of playerNations()) {
    for (const b of n.list) if (b.prog >= 1 && !b.dmg && b.conn && (b.type === 'busterminal' || b.type === 'metro')) want.push({ n, x: b.x, z: b.z, k: b.type === 'busterminal' ? 4 : 3 });
    if (n.pol.transit) want.push({ n, x: n.capital.x, z: n.capital.z, k: 6 });
  }
  const target = Math.min(BUS_CAP, want.reduce((a, w) => a + w.k, 0));
  busM.list = busM.list.filter(k => road[k.c] && road[k.p] && road[k.n]); if (busM.list.length > target) busM.list.length = target;
  for (const w of want) { if (busM.list.length >= target) break; const arr = roadsNear(w.x, w.z, 10, w.n.id); if (arr.length) for (let k = 0; k < w.k && busM.list.length < target; k++) { const v = spawnOn(arr, 0.75); if (v) busM.list.push(v); } }
  // pedestrians: only near the camera when zoomed in, fewer at night
  const tx = Math.floor(cam.tx + HALF), tz = Math.floor(cam.tz + HALF), near = cam.dist < 60 ? roadsNear(tx, tz, 16) : [];
  const day = S.dayF ?? 1, pt = Math.min(PED_CAP, Math.floor(near.length * 1.4 * (0.25 + 0.75 * day)));
  pedM.list = pedM.list.filter(k => road[k.c] && road[k.p] && road[k.n] && Math.abs(k.c % MAP - tx) <= 20 && Math.abs(((k.c / MAP) | 0) - tz) <= 20);
  if (pedM.list.length > pt) pedM.list.length = pt;
  while (near.length && pedM.list.length < pt) { const v = spawnOn(near, 0.32); if (!v) break; pedM.list.push(v); }
}
// rush hour & holidays: target car density multiplier
function trafficFactor() {
  const ph = S.cycle, g = (c) => Math.exp(-Math.pow((ph - c) / 0.045, 2));
  let f = (ph < 0.2 || ph > 0.86) ? 0.35 : 0.72 + 0.55 * (g(0.32) + g(0.7));
  if (S.eidUntil && S.day < S.eidUntil) f *= 1.7;
  if (S.wx && (S.wx.k === 'rain' || S.wx.k === 'storm')) f *= 0.85;
  const n = act(); if (n) f *= 0.85 + Math.min(0.6, (n.cong || 0) * 0.5);
  return f;
}
/* planes */
const planes = [];
function planeGeo() { const g = new GB(); plane(g, 0, 0, 0); return g.build(); }
let _planeG = null;
function syncPlanes() {
  const airports = []; for (const n of S.nations) for (const b of n.list) if (b.type === 'airport' && b.prog >= 1) airports.push(b);
  for (let i = planes.length - 1; i >= 0; i--) if (!airports.includes(planes[i].b)) { fxG.remove(planes[i].mesh); planes.splice(i, 1); }
  for (const b of airports.slice(0, 4)) {
    if (planes.some(p => p.b === b)) continue; _planeG = _planeG || planeGeo();
    const [sx, sz] = rotLocal(b, -2.3, 0), [ex, ez] = rotLocal(b, 2.3, 0), dx = ex - sx, dz = ez - sz, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, px = -uz, pz = ux;
    const V = (x, y, z) => new THREE.Vector3(x, y, z), P = [
      V(sx, 0.02, sz), V(ex, 0.25, ez), V(ex + ux * 14, 5, ez + uz * 14), V(ex + ux * 32 + px * 14, 12, ez + uz * 32 + pz * 14),
      V((sx + ex) / 2 + px * 34, 15, (sz + ez) / 2 + pz * 34), V(sx - ux * 32 + px * 14, 11, sz - uz * 32 + pz * 14), V(sx - ux * 14, 4, sz - uz * 14), V(sx - ux * 3, 0.35, sz - uz * 3)];
    const mesh = new THREE.Mesh(_planeG, matBody); mesh.castShadow = true; mesh.scale.setScalar(1.3); mesh.rotation.order = 'YZX'; fxG.add(mesh);
    planes.push({ b, mesh, curve: new THREE.CatmullRomCurve3(P, true, 'centripetal'), u: Math.random() });
  }
}
const _tan = new THREE.Vector3();
function updatePlanes(dt) {
  for (const p of planes) {
    const len = p.curve.getLength(); p.u = (p.u + dt * (S.paused ? 0.4 : 1) * 6.5 / len) % 1;
    const pos = p.curve.getPointAt(p.u); p.curve.getTangentAt(p.u, _tan);
    p.mesh.position.set(pos.x, Math.max(0.0, pos.y - 0.18), pos.z);
    p.mesh.rotation.set(0, Math.atan2(-_tan.z, _tan.x), Math.atan2(_tan.y, Math.hypot(_tan.x, _tan.z)));
  }
}
/* ships */
const ships = [];
let _shipG = null;
function shipGeo() {
  const g = new GB();
  g.box(1.5, 0.16, 0.36, 0, 0, 0, '#2c3e50'); g.box(1.5, 0.05, 0.37, 0, 0.13, 0, '#c0392b'); g.box(0.25, 0.14, 0.3, 0.62, 0.0, 0, '#2c3e50');
  for (let k = 0; k < 4; k++) g.box(0.24, 0.14, 0.3, -0.45 + k * 0.26, 0.18, 0, ['#e67e22', '#2e86de', '#27ae60', '#e5a33d'][k]);
  g.box(0.24, 0.3, 0.3, 0.55, 0.18, 0, '#ecf0f1'); g.lit().box(0.245, 0.05, 0.31, 0.55, 0.38, 0, '#d4e8ff');
  return g.build();
}
function syncShips() {
  const ports = []; for (const n of S.nations) for (const b of n.list) if (b.type === 'port' && b.prog >= 1) ports.push(b);
  for (let i = ships.length - 1; i >= 0; i--) if (!ports.includes(ships[i].b)) { fxG.remove(ships[i].mesh); ships.splice(i, 1); }
  for (const b of ports.slice(0, 6)) {
    if (ships.some(s => s.b === b)) continue;
    let st = null, bd = 1e9; for (let dz = -4; dz <= b.s + 3; dz++) for (let dx = -4; dx <= b.s + 3; dx++) { const x = b.x + dx, z = b.z + dz; if (!inb(x, z) || terr[ix(x, z)] > 1) continue; const d = Math.hypot(dx - b.s / 2, dz - b.s / 2); if (d < bd) { bd = d; st = { x, z }; } }
    if (!st) continue;
    let best = null, bl = 0;
    for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2, ux = Math.cos(ang), uz = Math.sin(ang); let l = 0; for (let s = 1; s < 80; s++) { const x = Math.round(st.x + ux * s), z = Math.round(st.z + uz * s); if (!inb(x, z) || terr[ix(x, z)] > 1) break; l = s; } if (l > bl) { bl = l; best = { ux, uz }; } }
    if (!best || bl < 10) continue;
    _shipG = _shipG || shipGeo(); const mesh = new THREE.Mesh(_shipG, matBody); mesh.castShadow = true; fxG.add(mesh);
    ships.push({ b, mesh, sx: st.x - HALF + 0.5, sz: st.z - HALF + 0.5, ex: st.x - HALF + 0.5 + best.ux * (bl - 3), ez: st.z - HALF + 0.5 + best.uz * (bl - 3), u: Math.random(), dir: 1, wait: 0 });
  }
}
function updateShips(dt) {
  for (const s of ships) {
    if (s.wait > 0) { s.wait -= dt; } else {
      const len = Math.hypot(s.ex - s.sx, s.ez - s.sz) || 1; s.u += s.dir * dt * (S.paused ? 0.3 : 1) * 1.1 / len;
      if (s.u >= 1) { s.u = 1; s.dir = -1; s.wait = 2; } else if (s.u <= 0) { s.u = 0; s.dir = 1; s.wait = 5; }
    }
    const e = s.u * s.u * (3 - 2 * s.u), x = s.sx + (s.ex - s.sx) * e, z = s.sz + (s.ez - s.sz) * e, yaw = Math.atan2(-(s.ez - s.sz) * s.dir, (s.ex - s.sx) * s.dir);
    s.mesh.position.set(x, -0.2 + Math.sin(W.uTime.value * 1.3 + s.sx) * 0.015, z); s.mesh.rotation.set(Math.sin(W.uTime.value * 0.9 + s.sz) * 0.02, yaw, 0);
  }
}

/* ---------------- citizen voices ---------------- */
const FIRST = ['Sari', 'Budi', 'Maya', 'Arif', 'Dewi', 'Rina', 'Agus', 'Lina', 'Grace', 'Hana', 'Kevin', 'Nadia', 'Rizky', 'Putri', 'Daniel', 'Ayu', 'Fajar', 'Wulan', 'Leo', 'Mira', 'Joko', 'Siti', 'Andre', 'Clara', 'Omar', 'Tia', 'Raka', 'Elena'];
const pickR = a => a[Math.floor(Math.random() * a.length)];
function voicePool(n) {
  const homes = n.list.filter(b => BT[b.type].c === 'res' && b.prog >= 1 && b.occ > 5), P = [];
  const at = (b, mood, text, w = 1) => P.push({ b, mood, text, w });
  const hb = f => { const L = homes.filter(f); return L.length ? pickR(L) : null; };
  let b;
  if (n.pr < 0.999 && (b = hb(() => true))) at(b, -1, d => `Blackout again in ${d}. Third time this week. Fix the power grid!`, 3);
  if (n.wr < 0.999 && (b = hb(() => true))) at(b, -1, d => `No water from the taps in ${d} since this morning. How do we cook?`, 3);
  if ((b = n.list.find(x => x.prog >= 1 && BT[x.type].road !== false && !x.conn))) at(b, -1, (d, b) => `They built a ${BT[b.type].n.toLowerCase()} in ${d} with no road to it. Who planned this?`, 2);
  if ((b = hb(x => x.cov.edu < 0.2))) at(b, -1, d => `The nearest school from ${d} is miles away. My kids spend two hours a day on the road.`, 1.5);
  if ((b = hb(x => x.cov.health < 0.2))) at(b, -1, d => `No clinic anywhere near ${d}. Waited three hours to see a doctor.`, 1.5);
  if ((b = hb(x => x.cov.safety < 0.2))) at(b, -1, d => `Another break-in on my street in ${d}. We need a police station here.`, 1.3);
  if ((b = hb(x => x.poll > 0.12))) at(b, -1, d => `Smog over ${d} again. My asthma is acting up — do something about those factories.`, 1.6);
  if ((n.cong || 0) > 0.85 && (b = hb(() => true))) at(b, -1, d => `${Math.round(25 + n.cong * 30)} minutes to drive 3 km from ${d}. Traffic is unbearable. We need buses or a metro.`, 2);
  if (n.unemp > 0.08 && (b = hb(() => true))) at(b, -1, d => `Sent 40 job applications, zero calls back. There is no work in ${d}.`, 2);
  if (n.tax >= 15 && (b = hb(() => true))) at(b, -1, d => `Taxes went up again? My salary barely covers rent in ${d}.`, 1.5);
  if ((n.dem || 0) >= 20 && (b = hb(() => true))) at(b, -1, d => `Nothing ever changes in ${d}. When will the President actually build something?`, 1.5);
  if ((n.infl || 0) > 0.06 && (b = hb(() => true))) at(b, -1, d => `Rice prices are up again. Everything in ${d} costs more than last year.`, 1.4);
  if ((b = [...S.dmgSet].find(x => x.nid === n.id))) at(b, -1, (d, b) => `Still waiting for repairs on the ${BT[b.type].n.toLowerCase()} in ${d}. Weeks now.`, 1.6);
  if ((n.mods || []).some(m => m.id.startsWith('tarif') || m.id.startsWith('sanksi')) && (b = hb(() => true))) at(b, -1, d => 'Imported goods got so expensive since the sanctions and tariffs. Make peace already.', 1.4);
  if (S.wx && (S.wx.k === 'rain' || S.wx.k === 'storm') && (b = hb(x => nearWater(x)) || hb(() => true))) at(b, -1, d => `Streets in ${d} flooded after the downpour. Bring boots!`, 1);
  if (S.wx && S.wx.temp >= 32 && (b = hb(() => true))) at(b, 0, d => `${S.wx.temp}°C in ${d} today. Too hot to walk anywhere.`, 0.8);
  if (S.eidUntil && S.day < S.eidUntil && (b = hb(() => true))) at(b, 1, d => 'Heading home for Eid! Twelve hours on the road but worth it to see my family.', 2);
  if (n.approval < 40 && (b = hb(() => true))) at(b, -1, d => 'I voted for this President. Regretting it now.', 1.2);
  if ((b = hb(x => x.happy > 0.8))) at(b, 1, d => pickR([`Love the park near my place in ${d}. Perfect for the kids.`, `Moved to ${d} last month — best decision ever.`, `Safe streets, good schools. ${d} is a great place to live.`]), 1.6);
  if ((b = n.list.find(x => BT[x.type].c === 'lm' && x.prog >= 1))) at(b, 1, (d, b) => `Took my parents to the ${BT[b.type].n}. So proud of our country!`, 0.9);
  if ((b = n.list.find(x => (x.type === 'busterminal' || x.type === 'metro') && x.prog >= 1))) at(b, 1, (d, b) => `The new ${BT[b.type].n.toLowerCase()} cut my commute in half.`, 0.9);
  if (n.approval >= 70 && (b = hb(() => true))) at(b, 1, d => 'Say what you want, the President is doing a good job.', 1);
  if (n.unemp < 0.03 && n.pop > 3000 && (b = hb(() => true))) at(b, 1, d => `Got a new job in ${d}! Companies are hiring everywhere.`, 1);
  return P;
}
function voiceTick() {
  const n = act(); if (!n || n.ai) return;
  const P = voicePool(n); if (!P.length) return;
  let r = Math.random() * P.reduce((a, p) => a + p.w, 0), v = P[0]; for (const p of P) { r -= p.w; if (r <= 0) { v = p; break; } }
  const b = v.b, dist = districtAt(b.x, b.z), who = pickR(FIRST);
  S.feed.unshift({ d: S.day, who, h: `@${who.toLowerCase()}_${(b.id * 7) % 97}`, dist, text: v.text(dist, b), mood: v.mood, x: b.x, z: b.z, bid: b.id, nid: n.id });
  if (S.feed.length > 40) S.feed.length = 40; feedKey = '';
}
const moodOf = n => { const L = S.feed.filter(f => f.nid === n.id).slice(0, 15); if (!L.length) return null; return Math.round(L.reduce((a, f) => a + (f.mood > 0 ? 1 : f.mood < 0 ? 0 : 0.5), 0) / L.length * 100); };
const AVC = ['#3ee0c8', '#8d9bff', '#fbbf24', '#f472b6', '#60a5fa', '#a3e635', '#fb923c'];
function feedItem(f) { return `<button class="fp ${f.mood < 0 ? 'neg' : f.mood > 0 ? 'pos' : ''}" data-f="${f.bid}" data-x="${f.x}" data-z="${f.z}"><span class="fa" style="background:${AVC[f.who.length % AVC.length]}">${esc(f.who[0])}</span><span class="ft2"><b>${esc(f.who)}</b> <i>${esc(f.h)} · ${esc(f.dist)} · ${dateStr(f.d)}</i><span>${esc(f.text)}</span></span></button>`; }
function bindFeed(root) {
  root.querySelectorAll('[data-f]').forEach(el => el.onclick = () => { sfx('click'); closeModal(); const b = S.blds.get(+el.dataset.f); flyTo(+el.dataset.x, +el.dataset.z, 26); if (b) select({ b }); });
}
let feedKey = '';
function renderFeed() {
  let el = $('#feed'); if (!el) { el = document.createElement('div'); el.id = 'feed'; el.className = 'glass'; $('#hud').appendChild(el); }
  const n = act(), L = S.feed.filter(f => f.nid === n.id), hide = !L.length || !!S.drawer;
  el.classList.toggle('hidden', hide); if (hide) return;
  const open = S.feedOpen !== false, md = moodOf(n), key = L[0].d + '|' + L.length + '|' + open + '|' + md;
  if (key === feedKey) return; feedKey = key;
  el.innerHTML = `<div class="fh">${ico('chat')}<b>Citizens</b>${md != null ? `<span class="badge" style="${md < 40 ? 'background:rgba(251,113,133,.15);color:#ffb3c0' : ''}">mood ${md}%</span>` : ''}<button class="trc ${open ? '' : 'cl'}">${ico('chev')}</button></div>${L.slice(0, open ? 3 : 1).map(feedItem).join('')}`;
  el.querySelector('.fh').onclick = () => { S.feedOpen = !open; feedKey = ''; renderFeed(); sfx('click'); };
  bindFeed(el);
}
function feedHTML(n) { const L = S.feed.filter(f => f.nid === n.id); return L.length ? `<div class="fl">${L.map(feedItem).join('')}</div>` : '<div class="ms">No posts yet. Citizens talk about what they see — problems and wins alike.</div>'; }

/* ---------------- calendar moments ---------------- */
const eidDay = y => ((120 - 11 * y) % 360 + 360) % 360;      // the holiday moves ~11 days earlier every year, like the real lunar calendar
function calendarDay() {
  const doy = S.day % 360, y = Math.floor(S.day / 360), pn = playerNations();
  if (doy === 359) { for (const n of pn) fireworks(n, 14); toast('Happy New Year!', 'Fireworks light up the sky over your capitals', 'gold', 'sparkle'); addNews('Citizens celebrate the New Year with fireworks.'); }
  if (doy === 7 * 30 + 16) {
    for (const n of pn) { fireworks(n, 12); if (n.happy >= 0.6) n.apprMod += 2; else n.apprMod -= 2; }
    const h = act(); toast('Independence Day!', h.happy >= 0.6 ? 'Parades and fireworks — national pride boosts approval' : 'Celebrations are muted; many citizens are unhappy', h.happy >= 0.6 ? 'gold' : 'wa', 'flag');
    addNews(`Independence Day celebrated across ${h.name}.`);
  }
  if (doy === eidDay(y)) {
    S.eidUntil = S.day + 7; for (const n of pn) addMod(n, 'eid', 'Eid holiday shopping', { com: 1.12 }, 1);
    toast('Eid al-Fitr holiday', 'Millions travel home — roads are packed, shops are busy (business +12% this month)', 'gold', 'cal'); addNews('Eid homecoming: highways jammed as millions travel home.');
  }
}

/* ---------------- real economy: inflation, GDP growth, ministry budgets ---------------- */
const BUD = { edu: { n: 'Education', d: 'Schools & universities: coverage strength and upkeep' }, health: { n: 'Health', d: 'Clinics & hospitals: coverage strength and upkeep' }, safety: { n: 'Public safety', d: 'Police & fire stations: coverage strength and upkeep' }, infra: { n: 'Infrastructure', d: 'Road upkeep and road capacity (traffic)' } };
const budOf = (n, k) => n.ai || !n.bud ? 1 : (n.bud[k] ?? 1);
const svcBud = svc => svc === 'fire' || svc === 'safety' ? 'safety' : svc;            // svc → ministry
const budCov = (n, svc) => 0.55 + 0.45 * budOf(n, svcBud(svc));                         // 50% funding = 78% strength, 150% = 123%
const budUpk = (n, d) => d.svc ? budOf(n, svcBud(d.svc)) : 1;
const priceNow = (n = act()) => n && !n.ai ? (n.P || 1) : 1;
function econMonth(n) {
  const inc = sumObj(n.last?.inc), exp = sumObj(n.last?.exp), loan = n.loans.reduce((a, L) => a + L.pay, 0);
  const deficit = inc > 0 ? Math.max(0, exp - inc) / inc : 0, burden = inc > 0 ? loan / inc : 0;
  const target = clamp(0.025 + deficit * 0.08 + burden * 0.05 + (n.unemp < 0.03 ? 0.01 : 0) - n.unemp * 0.15, -0.01, 0.15);
  n.infl = (n.infl ?? 0.03) + (target - (n.infl ?? 0.03)) * 0.25; n.P = (n.P || 1) * (1 + n.infl / 12);
}
function gdpGrowth(n) {
  const h = n.hist; if (!h || h.length < 15) return null;
  const avg = a => a.reduce((s, x) => s + (x.i || 0), 0) / a.length, now = avg(h.slice(-3)), then = avg(h.slice(-15, -12));
  return then > 0 ? now / then - 1 - (n.infl || 0) : null;                                 // real growth ≈ nominal − inflation
}
const pct = (v, d = 1) => v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
function quarterReport(m) {
  if (m % 3 !== 0) return; const n = act(); if (!n || n.ai) return;
  const g = gdpGrowth(n); if (g == null) return;
  addNews(`Q${(Math.floor(m / 3) % 4) + 1} report: GDP ${pct(g)} year on year, inflation ${pct(n.infl)}.`);
  toast(`Quarterly report · ${n.name}`, `GDP ${pct(g)} · inflation ${pct(n.infl)} · unemployment ${Math.round(n.unemp * 100)}%`, g >= 0 ? 'info' : 'wa', 'chart');
}

/* ---------------- drivers ---------------- */
function realDay() {
  wxDay(); calendarDay();
  if (S.day % 4 === 0 && Math.random() < 0.6) voiceTick();
}
function realMonth(m) { for (const n of playerNations()) econMonth(n); quarterReport(m); }
function realTick(dt) {
  updateWeatherFx(dt); updateFireworks(dt);
  if (!S.started) return;
  if (!busM) initLiving();
  const now = performance.now();                                    // wall clock: slow frames must not delay these refreshes
  if (now - livT > 2000) { livT = now; retargetLiving(); syncPlanes(); syncShips(); carsDirty = true; renderFeed(); }
  const sp = S.paused ? 0 : Math.min(S.speed, 2.5);
  stepMover(busM, dt, sp, 0.17, 0.03, false); stepMover(pedM, dt, sp || 0.25, 0.42, 0.035, true);
  updatePlanes(dt); updateShips(dt);
}

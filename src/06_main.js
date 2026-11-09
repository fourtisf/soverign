
/* =====================================================================
   CAMERA · SKY · LOOP · SAVE · TITLE
   ===================================================================== */
const cam = { tx: 0, tz: 0, dist: 165, yaw: 0.7, pitch: 0.72, gtx: 0, gtz: 0, gdist: 165, gyaw: 0.7, gpitch: 0.72 };
function applyCam() {
  const cp = Math.cos(cam.pitch); camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.tx, 0, cam.tz); camera.updateMatrixWorld();
}
function clampCam() { cam.gtx = clamp(cam.gtx, -HALF, HALF); cam.gtz = clamp(cam.gtz, -HALF, HALF); cam.gpitch = clamp(cam.gpitch, 0.32, 1.45); cam.gdist = clamp(cam.gdist, 7, 175); }
function flyTo(x, z, dist) { cam.gtx = x - HALF + 0.5; cam.gtz = z - HALF + 0.5; if (dist) cam.gdist = dist; clampCam(); }
function updateCam(dt) {
  const k = 1 - Math.exp(-dt * 7.5);
  cam.tx += (cam.gtx - cam.tx) * k; cam.tz += (cam.gtz - cam.tz) * k; cam.dist += (cam.gdist - cam.dist) * k; cam.yaw += (cam.gyaw - cam.yaw) * k; cam.pitch += (cam.gpitch - cam.pitch) * k;
  applyCam(); $('#compass svg').style.transform = `rotate(${cam.yaw}rad)`;
}
const SKYK = {
  night: { top: '#0a1838', hor: '#22365f', bot: '#0c1c34', sun: '#a9c0ff', si: 0.75, hs: '#7f9bd6', hg: '#26324a', hi: 0.62 },
  dusk: { top: '#2b3b78', hor: '#f29a6a', bot: '#2a3550', sun: '#ffb27c', si: 1.5, hs: '#ffd2ac', hg: '#4b4a52', hi: 0.6 },
  day: { top: '#3f86d6', hor: '#cfe6f5', bot: '#1d4b66', sun: '#fff4e2', si: 2.7, hs: '#d6ebff', hg: '#6b7a55', hi: 0.95 },
};
for (const k in SKYK) for (const p of ['top', 'hor', 'bot', 'sun', 'hs', 'hg']) SKYK[k][p] = new THREE.Color(SKYK[k][p]);
const _c1 = new THREE.Color(), sunDir = new THREE.Vector3();
function mixK(p, day, dusk, out) { return out.copy(SKYK.night[p]).lerp(SKYK.day[p], day).lerp(SKYK.dusk[p], dusk); }
function updateSky(dt) {
  if (S.dayNight && !S.paused) S.cycle = (S.cycle + dt / 360 * (S.started ? Math.min(S.speed, 2) : 1)) % 1;
  const ph = S.dayNight ? S.cycle : 0.4, a = (ph - 0.25) * Math.PI * 2, el = Math.sin(a);
  const day = smooth(-0.12, 0.32, el), dusk = clamp(1 - Math.abs(el - 0.02) / 0.3, 0, 1) * 0.72;
  mixK('top', day, dusk, skyU.top.value); mixK('hor', day, dusk, skyU.hor.value); mixK('bot', day, dusk, skyU.bot.value);
  scene.fog.color.copy(skyU.hor.value);
  mixK('sun', day, dusk, sun.color); sun.intensity = lerp(SKYK.night.si, SKYK.day.si, day) * (1 - dusk * 0.35);
  mixK('hs', day, dusk, hemi.color); mixK('hg', day, dusk, hemi.groundColor); hemi.intensity = lerp(SKYK.night.hi, SKYK.day.hi, day);
  sunDir.set(Math.cos(a) * 0.85, Math.max(0.28, Math.abs(el)) * 1.1, 0.45).normalize();
  matLit.emissiveIntensity = clamp(1 - day * 1.3, 0, 1) * 2.3;
  pMesh.material.uniforms.uLight.value = lerp(0.35, 1, day);
  renderer.toneMappingExposure = lerp(1.05, 1.0, day);
  S.dayF = day;
}
function updateShadowCam() {
  const ext = clamp(cam.dist * 0.8, 16, 95), sc2 = sun.shadow.camera;
  sun.target.position.set(cam.tx, 0, cam.tz); sun.position.copy(sun.target.position).addScaledVector(sunDir, 140);
  if (sc2.right !== ext) { sc2.left = -ext; sc2.right = ext; sc2.top = ext; sc2.bottom = -ext; sc2.near = 1; sc2.far = 320; sc2.updateProjectionMatrix(); }
  scene.fog.near = cam.dist * 1.4 + 40; scene.fog.far = cam.dist * 4 + 300;
  sky.position.copy(camera.position);
}
/* clouds */
const _cw = new THREE.Color('#ffffff'), clouds = [], cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, transparent: true, opacity: 0, roughness: 1, depthWrite: false, fog: false });
function initClouds() {
  const R = mulberry32(42);
  for (let k = 0; k < 16; k++) {
    const g = new GB(R); const n = 4 + Math.floor(R() * 4);
    for (let j = 0; j < n; j++) { const r = 2 + R() * 2.4; g.geo(new THREE.SphereGeometry(r, 10, 7), '#ffffff', (j - n / 2) * 2.4 + R(), R() * 1.2, (R() - 0.5) * 3, 1, 0.55, 1); }
    const m = new THREE.Mesh(g.build(), cloudMat); m.position.set((R() - 0.5) * 240, 26 + R() * 10, (R() - 0.5) * 240); m.rotation.y = R() * 6; m.userData.sp = 0.6 + R() * 0.8; scene.add(m); clouds.push(m);
  }
}
function updateClouds(dt) {
  const o = smooth(70, 140, cam.dist) * 0.8; cloudMat.opacity = o; cloudMat.emissiveIntensity = 0.1 + S.dayF * 0.3; cloudMat.color.copy(skyU.hor.value).lerp(_cw, 0.55 + S.dayF * 0.45);
  for (const c of clouds) { c.visible = o > 0.02; c.position.x += dt * c.userData.sp; if (c.position.x > 140) c.position.x = -140; }
}
function updateRotors(dt) {
  const sp = S.paused ? 0.3 : 1;
  for (const b of S.winds) {
    if (!b.rotor || !b.rotor._pool) continue; b.rotA += dt * 2.2 * sp;
    const [x, z] = rotLocal(b, ROTOR_OFF[0], ROTOR_OFF[2]);
    _p.set(x, ROTOR_OFF[1], z); _q.setFromEuler(new THREE.Euler(0, b.rot * Math.PI / 2, b.rotA, 'YXZ')); _s.set(1, 1, 1);
    b.rotor._pool.set(b.rotor, _m.compose(_p, _q, _s));
  }
}
/* labels */
const nlab = new Map(), _pv = new THREE.Vector3();
function updateLabels(dt) {
  const show = S.started && (S.political || cam.dist > 62);
  for (const n of S.nations) {
    let el = nlab.get(n.id);
    if (!el) { el = document.createElement('div'); el.className = 'nl'; $('#labels').appendChild(el); nlab.set(n.id, el); el._k = ''; }
    const k = n.name + n.color + n.fstyle + Math.round(n.pop / 100); if (el._k !== k) { el._k = k; el.innerHTML = `<div class="flag">${flagSVG(n)}</div><b style="color:#fff">${esc(n.name)}</b><i>${fmtPop(n.pop)} citizens</i>`; }
    _pv.set(n.capital.x - HALF + 0.5, 4, n.capital.z - HALF + 0.5).project(camera);
    const vis = show && _pv.z < 1 && Math.abs(_pv.x) < 1.1 && Math.abs(_pv.y) < 1.1;
    el.style.opacity = vis ? 1 : 0; if (vis) { el.style.left = ((_pv.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - _pv.y) / 2 * innerHeight) + 'px'; }
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt; f.y += dt * 0.9; _pv.set(f.x, f.y, f.z).project(camera);
    f.el.style.left = ((_pv.x + 1) / 2 * innerWidth) + 'px'; f.el.style.top = ((1 - _pv.y) / 2 * innerHeight) + 'px'; f.el.style.opacity = clamp(2.4 - f.t, 0, 1);
    if (f.t > 2.6) { f.el.remove(); floats.splice(i, 1); }
  }
}

/* ---------------- save / load ---------------- */
function rle(a) { const o = []; let v = a[0], c = 1; for (let i = 1; i < a.length; i++) { if (a[i] === v) c++; else { o.push(v, c); v = a[i]; c = 1; } } o.push(v, c); return o; }
function unrle(r, len) { const a = new Int8Array(len).fill(-1); let p = 0; for (let i = 0; i < r.length; i += 2) { a.fill(r[i], p, p + r[i + 1]); p += r[i + 1]; } return a; }
const NKEYS = ['id', 'name', 'color', 'flag2', 'fstyle', 'ai', 'leader', 'treasury', 'tax', 'capital', 'approval', 'apprMod', 'tiles', 'hist', 'pol', 'loans', 'ms', 'trades', 'allied', 'rel', 'radius', 'founded', 'acc', 'last', 'rate',
  'popM', 'dem', 'debtM', 'lowM', 'coalUsed', 'mods', 'pers', 'sanc', 'imfDay', 'sec', 'stake', 'P', 'infl', 'bud'];
function saveGame(silent) {
  if (!S.started) return;
  try {
    const data = {
      v: 3, seed: S.seed, president: S.president, day: S.day, active: S.active, cycle: S.cycle, owner: rle(owner), roads: [...S.roadSet], cleared: [...S.cleared], news: S.news.slice(0, 30),
      diff: S.diff, mode: S.mode, over: S.over, won: S.won, ended: S.ended, zones: rle(zone), evq: S.evq, evRecent: S.evRecent, st: S.st,
      nations: S.nations.map(n => { const o = {}; for (const k of NKEYS) o[k] = n[k]; return o; }),
      blds: [...S.blds.values()].map(b => [b.type, b.x, b.z, b.rot, b.nid, b.level, b.v, Math.round(b.occ), +b.prog.toFixed(3), +b.happy.toFixed(3), b.dmg || 0]),
      wx: S.wx, feed: S.feed.slice(0, 30), eidUntil: S.eidUntil || 0,
      opts: { dayNight: S.dayNight, sfx: S.sfx, showGrid: S.showGrid, trackOpen: S.trackOpen, music: S.music, disasters: S.disasters }, mis: S.mis, cnt: S.cnt, unl: S.unl,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (!silent) { toast('Game saved', dateStr(S.day), 'info', 'save'); sfx('click'); }
  } catch (e) { if (!silent) toast('Save failed', 'Browser storage is unavailable', 'bad', 'alert'); }
}
function readSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function loadGame(data) {
  S.cleared = new Set(data.cleared || []);
  generateWorld(data.seed); buildGrid();
  owner = unrle(data.owner, MAP * MAP);
  S.president = data.president; S.day = data.day; S.cycle = data.cycle ?? 0.32; S.news = data.news || [];
  Object.assign(S, data.opts || {}); S.mis = data.mis || []; S.cnt = Object.assign({ road: 0, land: 0, up: 0, trade: 0, b: {} }, data.cnt || {}); S.unl = Object.assign({ diplo: false, found: false }, data.unl || {});
  S.diff = DIFF[data.diff] ? data.diff : 'normal'; S.mode = MODES[data.mode] ? data.mode : 'career';
  S.over = data.over || null; S.won = data.won || null; S.ended = data.ended || null;
  S.wx = data.wx || null; S.feed = Array.isArray(data.feed) ? data.feed : []; S.eidUntil = data.eidUntil || 0;
  S.evq = data.evq || []; S.evRecent = data.evRecent || []; S.st = Object.assign({ months: 0, apprSum: 0, peak: 0, greenM: 0, relSum: 0 }, data.st || {});
  if (data.zones) zone = Uint8Array.from(unrle(data.zones, MAP * MAP), v => v > 0 && v <= 3 ? v : 0);
  S.nations = data.nations.map(o => makeNation({ ...o, list: [], dirty: true }));
  for (const n of S.nations) if (!Array.isArray(n.mods)) n.mods = [];
  assignPersonalities();
  for (const i of data.roads) placeRoad(i);
  for (const [type, x, z, rot, nid, level, v, occ, prog, happy, dmg] of data.blds) {
    if (!BT[type] || !S.nations[nid]) continue;
    const b = placeBuilding(type, x, z, S.nations[nid], { instant: prog >= 1, rot, level, v, occ });
    b.happy = happy; if (prog < 1) { b.prog = prog; b.vis = prog; } else if (dmg > 0) { b.dmg = dmg; S.dmgSet.add(b); addDmgFx(b); }
  }
  // compute road access, coverage and population right away so the HUD is correct before the first simulated day
  for (const n of S.nations) { recalcNation(n); n.pop = n.list.reduce((a, b) => a + (BT[b.type].c === 'res' ? b.occ : 0), 0); }
  S.active = S.nations[data.active] && !S.nations[data.active].ai ? data.active : 0;
  S.upgraded = !data.v || data.v < 3 ? (data.v || 1) : 0; enterGame(false);
}

/* ---------------- game start ---------------- */
function newGame(cfg) {
  S.president = cfg.president || '';
  if (cfg.seed !== S.seed || S.cleared.size) { S.cleared = new Set(); generateWorld(cfg.seed); }
  buildGrid();
  const cap = findCapital(0, 40) || findCapital(0);
  S.diff = DIFF[cfg.diff] ? cfg.diff : 'normal'; S.mode = MODES[cfg.mode] ? cfg.mode : 'career';
  const p = makeNation({ name: cfg.name, color: cfg.color, fstyle: 0, treasury: 25e6 * dif().cash, capital: cap, approval: 66, founded: 0 });
  S.nations.push(p); claimCircle(p, cap.x, cap.z, 15);
  const aiCols = ['#fb923c', '#a855f7', '#f43f5e', '#facc15', '#ec4899', '#3b82f6'].filter(c => c !== cfg.color);
  AI_DEFS.forEach((d, k) => {
    const c = findCapital(58) || findCapital(46) || findCapital(32); if (!c) return;
    const n = makeNation({ ...d, ai: true, color: aiCols[k], treasury: 22e6 * (S.diff === 'hard' ? 1.2 : S.diff === 'easy' ? 0.85 : 1), capital: c, rel: 40 + Math.floor(Math.random() * 25), approval: 60 });
    S.nations.push(n); claimCircle(n, c.x, c.z, 12);
  });
  assignPersonalities();
  for (const n of S.nations) starterCity(n, true);
  for (const n of S.nations) { simNation(n); n.popM = n.pop; }
  S.active = 0; addNews(`${presName()} is sworn in as leader of ${p.name}.`);
  enterGame(true);
}
function enterGame(fresh) {
  S.started = true; $('#title').classList.add('hidden'); $('#hud').classList.remove('hidden');
  renderNationCard(); buildStats(); renderStats(); renderTime(); renderMenu(); renderTools(); renderMMBar(); trackKey = ''; renderTracker(); renderRCI(); renderLegend();
  S.terrDirty = true; mmDirty = true; carsDirty = true; S.zoneDirty = true; S.dmgDirty = true; renderChips();
  if (S.music) setMusic(true);
  const n = act(); flyTo(n.capital.x, n.capital.z, 34); cam.gpitch = 0.86;
  if (fresh) {
    const facilities = ['Presidential Palace', 'School', 'Clinic', 'Police Station', 'Fire Station', 'Water Tower ×2', 'Solar Farm', 'Wind Turbine ×3', 'City Park ×2', '4 Apartments', '16 Houses', '5 Shophouses', 'Farm', 'Road network'];
    setTimeout(() => modal({
      title: `Welcome to office, ${esc(presName())}!`, sub: `You now officially lead ${esc(n.name)}. The people are waiting for you to make your mark.`, icon: 'crown', wide: 1,
      html: `<div class="grid3"><div class="box"><div class="lb">Starting treasury</div><div class="vl up">${money(n.treasury)}</div></div><div class="box"><div class="lb">Territory</div><div class="vl">${n.tiles} tiles</div></div><div class="box"><div class="lb">Population</div><div class="vl">${fmtPop(n.pop)}</div></div></div>
      <span class="flbl">Facilities provided</span><div class="row" style="flex-wrap:wrap;gap:6px">${facilities.map(f => `<span class="pill ok">${f}</span>`).join('')}</div>
      <span class="flbl">How to play</span><div class="lst" style="font-size:12.5px">
      <div class="kv"><span>1 · Build roads</span><span>Every building needs road access</span></div>
      <div class="kv"><span>2 · Homes + jobs</span><span>Homes attract citizens; shophouses & industry create jobs. Use <b>Zoning (Z)</b> so private developers build too</span></div>
      <div class="kv"><span>3 · Power, water & services</span><span>Keep up supply and school/hospital/police coverage</span></div>
      <div class="kv"><span>4 · Reach milestones</span><span>Earn grants and unlock new buildings (mall, airport, tower…)</span></div>
      <div class="kv"><span>5 · Focus on your nation first</span><span>Diplomacy unlocks at 5,000 population, new nations at 25,000</span></div>
      ${career() ? `<div class="kv"><span>6 · Career Mode · ${dif().n}</span><span>The people demand progress. You lose if you go bankrupt, are impeached or lose an election. Win by becoming a <b>Superpower</b></span></div>` : `<div class="kv"><span>6 · Sandbox Mode</span><span>No game over — build however you like</span></div>`}</div>
      <div class="box" style="margin-top:12px;display:flex;gap:10px;align-items:center"><div class="tri">${ico('target')}</div><div style="font-size:12.5px"><b>Follow the Agenda</b> at the top left — step-by-step goals with cash rewards. Click a goal to start building right away.</div></div>`,
      buttons: [{ l: `${ico('play')} Start governing`, pri: 1 }]
    }), 900);
  } else if (S.over) { S.paused = true; queueModal(showGameOver); }
  else if (S.upgraded) {
    const from = S.upgraded; S.upgraded = 0;
    setTimeout(() => modal({
      title: "Cityhood v0.4 — what's new", sub: from < 2 ? `Your save continues in Career mode · ${dif().n}` : 'A more real, living world', icon: 'sparkle', wide: 1,
      html: `<div class="lst" style="font-size:12.5px">${[['Living city', 'Buses, pedestrians, planes taking off and ships sailing to your ports; rush-hour traffic'], ['Weather & seasons', 'Rainy and dry seasons, storms that cut solar output; season-dependent disasters'], ['Transport', 'Bus Terminal and Metro Station (key T) add commuter capacity'], ['Citizens', 'A live feed of what people say about their district — click to see the place'], ['Real economy', 'Inflation, real GDP growth, quarterly reports and ministry budgets'], ['Calendar', 'New Year fireworks, Independence Day and a moving Eid holiday']].concat(from < 2 ? [['Real challenges', 'Public demand, fiscal crises & IMF bailouts, impeachment, elections you can lose'], ['Victory & endings', 'Become a Superpower, or serve a full 20-year term and earn your place in history'], ['Living neighbors', 'AI personalities, building upgrades, tariffs, sanctions, territorial claims, trade offers'], ['Decisions that matter', 'Chained events with effects lasting months + 7 new policies'], ['Zoning & renewal', 'Mark zones (Z) and private developers build on their own; automatic upgrades via policy'], ['A living city', 'Traffic, land value, disasters, background music, graphics settings, save export/import']] : []).map(x => `<div class="kv"><span>${x[0]}</span><span>${x[1]}</span></div>`).join('')}</div>`,
      buttons: [{ l: `${ico('play')} Continue`, pri: 1 }]
    }), 700);
  } else toast(`Welcome back, ${presName()}`, dateStr(S.day), 'info', 'crown');
}
function renderTitle() {
  const save = readSave(); let col = NCOLORS[0], mode = 'career', diff = 'normal';
  $('#title').innerHTML = `<div class="tp">
    <div class="kick">Nation Builder · 3D</div>
    <div class="logo">CITYHOOD</div>
    <div class="tag">Take charge of a stretch of continent, some starting capital and basic facilities. Build your nation from scratch — roads, buildings, seaports, airports, all the way up to an iconic tower — then found new nations and become President of them all.</div>
    <div class="glass tcard">
      <label class="flbl" style="margin-top:0">President name</label><input class="tinput" id="tPres" maxlength="24" placeholder="Your name">
      <label class="flbl">Nation name</label><input class="tinput" id="tNat" maxlength="32" value="Dawn Republic">
      <label class="flbl">Flag color</label><div class="swatch" id="tSw">${NCOLORS.map(c => `<button data-c="${c}" style="background:${c}" class="${c === col ? 'on' : ''}"></button>`).join('')}</div>
      <label class="flbl">Mode</label><div class="seg" id="tMode">${Object.keys(MODES).map(k => `<button data-v="${k}" class="${k === mode ? 'on' : ''}"><b>${MODES[k].n}</b><small>${MODES[k].d}</small></button>`).join('')}</div>
      <label class="flbl">Difficulty</label><div class="seg s3" id="tDiff">${Object.keys(DIFF).map(k => `<button data-v="${k}" class="${k === diff ? 'on' : ''}"><b>${DIFF[k].n}</b><small>${DIFF[k].d}</small></button>`).join('')}</div>
      <label class="flbl">World seed</label><div class="seed"><input class="tinput num" id="tSeed" value="${S.seed}" inputmode="numeric"><button class="btn" id="tRoll" style="height:46px">${ico('rotate')} Random</button></div>
      <div class="trow"><button class="btn pri f1" id="tStart" style="height:48px">${ico('crown')} Start Governing</button>${save ? `<button class="btn" id="tCont" style="height:48px">${ico('play')} Continue</button>` : ''}</div>
      ${save ? `<div class="ms" style="margin-top:10px">Save: ${esc(save.nations?.[save.active]?.name || '')} · ${dateStr(save.day || 0)}${save.over ? ' · term ended' : ''}</div>` : ''}
      <button class="btn sm" id="tImp" style="margin-top:10px">${ico('upload')} Import save (.json)</button>
    </div>
    <div class="feat"><div>${ico('map')} 160×160 continent</div><div>${ico('home')} 38 building types</div><div>${ico('flag')} Multi-nation</div><div>${ico('sun')} Day & night</div></div>
  </div>`;
  $('#title').classList.remove('hidden');
  $('#tSw').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { col = b.dataset.c; $('#tSw').querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); });
  const seg = (id, set) => $(id).querySelectorAll('[data-v]').forEach(b => b.onclick = () => { set(b.dataset.v); $(id).querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b)); sfx('click'); });
  seg('#tMode', v => mode = v); seg('#tDiff', v => diff = v);
  $('#tImp').onclick = importSave;
  const reseed = v => { const s = (parseInt(v) >>> 0) || 1; if (s !== S.seed) { S.cleared = new Set(); generateWorld(s); } $('#tSeed').value = S.seed; };
  $('#tRoll').onclick = () => reseed(Math.floor(Math.random() * 1e6));
  $('#tSeed').onchange = e => reseed(e.target.value);
  $('#tStart').onclick = () => { sfx('click'); reseed($('#tSeed').value); newGame({ president: ($('#tPres').value || '').trim(), name: ($('#tNat').value || '').trim() || 'Dawn Republic', color: col, seed: S.seed, mode, diff }); };
  const c = $('#tCont'); if (c) c.onclick = () => { sfx('click'); loadGame(save); };
}

/* ---------------- thumbnails ---------------- */
function renderThumbs() {
  let R;
  try { R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  R.setPixelRatio(1); R.setSize(176, 176); R.toneMapping = THREE.ACESFilmicToneMapping; R.setClearColor(0x000000, 0);
  const ts = new THREE.Scene(); ts.add(new THREE.HemisphereLight('#e6f0ff', '#55604a', 1.2)); const dl = new THREE.DirectionalLight('#fff3e0', 2.6); dl.position.set(3, 5, 2); ts.add(dl);
  const tc = new THREE.PerspectiveCamera(26, 1, 0.1, 300), litM = matLit.clone(); litM.emissiveIntensity = 0.2;
  const dir = new THREE.Vector3(0.62, 0.55, 0.7).normalize(), sph = new THREE.Sphere(), bx = new THREE.Box3();
  for (const type in BT) {
    const lv = (BT[type].lv || 1) >= 3 ? 2 : 1, gs = geoSet(`${type}|${lv}|0|${FLAGGED.has(type) ? '#22d3ee' : ''}`);
    const grp = new THREE.Group(); grp.add(new THREE.Mesh(gs.body, matBody)); if (gs.lit) grp.add(new THREE.Mesh(gs.lit, litM)); ts.add(grp);
    bx.setFromObject(grp).getBoundingSphere(sph); const d = sph.radius / Math.sin(THREE.MathUtils.degToRad(13)) * 0.98;
    tc.position.copy(sph.center).addScaledVector(dir, d); tc.lookAt(sph.center); R.render(ts, tc);
    THUMBS[type] = R.domElement.toDataURL('image/png'); ts.remove(grp);
  }
  litM.dispose(); R.dispose(); R.forceContextLoss?.();
}

/* ---------------- loop ---------------- */
let lastT = performance.now(), simAcc = 0, uiT = 0, mmT = 0, drT = 0, pbT = 0, ovT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const raw = Math.max(0, (now - lastT) / 1000), dt = Math.min(0.05, raw), dtSim = Math.min(0.25, raw); lastT = now; W.uTime.value += dt;
  if (S.started) {
    keyPan(dt);
    if (!S.paused) { simAcc += dtSim * S.speed; let st = 0; while (simAcc >= DAY_SEC && st < 8) { simAcc -= DAY_SEC; simDay(); st++; } }
    animBuildings(dt); updateCars(dt); updateRotors(dt);
  } else { cam.gyaw += dt * 0.04; }
  updateParticles(dt); updateCam(dt); updateSky(dt); updateShadowCam(); updateClouds(dt); realTick(dt);
  if (S.terrDirty) { rebuildTerritory(); if (W.tFill) W.tFill.visible = S.political || S.tool.mode === 'land' || S.tool.mode === 'found'; }
  updateLabels(dt);
  if (S.started) {
    uiT += dt; if (uiT > 0.25) { uiT = 0; renderStats(); renderTime(); renderTracker(); renderRCI(); renderChips(); pumpModal(); if (S.selected && S.selected.b) renderInfoLive(); }
    if (S.zoneDirty) rebuildZones();
    if (S.dmgDirty) { S.dmgDirty = false; paintOverlay(); }
    pbT += dt; if (pbT > 0.6) { pbT = 0; updateProblems(); }
    ovT += dt; if (S.overlay && ovT > 1.2) { ovT = 0; paintOverlay(); buildOvField(); }
    bobProblems(now / 1000);
    drT += dt; if (drT > 1.5) { drT = 0; if (S.drawer && !ptr.down) refreshDrawer(); }
    selMat.opacity = 0.55 + Math.sin(now / 250) * 0.35;
  }
  mmT += dt; if (mmT > 1.2) { mmT = 0; mmDirty = true; } drawMinimap();
  renderer.render(scene, camera);
}
let infoT = 0;
function renderInfoLive() { infoT++; if (infoT % 2) return; const a = document.activeElement; if (a && a.closest && a.closest('#info')) return; if ($('#info').matches(':hover') && document.querySelector('#info .btn:hover')) return; renderInfo(); }
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (pMesh) pMesh.material.uniforms.uScale.value = innerHeight * 0.55; });

/* ---------------- init ---------------- */
async function init() {
  const prog = (p, t) => { $('#lprog').style.width = p + '%'; $('#ltxt').textContent = t; return new Promise(r => setTimeout(r, 30)); };
  initGfx();
  await prog(10, 'Shaping the continent…');
  const save = readSave(); S.seed = save ? save.seed : Math.floor(Math.random() * 1e6);
  if (save) S.cleared = new Set(save.cleared || []);
  generateWorld(S.seed);
  await prog(45, 'Briefing architects & engineers…');
  initCars(); initParticles(); initClouds(); pMesh.material.uniforms.uScale.value = innerHeight * 0.55;
  await prog(65, 'Rendering the building catalog…');
  renderThumbs();
  await prog(95, 'Almost ready…');
  applyCam(); requestAnimationFrame(loop);
  setTimeout(() => { $('#loading').style.opacity = 0; setTimeout(() => $('#loading').remove(), 650); renderTitle(); }, 250);
  if (new URLSearchParams(location.search).has('debug')) window.__game = { THREE, camera, checkSite, touchesRoad, setOverlay, checkUnlocks, S, act, placeBuilding, placeRoad, simDay, BT, cam, setTool, pickCat, openStats, openDiplo, openPolicy, openNations, owner: () => owner, terr: () => terr, ix, newGame, flyTo,
    realDay, voiceTick, calendarDay, econMonth, gdpGrowth, WX, wxDay, syncPlanes, syncShips, planes, ships, living: () => ({ bus: busM, ped: pedM }), districtAt, fireworks, trafficFactor, retargetLiving, priceNow, budOf, feedHTML,
    aiAct, animBuildings, autoUpgrade, zoneDev, paintZoneTiles, zone: () => zone, runDisaster, DISASTERS, damageB, repairB, EVENTS, runEvent, gameOver, checkEndings, victoryState, scoreOf, styleOf, ranking, natMods, demand, saveGame, readSave, loadGame, applyGfx, setMusic, MUS, aiDiplomacy, tariffEvent, demandEvent, queueModal, pumpModal, DIFF, monthEnd, nationFails, foundNation: (t, nm) => foundNation(t, nm, '#ec4899', 1), playerNations };
}
init().catch(e => { console.error(e); $('#ltxt').textContent = 'Failed to load: ' + e.message; });

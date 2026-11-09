/* =====================================================================
   CITY DYNAMICS · ZONING · LAND VALUE · DISASTERS · MUSIC · GRAPHICS · SAVES
   ===================================================================== */

/* ---------------- zoning (private development) ---------------- */
const ZONES = {
  1: { n: 'Residential Zone', c: '#34d399', icon: 'home', d: 'Houses & apartments', dm: 0 },
  2: { n: 'Commercial Zone', c: '#60a5fa', icon: 'shop', d: 'Shophouses & offices', dm: 1 },
  3: { n: 'Industrial Zone', c: '#fbbf24', icon: 'factory', d: 'Farms & factories · 2×2', dm: 2 },
};
const ZONE_FEE = 250, DEV_SHARE = 0.5;             // permit fee per tile · share of the cost paid by the state
const zoneOK = (i, n) => owner[i] === n.id && terr[i] >= 2 && terr[i] !== T.MTN && !road[i] && !tileB[i];
function paintZoneTiles(L, z, n) {
  if (z === 0) { let c = 0; for (const i of L) if (owner[i] === n.id && zone[i]) { zone[i] = 0; c++; } S.zoneDirty = true; return { c, cost: 0 }; }
  const ok = L.filter(i => zoneOK(i, n) && zone[i] !== z), cost = ok.length * ZONE_FEE;
  if (!ok.length) return { c: 0, cost: 0 };
  if (n.treasury < cost) { toast('Not enough funds', `Zoning permits cost ${money(cost)}`, 'bad', 'alert'); sfx('error'); return { c: 0, cost: 0 }; }
  n.treasury -= cost; for (const i of ok) zone[i] = z; S.zoneDirty = true; sfx('build');
  if (!S.cnt.zoneTip) { S.cnt.zoneTip = 1; toast('Zone designated', 'Private developers build automatically on road-adjacent tiles, following R/C/I demand', 'info', 'zone'); }
  return { c: ok.length, cost };
}
let zoneMesh = null; const _zc = new THREE.Color();
function rebuildZones() {
  S.zoneDirty = false;
  if (!zoneMesh) {
    zoneMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.86, 0.86).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false }), MAP * MAP / 2);
    zoneMesh.frustumCulled = false; zoneMesh.renderOrder = 3; zoneMesh.setColorAt(0, _zc); fxG.add(zoneMesh);
  }
  let k = 0; const cap = MAP * MAP / 2;
  for (let i = 0; i < MAP * MAP && k < cap; i++) {
    if (!zone[i] || tileB[i] || road[i]) continue;
    _m.makeTranslation(i % MAP - HALF + 0.5, 0.05, ((i / MAP) | 0) - HALF + 0.5); zoneMesh.setMatrixAt(k, _m); zoneMesh.setColorAt(k, _zc.set(ZONES[zone[i]].c)); k++;
  }
  zoneMesh.count = k; zoneMesh.instanceMatrix.needsUpdate = true; if (zoneMesh.instanceColor) zoneMesh.instanceColor.needsUpdate = true;
}
function devType(z, n) {
  const R = Math.random();
  if (z === 1) return n.pop >= BT.apartment.unlock && R < 0.35 ? 'apartment' : 'house';
  if (z === 2) return n.pop >= BT.office.unlock && R < 0.15 ? 'office' : 'shop';
  return n.pop >= BT.factory.unlock && R < 0.5 ? 'factory' : 'farm';
}
function devSite(type, i, z, n) {
  const s = BT[type].s, x0 = i % MAP, z0 = (i / MAP) | 0;
  for (let oz = 0; oz < s; oz++) for (let ox = 0; ox < s; ox++) {
    const x = x0 - ox, zz = z0 - oz; let fit = true;
    for (let dz = 0; dz < s && fit; dz++) for (let dx = 0; dx < s; dx++) if (!inb(x + dx, zz + dz) || zone[ix(x + dx, zz + dz)] !== z) { fit = false; break; }
    if (fit && !checkSite(type, x, zz, n, false) && touchesRoad(x, zz, s)) return { x, z: zz };
  }
  return null;
}
// Private developers build on zoned, road-connected tiles when demand is there; the state pays DEV_SHARE of the cost.
function zoneDev(n) {
  if (n.ai || S.over) return;
  const cand = { 1: [], 2: [], 3: [] };
  for (let i = 0; i < MAP * MAP; i++) if (zone[i] && owner[i] === n.id && !tileB[i] && !road[i]) cand[zone[i]].push(i);
  if (!cand[1].length && !cand[2].length && !cand[3].length) return;
  const dm = demand(n);
  for (const z of [1, 2, 3]) {
    const L = cand[z], want = dm[ZONES[z].dm]; if (!L.length || want < 0.3) continue;
    let k = 1 + Math.floor(want * 2.5), tries = 0;
    while (k > 0 && tries++ < 24 && L.length) {
      const j = Math.floor(Math.random() * L.length), i = L[j]; L[j] = L[L.length - 1]; L.pop();
      if (tileB[i]) continue;
      // try the preferred type first, fall back to the basic one (e.g. a 2×2 factory that does not fit → farm)
      const type = devType(z, n), basic = z === 1 ? 'house' : z === 2 ? 'shop' : 'farm';
      let t2 = type, site = devSite(type, i, z, n);
      if (!site && type !== basic) { t2 = basic; site = devSite(basic, i, z, n); }
      if (!site) continue;
      const cost = siteCost(t2, site.x, site.z, n) * DEV_SHARE;
      if (n.treasury < cost) { if (!n.devWarn && n.id === S.active) { n.devWarn = 1; toast('Private development on hold', 'Not enough in the Treasury for the 50% incentive', 'wa', 'zone'); } return; }
      n.devWarn = 0; n.treasury -= cost; placeBuilding(t2, site.x, site.z, n, {}); bumpB(t2); k--;
    }
  }
}

/* ---------------- automatic upgrades ---------------- */
function upgradeReady(b, n) {
  const d = BT[b.type];
  if (d.c === 'res') return b.occ >= capOf(b) * 0.9 && b.happy >= 0.65 && (b.lval ?? 0.5) >= 0.45;
  if (d.c === 'com' || d.c === 'ind') return n.unemp >= 0.03 && n.pr >= 0.999 && b.conn;
  return false;
}
function autoUpgrade(n) {
  const reserve = Math.max(1e6, (n.rate.exp?.upk || 0) * 3);
  const c = n.list.filter(b => b.prog >= 1 && b.vis >= 1 && !b.dmg && b.level < (BT[b.type].lv || 1) && upgradeReady(b, n)).sort((a, b) => upgradeCost(a) - upgradeCost(b));
  let done = 0, spent = 0;
  for (const b of c) { if (done >= 6) break; const cost = upgradeCost(b); if (n.treasury - cost < reserve) break; n.treasury -= cost; spent += cost; quietUpgrade(b); bump('up'); done++; }
  if (done && n.id === S.active) toast('City renewal', `${done} buildings upgraded · −${money(spent)}`, 'info', 'up');
}

/* ---------------- land value ---------------- */
function nearWater(b) {
  if (b.wv != null) return b.wv;
  for (let z = b.z - 3; z < b.z + b.s + 3; z++) for (let x = b.x - 3; x < b.x + b.s + 3; x++) if (inb(x, z) && terr[ix(x, z)] <= 1) return b.wv = true;
  return b.wv = false;
}
function landValue(r) {
  const cv = r.cov;
  const v = 0.22 + cv.edu * 0.14 + cv.health * 0.12 + cv.safety * 0.1 + cv.fire * 0.05 + Math.min(0.2, cv.park * 1.4) + Math.min(0.22, cv.land * 1.6) - r.poll * 1.1 + (nearWater(r) ? 0.08 : 0);
  return clamp(v, 0, 1);
}
const lvLabel = v => v >= 0.7 ? 'High' : v >= 0.45 ? 'Medium' : 'Low';

/* ---------------- disasters ---------------- */
const DMGC = new THREE.Color('#6b5548');
const repairCost = b => Math.round(BT[b.type].cost * 0.3 * LVM[b.level - 1] * priceNow(nationOf(b)) / 1000) * 1000;
function addDmgFx(b) { if (S.emitters.some(e => e.b === b && e.dmg)) return; const [x, z] = rotLocal(b, 0, 0); S.emitters.push({ b, x, y: 0.9, z, k: 0, acc: Math.random(), dmg: true }); }
function damageB(b, days) {
  if (!S.blds.has(b.id) || b.type === 'palace') return;
  const n = nationOf(b); if (n.pol.bnpb) days = Math.ceil(days / 2);
  b.dmg = Math.max(b.dmg || 0, days); S.dmgSet.add(b); addDmgFx(b); n.dirty = true; S.dmgDirty = true;
}
function repairB(b) {
  b.dmg = 0; S.dmgSet.delete(b); S.emitters = S.emitters.filter(e => !(e.b === b && e.dmg));
  if (S.blds.has(b.id)) nationOf(b).dirty = true; S.dmgDirty = true;
}
function destroyB(b) { if (b.type === 'palace' || !S.blds.has(b.id)) return; removeBuilding(b); S.dmgDirty = true; }
function tickDamage() {
  for (const b of [...S.dmgSet]) {
    if (!S.blds.has(b.id)) { S.dmgSet.delete(b); continue; }
    b.dmg -= nationOf(b).pol.bnpb ? 2 : 1; if (b.dmg <= 0) repairB(b);
  }
}
function fireCover(b, n) {
  if (BT[b.type].c === 'res') return b.cov?.fire || 0;
  let c = 0; const cx = b.x + b.s / 2, cz = b.z + b.s / 2;
  for (const s of n.list) { const d = BT[s.type]; if (d.svc !== 'fire' || s.prog < 1 || s.dmg || !s.conn) continue; const dist = Math.hypot(s.x + s.s / 2 - cx, s.z + s.s / 2 - cz); if (dist <= d.r) c = Math.max(c, 1 - dist / d.r * 0.45); }
  return c;
}
function floodDamage(n, days) { let k = 0; for (const b of n.list) if (b.prog >= 1 && !b.dmg && nearWater(b) && b.type !== 'palace' && Math.random() < 0.55 && k < 14) { damageB(b, days + Math.floor(Math.random() * 4)); k++; } return k; }
const DISASTERS = [
  { id: 'fire', n: 'Fire', i: 'flame', w: 4, c: n => n.list.some(b => ['res', 'com', 'ind'].includes(BT[b.type].c) && b.prog >= 1) },
  { id: 'quake', n: 'Earthquake', i: 'quake', w: 1.4, c: n => n.list.length > 20 },
  { id: 'flood', n: 'Coastal Flood', i: 'drop', w: 2, c: n => n.list.some(b => b.prog >= 1 && nearWater(b) && b.type !== 'palace') },
  { id: 'storm', n: 'Severe Storm', i: 'wind', w: 1.5, c: n => n.list.some(b => (b.type === 'wind' || b.type === 'solar') && b.prog >= 1) },
];
function disasterRoll(n) {
  if (!S.disasters || n.ai || S.over || S.day < 180 || Math.random() > 0.055 * dif().dis) return;
  const pool = DISASTERS.filter(d => d.c(n)); if (!pool.length) return;
  let r = Math.random() * pool.reduce((a, d) => a + d.w * seasonW(d.id), 0), D = pool[0];
  for (const d of pool) { r -= d.w * seasonW(d.id); if (r <= 0) { D = d; break; } }
  runDisaster(D, n);
}
function runDisaster(D, n) {
  let hit = [], destroyed = 0, focus = null; const bn = !!n.pol.bnpb;
  if (D.id === 'fire') {
    const c = n.list.filter(b => ['res', 'com', 'ind'].includes(BT[b.type].c) && b.prog >= 1 && !b.dmg), b0 = c[Math.floor(Math.random() * c.length)];
    focus = b0; const cov0 = fireCover(b0, n);
    const near = cov0 < 0.35 ? n.list.filter(b => b !== b0 && b.prog >= 1 && !b.dmg && b.type !== 'palace' && Math.hypot(b.x - b0.x, b.z - b0.z) <= 2.5).slice(0, 2) : [];
    for (const b of [b0, ...near]) { const cv = fireCover(b, n); if (cv < 0.3 && Math.random() < (bn ? 0.25 : 0.5)) { destroyB(b); destroyed++; } else { damageB(b, cv >= 0.5 ? 6 : 18); hit.push(b); } }
  } else if (D.id === 'quake') {
    const ep = n.list[Math.floor(Math.random() * n.list.length)]; focus = ep; const R = 7;
    for (const b of n.list.slice()) {
      if (b.prog < 1 || b.dmg || b.type === 'palace') continue; const dist = Math.hypot(b.x - ep.x, b.z - ep.z); if (dist > R) continue;
      const p = 0.5 * (1 - dist / R); if (Math.random() > p) continue;
      if (dist < 3 && Math.random() < (bn ? 0.04 : 0.1) && BT[b.type].c !== 'svc') { destroyB(b); destroyed++; } else { damageB(b, 12 + Math.floor(Math.random() * 18)); hit.push(b); }
    }
  } else if (D.id === 'flood') {
    const k = floodDamage(n, 6); hit = n.list.filter(b => b.dmg && nearWater(b)); focus = hit[0]; if (!k) return;
  } else {
    for (const b of n.list) if ((b.type === 'wind' || b.type === 'solar') && b.prog >= 1 && !b.dmg && Math.random() < 0.6) { damageB(b, 8); hit.push(b); }
    focus = hit[0];
  }
  if (!hit.length && !destroyed) return;
  const fx = focus ? { x: focus.x, z: focus.z } : n.capital;
  addNews(`${D.n} hits ${n.name}: ${hit.length} buildings damaged${destroyed ? `, ${destroyed} destroyed` : ''}.`); sfx('error');
  const fixAll = () => { const L = [...S.dmgSet].filter(b => b.nid === n.id), c = L.reduce((a, b) => a + repairCost(b), 0); return { L, c }; };
  queueModal(() => {
    const { L, c } = fixAll();
    modal({
      title: `${D.n}!`, sub: `${esc(n.name)} · ${dateStr(S.day)}`, icon: D.i,
      html: `<p>${D.id === 'fire' ? 'Fire tears through buildings in the city.' : D.id === 'quake' ? 'An earthquake shakes your territory.' : D.id === 'flood' ? 'A high tide floods the coastal districts.' : 'Strong winds damage your power plants.'} <b>${hit.length}</b> buildings damaged${destroyed ? ` and <b>${destroyed}</b> destroyed` : ''}.</p><p class="ms" style="margin-top:6px">Damaged buildings stay out of service until they recover on their own. ${D.id === 'fire' ? 'Fire Station coverage reduces losses.' : ''} ${bn ? 'The Disaster Management Agency speeds up recovery.' : 'The Disaster Management Agency program (Policy) reduces damage and speeds up recovery.'}</p>`,
      buttons: [{ l: `${ico('map')} View location`, f: () => { flyTo(fx.x, fx.z, 30); } }, ...(L.length ? [{ l: `${ico('wrench')} Repair all · ${money(c)}`, pri: 1, f: () => { if (n.treasury < c) { toast('Not enough funds', `Requires ${money(c)}`, 'bad', 'alert'); return; } n.treasury -= c; for (const b of L) repairB(b); toast('Repairs complete', `${L.length} buildings back in service`, 'info', 'wrench'); } }] : []), { l: 'Close' }]
    });
  });
}

/* ---------------- procedural background music ---------------- */
const MUS = { g: null, timer: 0, next: 0, bar: 0 };
const PROG_MAJ = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]];
const PROG_MIN = [[9, 12, 16], [5, 9, 12], [0, 4, 7], [4, 8, 11]];
function musEnsure() {
  AC = AC || new (window.AudioContext || window.webkitAudioContext)();
  if (!MUS.g) { MUS.g = AC.createGain(); MUS.g.gain.value = 0; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1700; MUS.g.connect(f); f.connect(AC.destination); }
}
function setMusic(on) {
  S.music = on;
  try {
    if (on) {
      musEnsure(); if (AC.state === 'suspended') AC.resume();
      MUS.g.gain.cancelScheduledValues(AC.currentTime); MUS.g.gain.setTargetAtTime(0.055, AC.currentTime, 1.5);
      if (!MUS.timer) { MUS.next = AC.currentTime + 0.3; MUS.timer = setInterval(musSched, 500); }
    } else if (MUS.g) { MUS.g.gain.setTargetAtTime(0, AC.currentTime, 0.4); clearInterval(MUS.timer); MUS.timer = 0; }
  } catch (e) { }
}
function musSched() { if (!AC || !MUS.g) return; while (MUS.next < AC.currentTime + 1.2) { musBar(MUS.next); MUS.next += 4.8; MUS.bar++; } }
function musVoice(f, t, dur, v, type, att) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(MUS.g); o.start(t); o.stop(t + dur + 0.05);
}
function musBar(t) {
  const h = homeN(), tense = !!(h && S.started && (h.approval < 40 || h.treasury < 0 || h.lowM || h.debtM));
  const ch = (tense ? PROG_MIN : PROG_MAJ)[MUS.bar % 4], base = 130.81;
  for (const s of ch) musVoice(base * 2 ** (s / 12), t, 5.2, 0.15, 'triangle', 1.4);
  const pent = tense ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  for (let k = 0; k < 3; k++) if (Math.random() < 0.55) musVoice(base * 4 * 2 ** (pent[Math.floor(Math.random() * 5)] / 12), t + 0.5 + k * 1.4 + Math.random() * 0.3, 2.2, 0.07, 'sine', 0.02);
}

/* ---------------- graphics quality ---------------- */
const GFX = { high: { n: 'High', pr: 2, sh: 2048 }, med: { n: 'Medium', pr: 1.5, sh: 1024 }, low: { n: 'Low', pr: 1, sh: 0 } };
function gfxDefault() {
  const touch = matchMedia('(pointer:coarse)').matches, small = Math.min(screen.width, screen.height) < 820;
  const weak = (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  return touch && small ? (weak ? 'low' : 'med') : weak ? 'med' : 'high';
}
function applyGfx(q) {
  S.gfx = GFX[q] ? q : 'high'; try { localStorage.setItem('sovereign_gfx', S.gfx); } catch (e) { }
  const G = GFX[S.gfx]; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, G.pr)); renderer.setSize(innerWidth, innerHeight);
  const size = G.sh || 512, on = G.sh > 0;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (renderer.shadowMap.enabled !== on) { renderer.shadowMap.enabled = on; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); }
}
function initGfx() { let q = null; try { q = localStorage.getItem('sovereign_gfx'); } catch (e) { } applyGfx(q || gfxDefault()); }

/* ---------------- save export / import ---------------- */
function exportSave() {
  saveGame(true); let s = null; try { s = localStorage.getItem(SAVE_KEY); } catch (e) { }
  if (!s) { toast('No save yet', 'Start playing first', 'bad', 'alert'); return; }
  const n = homeN(), name = (n ? n.name : 'sovereign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nation';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'application/json' }));
  a.download = `sovereign-${name}-year-${Math.floor(S.day / 360) + 1}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Save exported', 'Keep this .json file to continue on another device', 'info', 'download');
}
const validSave = d => !!(d && typeof d.seed === 'number' && Array.isArray(d.nations) && d.nations.length && Array.isArray(d.blds) && Array.isArray(d.owner) && Array.isArray(d.roads));
function importSave() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    f.text().then(t => {
      let d = null; try { d = JSON.parse(t); } catch (e) { }
      if (!validSave(d)) { if (S.started) toast('Invalid file', 'Choose a SOVEREIGN save file (.json)', 'bad', 'alert'); else modal({ title: 'Invalid file', sub: 'Choose a SOVEREIGN save file (.json)', icon: 'alert', buttons: [{ l: 'OK', pri: 1 }] }); return; }
      const nm = d.nations[d.active || 0]?.name || '';
      modal({ title: 'Import save?', sub: `${esc(nm)} · ${dateStr(d.day || 0)}`, icon: 'upload', html: '<p>The save in this browser will be replaced by the selected file, and the game will reload.</p>', buttons: [{ l: 'Cancel' }, { l: `${ico('upload')} Import & load`, pri: 1, f: () => { try { localStorage.setItem(SAVE_KEY, t); location.reload(); } catch (e) { modal({ title: 'Import failed', sub: 'Browser storage is unavailable', icon: 'alert', buttons: [{ l: 'OK', pri: 1 }] }); } } }] });
    });
  };
  inp.click();
}

/* ---------------- status chips · goals · approval breakdown ---------------- */
function apprParts(n) {
  const M = natMods(n), parts = [
    ['Citizen happiness', n.happy * 64], ['Employment', (1 - n.unemp) * 22], [n.treasury >= 0 ? 'Healthy treasury' : 'Treasury in deficit', n.treasury >= 0 ? 10 : -12],
    ['Buildings (parliament, military)', n.list.reduce((a, b) => a + (b.prog >= 1 && (b.active || BT[b.type].road === false) ? BT[b.type].appr || 0 : 0), 0)],
    ['Alliance', n.allied ? 2 : 0], ['Decisions & events', n.apprMod], ['Policies & active effects', M.appr], ['Public demand', -(n.dem || 0)],
  ];
  return parts.filter(p => Math.abs(p[1]) >= 0.5);
}
function demandModal() {
  const n = act();
  modal({
    title: 'Public Demand', sub: `${esc(n.name)} · ${Math.round(n.dem || 0)} / ${dif().demMax}`, icon: 'users',
    html: `<p>The people demand progress. Every month, demand rises by <b>${dif().dem}</b> points (${dif().n}) and directly reduces approval (up to ${dif().demMax}). It rises more slowly as your nation grows.</p>
      <div class="lst" style="margin-top:10px"><div class="kv"><span>Population grows 1%/month</span><span class="up">−3 points</span></div><div class="kv"><span>Agenda item completed</span><span class="up">−3 points</span></div><div class="kv"><span>Agenda chapter completed</span><span class="up">−8 points</span></div><div class="kv"><span>Landmark completed</span><span class="up">−6 points</span></div><div class="kv"><span>Population milestone reached</span><span class="up">−10 points</span></div></div>
      <p class="ms" style="margin-top:10px">Stand still and approval slowly sinks. Low approval can lead to impeachment or an election defeat.</p>`,
    buttons: [{ l: 'Got it', pri: 1 }]
  });
}
function renderChips() {
  let el = $('#gchips'); if (!el) { el = document.createElement('div'); el.id = 'gchips'; $('#hud').appendChild(el); }
  const n = act(); if (!n) return; const D = dif(), ch = [];
  ch.push(`<button class="gc" data-g="goal">${ico(career() ? 'trophy' : 'sparkle')}${career() ? 'Career' : 'Sandbox'} · ${D.n}</button>`);
  ch.push(wxChip());
  if (career() && (n.dem || 0) >= 5) ch.push(`<button class="gc ${n.dem >= 25 ? 'bad' : 'wa'}" data-g="dem">${ico('users')}Public demand ${Math.round(n.dem)}</button>`);
  if (career() && n.debtM) ch.push(`<button class="gc bad" data-g="pol">${ico('coins')}Deficit ${n.debtM}/${D.crisis} mo</button>`);
  if (career() && n.lowM) ch.push(`<button class="gc bad" data-g="goal">${ico('alert')}No-confidence ${n.lowM}/6</button>`);
  const threats = (n.mods || []).filter(m => m.id.startsWith('tarif') || m.id.startsWith('sanksi'));
  if (threats.length) ch.push(`<button class="gc wa" data-g="diplo">${ico('globe')}${threats.length > 1 ? threats.length + ' sanctions/tariffs' : esc(threats[0].t)} · ${threats[0].left} mo</button>`);
  const dmg = [...S.dmgSet].filter(b => b.nid === n.id).length;
  if (dmg) ch.push(`<button class="gc wa" data-g="dmg">${ico('flame')}${dmg} damaged buildings</button>`);
  const html = ch.join('');
  if (el._h === html) return; el._h = html; el.innerHTML = html;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    sfx('click'); const g = b.dataset.g;
    if (g === 'wx') weatherModal();
    else if (g === 'goal') openStats('goal'); else if (g === 'dem') demandModal(); else if (g === 'pol') openPolicy(); else if (g === 'diplo') openDiplo();
    else if (g === 'dmg') { const d = [...S.dmgSet].find(x => x.nid === n.id); if (d) { flyTo(d.x, d.z, 28); select({ b: d }); } }
  });
}

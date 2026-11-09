
/* =====================================================================
   PROGRESSION · AGENDA · DEMAND · DATA VIEWS · ALERTS
   ===================================================================== */
Object.assign(I, {
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 15l3-3 2 2 3-4"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-3 2-4.5 2-7 1.5 1 2.2 2 3 3.2.6-2 .4-4.2 0-6.2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
});
const UNL = { diplo: 5000, found: 25000 };
const mainNation = () => S.nations.find(n => !n.ai) || act();
const cntB = t => S.cnt.b[t] || 0;
function bump(k, v = 1) { S.cnt[k] = (S.cnt[k] || 0) + v; }
function bumpB(t) { S.cnt.b[t] = (S.cnt.b[t] || 0) + 1; }
const nf = v => v >= 1e5 ? fmt(v) : fmtPop(v);

/* ---------------- agenda ---------------- */
const CHAPTERS = ['Chapter 1 · Laying the Foundations', 'Chapter 2 · A Growing City', 'Chapter 3 · Becoming Developed', 'Chapter 4 · Regional Power'];
const CH_BONUS = [3e6, 6e6, 12e6, 30e6];
const MISSIONS = [
  { ch: 0, id: 'road20', t: 'Expand the road network', d: 'Build 20 new road tiles', p: () => [S.cnt.road, 20], r: 6e5, go: 'road' },
  { ch: 0, id: 'house10', t: 'Homes for the people', d: 'Build 10 Houses along a road', p: () => [cntB('house'), 10], r: 8e5, go: 'house' },
  { ch: 0, id: 'shop6', t: 'Kick-start the local economy', d: 'Build 6 Shophouses', p: () => [cntB('shop'), 6], r: 8e5, go: 'shop' },
  { ch: 0, id: 'energy2', t: 'Power for the future', d: 'Build 2 power plants (Solar, Wind or Coal)', p: () => [cntB('solar') + cntB('wind') + cntB('coal'), 2], r: 1e6, go: 'wind' },
  { ch: 0, id: 'park3', t: 'Green space for citizens', d: 'Build 3 City Parks', p: () => [cntB('park'), 3], r: 5e5, go: 'park' },
  { ch: 0, id: 'pop2k', t: '2,000 citizens', d: 'Reach a population of 2,000', p: () => [Math.floor(mainNation().pop), 2000], r: 1e6 },
  { ch: 1, id: 'up5', t: 'City renewal', d: 'Upgrade 5 buildings (click a building → Upgrade)', p: () => [S.cnt.up, 5], r: 1.5e6 },
  { ch: 1, id: 'fac2', t: 'Industrial age', d: 'Build 2 Factories (unlocks at 2,400 population)', p: () => [cntB('factory'), 2], r: 2e6, go: 'factory' },
  { ch: 1, id: 'land40', t: 'Expand the territory', d: 'Buy 40 tiles of land along the border', p: () => [S.cnt.land, 40], r: 1.5e6, go: 'land' },
  { ch: 1, id: 'apt4', t: 'Vertical living', d: 'Build 4 Apartments (unlocks at 3,000 population)', p: () => [cntB('apartment'), 4], r: 2e6, go: 'apartment' },
  { ch: 1, id: 'hap75', t: 'A happy people', d: 'Happiness ≥ 75% with ≥ 3,000 population', p: () => [mainNation().pop >= 3000 ? Math.round(mainNation().happy * 100) : 0, 75], r: 2e6, u: '%' },
  { ch: 1, id: 'net150', t: 'A healthy treasury', d: 'Net balance ≥ +$150K per month', p: () => [Math.max(0, Math.round((mainNation().rate.net || 0) / 1000)), 150], r: 2.5e6, u: 'k' },
  { ch: 2, id: 'pop10k', t: 'Big city', d: 'Reach a population of 10,000', p: () => [Math.floor(mainNation().pop), 10000], r: 4e6 },
  { ch: 2, id: 'mall2', t: 'Shopping destination', d: 'Build 2 Malls', p: () => [cntB('mall'), 2], r: 3e6, go: 'mall' },
  { ch: 2, id: 'parl', t: 'Democracy takes root', d: 'Build the Parliament', p: () => [cntB('parliament'), 1], r: 5e6, go: 'parliament' },
  { ch: 2, id: 'hosp', t: 'Health care for all', d: 'Build a Hospital (unlocks at 12,000 population)', p: () => [cntB('hospital'), 1], r: 3e6, go: 'hospital' },
  { ch: 2, id: 'monu', t: 'A national symbol', d: 'Build the National Monument', p: () => [cntB('monument'), 1], r: 6e6, go: 'monument' },
  { ch: 2, id: 'appr70', t: 'A beloved President', d: 'Approval ≥ 70% with ≥ 10,000 population', p: () => [mainNation().pop >= 10000 ? Math.round(mainNation().approval) : 0, 70], r: 6e6, u: '%' },
  { ch: 3, id: 'pop25k', t: 'Developed nation', d: 'Reach a population of 25,000 — unlocks founding new nations', p: () => [Math.floor(mainNation().pop), 25000], r: 10e6 },
  { ch: 3, id: 'trade', t: 'International partners', d: 'Sign 1 trade agreement', p: () => [S.cnt.trade, 1], r: 5e6, go: 'diplo' },
  { ch: 3, id: 'port', t: 'Gateway to the sea', d: 'Build a Seaport on the coast', p: () => [cntB('port'), 1], r: 8e6, go: 'port' },
  { ch: 3, id: 'stad', t: 'Sporting pride', d: 'Build the National Stadium', p: () => [cntB('stadium'), 1], r: 8e6, go: 'stadium' },
  { ch: 3, id: 'pop50k', t: 'Metropolis', d: 'Reach a population of 50,000', p: () => [Math.floor(mainNation().pop), 50000], r: 20e6 },
  { ch: 3, id: 'air', t: 'Open to the world', d: 'Build the International Airport', p: () => [cntB('airport'), 1], r: 20e6, go: 'airport' },
  { ch: 3, id: 'found', t: 'Multi-nation President', d: 'Found a second nation', p: () => [playerNations().length - 1, 1], r: 15e6, go: 'found' },
  { ch: 3, id: 'spire', t: "The world's tallest tower", d: 'Build the Iconic Tower', p: () => [cntB('spire'), 1], r: 50e6, go: 'spire' },
];
function curChapter() { const m = MISSIONS.find(m => !S.mis.includes(m.id)); return m ? m.ch : -1; }
function activeMissions() { const ch = curChapter(); return ch < 0 ? [] : MISSIONS.filter(m => m.ch === ch && !S.mis.includes(m.id)).slice(0, 3); }
let trackKey = '';
function checkMissions() {
  if (!S.started) return;
  for (const m of activeMissions()) {
    const [c, t] = m.p(); if (c < t) continue;
    S.mis.push(m.id); const n = act(); n.treasury += m.r; trackKey = ''; relieve(n, 3);
    toast(`Agenda item complete: ${m.t}`, `${money(m.r)} reward paid into the ${n.name} treasury`, 'gold', 'check'); sfx('coin'); addNews(`Agenda item "${m.t}" completed.`);
    if (MISSIONS.filter(x => x.ch === m.ch).every(x => S.mis.includes(x.id))) {
      n.treasury += CH_BONUS[m.ch]; relieve(n, 8); addNews(`${CHAPTERS[m.ch]} complete.`); const next = CHAPTERS[m.ch + 1];
      if ($('#modal').classList.contains('hidden')) modal({ title: `${CHAPTERS[m.ch]} complete!`, sub: `Chapter bonus of ${money(CH_BONUS[m.ch])} received.`, icon: 'sparkle', html: next ? `<p>A new chapter begins: <b>${next}</b>. Your next goals are in the Agenda panel (top left).</p>` : (career() ? '<p>Every agenda item is done! The last step to becoming a <b>Superpower</b>: see the requirements under Statistics → Goals & Rankings.</p>' : '<p>Every agenda item is done. Your nation is now a superpower!</p>'), buttons: [{ l: 'Continue', pri: 1 }] });
      else toast(`${CHAPTERS[m.ch]} complete!`, `Bonus ${money(CH_BONUS[m.ch])}`, 'gold', 'sparkle');
    }
    break;
  }
}
function checkUnlocks() {
  const mp = Math.max(0, ...playerNations().map(n => n.pop));
  for (const k in UNL) if (!S.unl[k] && mp >= UNL[k]) {
    S.unl[k] = true; sfx('coin'); renderMenu();
    if (k === 'diplo') { toast('International diplomacy unlocked!', 'You can now trade and form alliances with neighboring nations', 'gold', 'globe'); addNews('Neighboring nations have opened diplomatic relations.'); }
    else { toast('Founding new nations unlocked!', 'You can now found up to 5 nations', 'gold', 'flag'); addNews('Our nation is now ready to found new nations.'); if (S.drawer === 'land') refreshDrawer(); }
  }
}
function lockedModal(k) {
  const m = mainNation(), need = UNL[k], p = clamp(m.pop / need, 0, 1);
  const info = k === 'diplo'
    ? { t: 'Diplomacy is still locked', i: 'globe', d: 'Focus on building your nation first. Once your population is large enough, neighboring nations will open up trade, alliances and territory deals.' }
    : { t: 'Founding new nations is still locked', i: 'flag', d: 'Make your nation a developed one first. Then you can found up to 5 nations and be President of them all.' };
  modal({ title: info.t, sub: `Unlocks at ${fmtPop(need)} population`, icon: info.i, html: `<p>${info.d}</p><div class="box" style="margin-top:14px"><div class="row" style="justify-content:space-between"><div class="lb">${esc(m.name)} population</div><div style="font-weight:800">${fmtPop(m.pop)} / ${fmtPop(need)}</div></div><div class="bar ok" style="margin-top:8px;height:7px"><i style="width:${p * 100}%"></i></div></div>`, buttons: [{ l: 'OK, back to building', pri: 1 }] });
}
function misGo(m) {
  const g = m && m.go; if (!g) return;
  const open = id => { if (S.drawer !== id) pickCat(id); };
  if (g === 'road' || g === 'land') return open(g);
  if (g === 'diplo') return openDiplo();
  if (g === 'found') { if (!S.unl.found) return lockedModal('found'); open('land'); setTool('found'); return; }
  const d = BT[g]; if (!d) return; const n = act();
  if (d.unlock && n.pop < d.unlock) { toast(`${d.n} is still locked`, `Reach ${fmtPop(d.unlock)} population`, 'wa', 'lock'); return; }
  open(d.c); setTool('build', g);
}
function renderTracker() {
  const el = $('#track'); if (!el || !S.started) return;
  const list = activeMissions(), ch = curChapter(), key = list.map(m => m.id).join(',') + '|' + S.trackOpen + '|' + ch;
  if (key !== trackKey) {
    trackKey = key;
    if (ch < 0) { el.innerHTML = `<div class="trh"><div class="tri">${ico('crown')}</div><div><div class="trk">Agenda</div><div class="trt">Agenda complete!</div></div></div>`; return; }
    const tot = MISSIONS.filter(m => m.ch === ch).length, done = MISSIONS.filter(m => m.ch === ch && S.mis.includes(m.id)).length;
    el.innerHTML = `<div class="trh" id="trH"><div class="tri">${ico('target')}</div><div style="min-width:0;flex:1"><div class="trk">Agenda · ${done}/${tot}</div><div class="trt">${CHAPTERS[ch]}</div></div><button class="trc ${S.trackOpen ? '' : 'cl'}">${ico('chev')}</button></div>
      <div class="trb"><i style="width:${done / tot * 100}%"></i></div>
      ${S.trackOpen ? `<div class="trl">${list.map(m => `<button class="mis" data-m="${m.id}"><span class="mck"></span><div class="mtx"><b>${m.t}</b><small>${m.d}</small><div class="bar ok"><i data-pb></i></div></div><div class="mrw"><span data-pv class="num"></span><em>+${money(m.r)}</em></div></button>`).join('')}</div>` : ''}`;
    el.querySelector('#trH').onclick = () => { S.trackOpen = !S.trackOpen; trackKey = ''; renderTracker(); sfx('click'); };
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { sfx('click'); misGo(MISSIONS.find(m => m.id === b.dataset.m)); });
  }
  if (!S.trackOpen) return;
  for (const m of list) {
    const b = el.querySelector(`[data-m="${m.id}"]`); if (!b) continue; const [c, t] = m.p(), cc = Math.min(c, t);
    b.querySelector('[data-pb]').style.width = clamp(c / t, 0, 1) * 100 + '%';
    b.querySelector('[data-pv]').textContent = m.u === 'k' ? `${money(cc * 1000)}/${money(t * 1000)}` : m.u === '%' ? `${cc}%/${t}%` : `${nf(cc)}/${nf(t)}`;
  }
}

/* ---------------- demand (RCI) ---------------- */
function demand(n) {
  const e = n.cap > 0 ? Math.max(0, (n.cap - n.pop) / n.cap) : 0, g = (n.jobs - n.workers) / Math.max(200, n.workers), u = n.unemp;
  let cj = 0, ij = 0; for (const b of n.list) { if (b.prog < 1) continue; const c = BT[b.type].c; if (c === 'com') cj += jobsOf(b); else if (c === 'ind') ij += jobsOf(b); }
  // with no housing at all (e.g. a Blank Slate start) people want homes first
  const R = n.cap <= 0 ? 0.8 : clamp(0.3 + g * 0.8 - e * 1.8 + (n.happy - 0.55) * 0.8, 0, 1);
  const Cm = clamp(0.25 + (n.pop * 0.3 - cj) / Math.max(300, n.pop * 0.3) * 0.6 + u * 1.5 - Math.max(0, g) * 0.3, 0, 1);
  const In = clamp(0.2 + (n.pop * 0.22 - ij) / Math.max(250, n.pop * 0.22) * 0.6 + u * 1.2 - Math.max(0, g) * 0.3, 0, 1);
  return [R, Cm, In];
}
const RCI_HTML = `<div class="tsep"></div><div class="rci" id="rci"><div><i></i><b>R</b></div><div><i></i><b>C</b></div><div><i></i><b>I</b></div><span class="tp"></span></div>`;
function renderRCI() {
  const el = $('#rci'); if (!el || !S.started) return; const v = demand(act());
  el.querySelectorAll('i').forEach((x, k) => x.style.height = Math.max(4, v[k] * 100) + '%');
  const tag = x => x > 0.66 ? 'high' : x > 0.33 ? 'medium' : 'low';
  el.querySelector('.tp').innerHTML = `<b>Demand</b>&nbsp; Residential ${tag(v[0])} · Commercial ${tag(v[1])} · Industrial ${tag(v[2])}`;
}

/* ---------------- data views ---------------- */
const OVL = [['hap', 'smile', 'Happiness'], ['land', 'coins', 'Land value'], ['edu', 'cap', 'Education'], ['health', 'heart', 'Health'], ['safety', 'shield', 'Safety'], ['fire', 'flame', 'Fire protection'], ['poll', 'factory', 'Pollution'], ['access', 'road', 'Access & utilities']];
const OC = { bad: new THREE.Color('#ff4d6a'), mid: new THREE.Color('#ffc53d'), good: new THREE.Color('#2ee6a0'), dim: new THREE.Color('#5d6878'), svc: new THREE.Color('#7dd3fc'), white: new THREE.Color('#ffffff') };
const _oc = new THREE.Color();
function ramp(v, out = _oc) { v = clamp(v, 0, 1); return v < 0.5 ? out.copy(OC.bad).lerp(OC.mid, v * 2) : out.copy(OC.mid).lerp(OC.good, (v - 0.5) * 2); }
function ovColor(b, mode) {
  const d = BT[b.type], n = nationOf(b);
  if (b.nid !== S.active || b.prog < 1) return OC.dim;
  if (mode === 'access') { if (d.road !== false && !b.conn) return OC.bad; if ((d.pw && n.pr < 0.999) || (d.wt && n.wr < 0.999)) return OC.mid; return OC.good; }
  if (d.c !== 'res') { if (mode === 'poll' && d.poll) return OC.bad; if (d.svc === mode) return OC.svc; return OC.dim; }
  if (mode === 'hap') return ramp(b.happy);
  if (mode === 'land') return ramp(b.lval ?? 0.5);
  if (mode === 'poll') return ramp(1 - b.poll * 2.5);
  return ramp(b.cov[mode] || 0);
}
function paintOverlay() { const mode = S.overlay, dm = S.dmgSet.size > 0; for (const p of pools.values()) { if (p.key.startsWith('road|') || p.key === 'rotor' || !p.n) continue; p.paint(e => mode ? ovColor(e, mode) : e.dmg ? DMGC : OC.white, !mode && !dm); } }
const ovFieldMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
function buildOvField() {
  if (W.ovMesh) { fxG.remove(W.ovMesh); W.ovMesh.geometry.dispose(); W.ovMesh = null; }
  const mode = S.overlay; if (!['edu', 'health', 'safety', 'fire', 'poll'].includes(mode)) return;
  const n = act(), F = new Float32Array(MAP * MAP);
  for (const b of n.list) {
    const d = BT[b.type]; if (b.prog < 1) continue; let r;
    if (mode === 'poll') { if (!d.poll) continue; r = 8; } else { if (d.svc !== mode || (d.road !== false && !b.conn)) continue; r = d.r; }
    const cx = b.x + b.s / 2, cz = b.z + b.s / 2;
    for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (!inb(x, z)) continue; const dist = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (dist > r) continue; const i = ix(x, z);
      if (mode === 'poll') F[i] += d.poll * (1 - dist / 8) * 0.055; else F[i] = Math.max(F[i], Math.min(1, (1 - dist / r * 0.45) * (d.sv || 1)));
    }
  }
  const P = [], Cc = [];
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const i = ix(x, z); if (owner[i] !== n.id || terr[i] < 2 || terr[i] === T.MTN) continue;
    let v = F[i], a;
    if (mode === 'poll') { if (v < 0.03) continue; v = clamp(v, 0, 1); ramp(1 - v); a = 0.22 + v * 0.45; } else if (v > 0) { ramp(v); a = 0.42; } else { _oc.copy(OC.bad); a = 0.16; }
    const x0 = x - HALF, z0 = z - HALF, y = 0.12;
    P.push(x0, y, z0, x0, y, z0 + 1, x0 + 1, y, z0, x0 + 1, y, z0, x0, y, z0 + 1, x0 + 1, y, z0 + 1);
    for (let k = 0; k < 6; k++) Cc.push(_oc.r, _oc.g, _oc.b, a);
  }
  if (!P.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 4));
  W.ovMesh = new THREE.Mesh(g, ovFieldMat); W.ovMesh.renderOrder = 4; fxG.add(W.ovMesh);
}
function setOverlay(mode) {
  S.overlay = S.overlay === mode ? null : mode; paintOverlay(); buildOvField(); renderMMBar(); renderLegend(); renderDPop(); updateProblems();
  if (S.overlay) toast(`Data map: ${OVL.find(o => o[0] === S.overlay)[2]}`, 'Click again or press Esc to close', 'info', 'scan');
}
function renderDPop() {
  const el = $('#dpop'); if (!el) return;
  el.innerHTML = OVL.map(o => `<button data-o="${o[0]}" class="${S.overlay === o[0] ? 'on' : ''}">${ico(o[1])}${o[2]}</button>`).join('') + (S.overlay ? `<button data-o="off">${ico('x')}Close data map</button>` : '');
  el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { sfx('click'); el.classList.add('hidden'); if (b.dataset.o === 'off') setOverlay(S.overlay); else setOverlay(b.dataset.o); });
}
function renderLegend() {
  const el = $('#ovLeg'); if (!el) return; const m = S.overlay; if (!m) { el.classList.add('hidden'); return; }
  const o = OVL.find(x => x[0] === m), L = m === 'poll' ? ['Polluted', 'Clean'] : m === 'access' ? ['No road', 'Normal'] : m === 'land' ? ['Low', 'High'] : ['Poor', 'Good'];
  el.innerHTML = `<b>Data map · ${o[2]}</b><div class="lg"><span>${L[0]}</span><i></i><span>${L[1]}</span></div>`; el.classList.remove('hidden');
}

/* ---------------- problem markers ---------------- */
const probTexC = {}, probSpr = [];
function probTex(kind) {
  if (probTexC[kind]) return probTexC[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d'), col = { road: '#fb7185', power: '#fbbf24', water: '#38bdf8', dmg: '#fb923c' }[kind];
  x.beginPath(); x.moveTo(36, 70); x.lineTo(48, 90); x.lineTo(60, 70); x.fillStyle = col; x.fill();
  x.beginPath(); x.arc(48, 42, 34, 0, 7); x.fillStyle = 'rgba(8,16,30,.93)'; x.fill(); x.lineWidth = 5; x.strokeStyle = col; x.stroke();
  const ds = (I[{ road: 'road', power: 'bolt', water: 'drop', dmg: 'flame' }[kind]].match(/ d="([^"]+)"/g) || []).map(s => s.slice(4, -1));
  x.save(); x.translate(48 - 19.2, 42 - 19.2); x.scale(1.6, 1.6); x.strokeStyle = '#fff'; x.lineWidth = 2.3; x.lineCap = 'round'; x.lineJoin = 'round'; for (const d of ds) x.stroke(new Path2D(d)); x.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return probTexC[kind] = t;
}
function updateProblems() {
  let k = 0;
  if (S.started && cam.dist < 100 && !S.overlay) {
    const n = act();
    for (const b of n.list) {
      if (b.prog < 1) continue; const d = BT[b.type]; let kind = null;
      if (b.dmg) kind = 'dmg'; else if (d.road !== false && !b.conn) kind = 'road'; else if (d.pw && n.pr < 0.999) kind = 'power'; else if (d.wt && n.wr < 0.999) kind = 'water';
      if (!kind) continue;
      let sp = probSpr[k]; if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: probTex(kind), depthTest: false, transparent: true, toneMapped: false })); sp.renderOrder = 12; fxG.add(sp); probSpr[k] = sp; }
      if (sp.material.map !== probTex(kind)) sp.material.map = probTex(kind);
      const bb = geoSet(bKey(b)).body.boundingBox; sp.userData.y = bb.max.y + 0.42; sp.userData.ph = k;
      sp.position.set(b.x + b.s / 2 - HALF, sp.userData.y, b.z + b.s / 2 - HALF); sp.scale.setScalar(0.8 + b.s * 0.1); sp.visible = true;
      if (++k >= 180) break;
    }
  }
  for (let j = k; j < probSpr.length; j++) probSpr[j].visible = false;
}
function bobProblems(t) { for (const sp of probSpr) if (sp.visible) sp.position.y = sp.userData.y + Math.sin(t * 3 + sp.userData.ph) * 0.06; }

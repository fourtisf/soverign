
/* =====================================================================
   WORLD OBJECTS · PLACEMENT
   ===================================================================== */
S.building = []; S.winds = []; S.emitters = [];
const roadEnt = new Map();
const isRoad = (x, z) => inb(x, z) && road[ix(x, z)] === 1;
const nationOf = b => S.nations[b.nid];
const act = () => S.nations[S.active];
function markAllDirty() { for (const n of S.nations) n.dirty = true; }
function capOf(b) { return (BT[b.type].cap || 0) * LVM[b.level - 1] * (nationOf(b).pol.housing ? 1.15 : 1); }
function jobsOf(b) { return (BT[b.type].jobs || 0) * LVM[b.level - 1]; }
function touchesRoad(x, z, s) { for (let k = 0; k < s; k++) if (isRoad(x + k, z - 1) || isRoad(x + k, z + s) || isRoad(x - 1, z + k) || isRoad(x + s, z + k)) return true; return false; }
function faceRoad(x, z, s) {
  const sc = [0, 0, 0, 0];
  for (let k = 0; k < s; k++) { if (isRoad(x + k, z + s)) sc[0]++; if (isRoad(x + s, z + k)) sc[1]++; if (isRoad(x + k, z - 1)) sc[2]++; if (isRoad(x - 1, z + k)) sc[3]++; }
  let best = -1, bv = 0; for (let r = 0; r < 4; r++) if (sc[r] > bv) { bv = sc[r]; best = r; } return best;
}
function portRot(x, z, s) {
  const w = (X, Z) => inb(X, Z) && terr[ix(X, Z)] <= 1 ? 1 : 0, sc = [0, 0, 0, 0];
  for (let k = 0; k < s; k++) { sc[0] += w(x + k, z + s); sc[1] += w(x + s, z + k); sc[2] += w(x + k, z - 1); sc[3] += w(x - 1, z + k); }
  let best = -1, bv = 0; for (let r = 0; r < 4; r++) if (sc[r] > bv) { bv = sc[r]; best = r; } return best;
}
function checkSite(type, x, z, n, free) {
  const d = BT[type], s = d.s; let hill = 0;
  if (!free) {
    if (d.nobuild) return 'Tidak dapat dibangun';
    if (d.unlock && n.pop < d.unlock) return `Terkunci · butuh ${fmtPop(d.unlock)} penduduk`;
    if (d.uniq && n.list.some(b => b.type === type)) return 'Hanya satu per negara';
  }
  for (let dz = 0; dz < s; dz++) for (let dx = 0; dx < s; dx++) {
    const X = x + dx, Z = z + dz; if (!inb(X, Z)) return 'Di luar peta';
    const i = ix(X, Z), t = terr[i];
    if (owner[i] !== n.id) return 'Bukan wilayah negaramu';
    if (t <= 1) return 'Tidak bisa di atas air'; if (t === T.MTN) return 'Medan pegunungan';
    if (road[i]) return 'Ada jalan di sini'; if (tileB[i]) return 'Lahan sudah terpakai'; if (t === T.HILL) hill++;
  }
  if (d.needs === 'hill' && hill < Math.ceil(s * s / 2)) return 'Harus di perbukitan';
  if (d.needs === 'coast' && portRot(x, z, s) < 0) return 'Harus menempel laut';
  return null;
}
function siteCost(type, x, z) { const d = BT[type]; let c = d.cost; for (let dz = 0; dz < d.s; dz++) for (let dx = 0; dx < d.s; dx++) if (W.treeAt.has(ix(x + dx, z + dz))) c += 1500; return c; }
const easeOut = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function bMatrix(b, sy) { _p.set(b.x + b.s / 2 - HALF, 0, b.z + b.s / 2 - HALF); _q.setFromAxisAngle(_up, b.rot * Math.PI / 2); _s.set(1, Math.max(0.02, sy), 1); return _m.compose(_p, _q, _s); }
function bKey(b) { return `${b.type}|${b.level}|${b.v}|${FLAGGED.has(b.type) ? nationOf(b).color : ''}`; }
function rotLocal(b, lx, lz) { const a = b.rot * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); return [b.x + b.s / 2 - HALF + c * lx + s * lz, b.z + b.s / 2 - HALF - s * lx + c * lz]; }
function attachVisual(b) { poolFor(bKey(b)).add(b, bMatrix(b, b.vis < 1 ? easeOut(Math.max(0.02, b.vis)) : 1)); }
function placeBuilding(type, x, z, n, o = {}) {
  const d = BT[type];
  let rot = o.rot; if (rot == null) { const f = faceRoad(x, z, d.s); rot = f >= 0 ? f : 0; }
  if (type === 'port') { const r = portRot(x, z, d.s); rot = r < 0 ? 0 : r; }
  const b = { id: S.nextId++, type, x, z, s: d.s, rot, nid: n.id, level: o.level || 1, v: o.v ?? Math.floor(Math.random() * (VARS[type] || 1)), prog: o.instant ? 1 : 0, vis: o.instant ? 1 : 0, occ: o.occ || 0, happy: 0.6, conn: false, active: false, cov: { edu: 0, health: 0, safety: 0, fire: 0, park: 0, land: 0 }, poll: 0 };
  for (let dz = 0; dz < d.s; dz++) for (let dx = 0; dx < d.s; dx++) { const i = ix(x + dx, z + dz); tileB[i] = b.id; clearTrees(i); }
  S.blds.set(b.id, b); n.list.push(b); attachVisual(b); S.zoneDirty = true;
  if (b.prog >= 1) finishBuilding(b, true); else S.building.push(b);
  markAllDirty(); return b;
}
function finishBuilding(b, silent) {
  b.prog = 1; b.vis = 1; if (b._pool) b._pool.set(b, bMatrix(b, 1));
  if (b.type === 'wind' && !b.rotor) { b.rotor = {}; b.rotA = Math.random() * 6; poolFor('rotor').add(b.rotor, _m.identity()); S.winds.push(b); }
  const em = EMIT[b.type]; if (em) for (const e of em) { const [wx, wz] = rotLocal(b, e[0], e[2]); S.emitters.push({ b, x: wx, y: e[1], z: wz, k: e[3], acc: Math.random() }); }
  markAllDirty();
  if (!silent) {
    const [cx, cz] = rotLocal(b, 0, 0); for (let k = 0; k < 14; k++) emitP(cx + (Math.random() - 0.5) * b.s, 0.1, cz + (Math.random() - 0.5) * b.s, { vx: (Math.random() - 0.5) * 0.6, vy: 0.3 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.6, max: 1.4, s0: 0.5, s1: 1.6, a0: 0.55, c: [0.85, 0.78, 0.66] });
    if (nationOf(b).ai) return;
    sfx('done');
    const d = BT[b.type]; if (d.c === 'lm') relieve(nationOf(b), 6);
    if (d.cost >= 1e6 || d.c === 'lm') { toast(`${d.n} selesai dibangun`, nationOf(b).name, 'gold', 'sparkle'); addNews(`${d.n} resmi beroperasi di ${nationOf(b).name}.`); }
  }
}
function removeBuilding(b) {
  if (b._pool) b._pool.remove(b);
  if (b.rotor) { b.rotor._pool.remove(b.rotor); b.rotor = null; S.winds = S.winds.filter(w => w !== b); }
  S.emitters = S.emitters.filter(e => e.b !== b); S.building = S.building.filter(x => x !== b);
  for (let dz = 0; dz < b.s; dz++) for (let dx = 0; dx < b.s; dx++) { const i = ix(b.x + dx, b.z + dz); if (tileB[i] === b.id) tileB[i] = 0; }
  S.blds.delete(b.id); S.dmgSet.delete(b); S.zoneDirty = true; const n = nationOf(b); const k = n.list.indexOf(b); if (k >= 0) n.list.splice(k, 1);
  markAllDirty(); if (S.selected && S.selected.b === b) closeInfo();
}
function upgradeCost(b) { return Math.round(BT[b.type].cost * LVC[b.level]); }
function upgradeBuilding(b) {
  const d = BT[b.type], n = nationOf(b); if (b.level >= (d.lv || 1) || b.prog < 1 || b.dmg) return;
  const c = upgradeCost(b); if (n.treasury < c) { toast('Dana tidak cukup', `Butuh ${money(c)}`, 'bad', 'alert'); sfx('error'); return; }
  n.treasury -= c; b._pool.remove(b); S.emitters = S.emitters.filter(e => e.b !== b);
  b.level++; b.vis = 0.3; b.upg = true; attachVisual(b); S.building.push(b);
  if (!n.ai) bump('up'); sfx('build'); markAllDirty(); addNews(`${d.n} ditingkatkan ke level ${b.level}.`);
}
function animBuildings(dt) {
  const sp = S.paused ? 0 : S.speed;
  for (let k = S.building.length - 1; k >= 0; k--) {
    const b = S.building[k], d = BT[b.type];
    if (b.prog < 1) { b.prog = Math.min(1, b.prog + dt * sp / (DAY_SEC * (d.days || 2))); b.vis = b.prog; }
    else b.vis = Math.min(1, b.vis + dt * sp / (DAY_SEC * 2));
    if (b._pool) b._pool.set(b, bMatrix(b, easeOut(Math.max(0.02, b.vis))));
    if (b.vis >= 1) { S.building.splice(k, 1); if (b.upg) { b.upg = false; finishBuilding(b, true); if (!nationOf(b).ai) sfx('done'); } else finishBuilding(b, false); }
  }
}
/* ---------------- roads ---------------- */
function roadMask(i) { const x = i % MAP, z = (i / MAP) | 0; let m = 0; for (let d = 0; d < 4; d++) if (isRoad(x + DIRS[d][0], z + DIRS[d][1])) m |= 1 << d; return m; }
function refreshRoad(i) {
  let e = roadEnt.get(i);
  if (!road[i]) { if (e) { e._pool.remove(e); roadEnt.delete(i); } return; }
  const key = 'road|' + roadMask(i) + (terr[i] <= 1 ? 'b' : '');
  if (e && e.key === key) return; if (e) e._pool.remove(e); else e = { i };
  e.key = key; const x = i % MAP, z = (i / MAP) | 0;
  poolFor(key, { cast: terr[i] <= 1 }).add(e, _m.makeTranslation(x - HALF + 0.5, 0, z - HALF + 0.5)); roadEnt.set(i, e);
}
function placeRoad(i) {
  if (road[i]) return; road[i] = 1; S.roadSet.add(i); clearTrees(i); refreshRoad(i);
  const x = i % MAP, z = (i / MAP) | 0; for (const [dx, dz] of DIRS) if (inb(x + dx, z + dz)) refreshRoad(ix(x + dx, z + dz));
  markAllDirty(); carsDirty = true; S.zoneDirty = true;
}
function removeRoad(i) {
  if (!road[i]) return; road[i] = 0; S.roadSet.delete(i); refreshRoad(i);
  const x = i % MAP, z = (i / MAP) | 0; for (const [dx, dz] of DIRS) if (inb(x + dx, z + dz)) refreshRoad(ix(x + dx, z + dz));
  markAllDirty(); carsDirty = true;
}
function roadCostAt(i) { const t = terr[i]; return t === T.DEEP ? BRIDGE_COST[0] : t === T.SHALLOW ? BRIDGE_COST[1] : ROAD_COST + (W.treeAt.has(i) ? 500 : 0); }
function roadOK(i, n) { return owner[i] === n.id && terr[i] !== T.MTN && !tileB[i] && !road[i]; }

/* ---------------- cars ---------------- */
const CAR_CAP = 520; let carMesh, carLit, cars = [], carsDirty = true;
function initCars() {
  const gs = carGeo(); carMesh = new THREE.InstancedMesh(gs.body, matBody, CAR_CAP); carLit = new THREE.InstancedMesh(gs.lit, matLit, CAR_CAP);
  carMesh.count = carLit.count = 0; carMesh.castShadow = true; carMesh.frustumCulled = carLit.frustumCulled = false;
  const pal = ['#e8ecf1', '#2b2f36', '#c0392b', '#2e6fd8', '#f1c40f', '#8a949c', '#16a085', '#f4f6f8', '#34495e', '#e67e22', '#9b59b6', '#ffffff'];
  const c = new THREE.Color(); for (let i = 0; i < CAR_CAP; i++) carMesh.setColorAt(i, c.set(pal[i % pal.length]));
  fxG.add(carMesh, carLit);
}
function roadNbrs(i) { const x = i % MAP, z = (i / MAP) | 0, r = []; for (const [dx, dz] of DIRS) if (isRoad(x + dx, z + dz)) r.push(ix(x + dx, z + dz)); return r; }
function pickNext(p, c) { const nb = roadNbrs(c).filter(i => i !== p); return nb.length ? nb[Math.floor(Math.random() * nb.length)] : p; }
function spawnCar(arr) { for (let t = 0; t < 12; t++) { const c = arr[Math.floor(Math.random() * arr.length)]; const nb = roadNbrs(c); if (!nb.length) continue; const p = nb[Math.floor(Math.random() * nb.length)]; return { p, c, n: pickNext(p, c), t: Math.random(), sp: 0.8 + Math.random() * 0.7, yaw: 0 }; } return null; }
const cxw = i => i % MAP - HALF + 0.5, czw = i => ((i / MAP) | 0) - HALF + 0.5;
function updateCars(dt) {
  if (carsDirty) {
    carsDirty = false; const target = Math.min(CAR_CAP, Math.floor(S.roadSet.size * 0.3)); const arr = [...S.roadSet];
    cars = cars.filter(k => road[k.c] && road[k.p] && road[k.n]); if (cars.length > target) cars.length = target;
    while (cars.length < target) { const k = spawnCar(arr); if (!k) break; cars.push(k); }
  }
  const sp = S.paused ? 0 : Math.min(S.speed, 2.5);
  for (let j = 0; j < cars.length; j++) {
    const k = cars[j]; k.t += dt * k.sp * sp;
    while (k.t >= 1) { k.t -= 1; k.p = k.c; k.c = k.n; k.n = pickNext(k.p, k.c); if (!road[k.c] || !road[k.n]) { k.t = 0; break; } }
    const cx = cxw(k.c), cz = czw(k.c), ax = (cxw(k.p) + cx) / 2, az = (czw(k.p) + cz) / 2;
    let bx = (cxw(k.n) + cx) / 2, bz = (czw(k.n) + cz) / 2; const t = k.t, u = 1 - t;
    const px = u * u * ax + 2 * u * t * cx + t * t * bx, pz = u * u * az + 2 * u * t * cz + t * t * bz;
    let tx = 2 * u * (cx - ax) + 2 * t * (bx - cx), tz = 2 * u * (cz - az) + 2 * t * (bz - cz); const l = Math.hypot(tx, tz);
    if (l > 1e-4) { tx /= l; tz /= l; k.yaw = Math.atan2(tx, tz); } else { tx = Math.sin(k.yaw); tz = Math.cos(k.yaw); }
    _p.set(px + tz * 0.17, 0.03, pz - tx * 0.17); _q.setFromAxisAngle(_up, k.yaw); _s.set(1, 1, 1); _m.compose(_p, _q, _s);
    carMesh.setMatrixAt(j, _m); carLit.setMatrixAt(j, _m);
  }
  carMesh.count = carLit.count = cars.length; carMesh.instanceMatrix.needsUpdate = carLit.instanceMatrix.needsUpdate = true;
}
/* ---------------- particles ---------------- */
const PMAX = 1000, parts = new Array(PMAX); let pHead = 0, pMesh;
function initParticles() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(PMAX), 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(PMAX), 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(PMAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uScale: { value: 400 }, uLight: { value: 1 } },
    vertexShader: 'attribute float aSize; attribute float aAlpha; attribute vec3 aCol; varying float vA; varying vec3 vC; uniform float uScale; void main(){ vA=aAlpha; vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uScale/max(0.5,-mv.z); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying float vA; varying vec3 vC; uniform float uLight; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.05,d)*vA; if(a<0.01) discard; gl_FragColor=vec4(vC*uLight,a); }'
  });
  pMesh = new THREE.Points(g, m); pMesh.frustumCulled = false; pMesh.renderOrder = 6; fxG.add(pMesh);
}
function emitP(x, y, z, o) { parts[pHead] = { x, y, z, vx: o.vx, vy: o.vy, vz: o.vz, life: 0, max: o.max, s0: o.s0, s1: o.s1, a0: o.a0, c: o.c }; pHead = (pHead + 1) % PMAX; }
function updateParticles(dt) {
  const sp = S.paused ? 0.15 : Math.min(2, S.speed);
  for (const e of S.emitters) {
    e.acc += dt * sp * (e.k ? 2.2 : 3);
    while (e.acc >= 1) { e.acc -= 1; emitP(e.x + (Math.random() - 0.5) * 0.06, e.y, e.z + (Math.random() - 0.5) * 0.06, e.k ? { vx: 0.12, vy: 0.55, vz: 0.04, max: 3.2, s0: 0.7, s1: 2.6, a0: 0.55, c: [0.97, 0.98, 1] } : { vx: 0.18, vy: 0.45, vz: 0.05, max: 3.6, s0: 0.35, s1: 1.9, a0: 0.5, c: [0.62, 0.64, 0.68] }); }
  }
  const P = pMesh.geometry.attributes.position.array, Sz = pMesh.geometry.attributes.aSize.array, A = pMesh.geometry.attributes.aAlpha.array, Cc = pMesh.geometry.attributes.aCol.array;
  for (let i = 0; i < PMAX; i++) {
    const p = parts[i]; if (!p || p.life >= p.max) { A[i] = 0; continue; }
    p.life += dt * Math.max(0.3, sp); const t = p.life / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt * (1 - t * 0.5); p.z += p.vz * dt;
    P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z; Sz[i] = lerp(p.s0, p.s1, t); A[i] = p.a0 * (1 - t) * Math.min(1, t * 8);
    Cc[i * 3] = p.c[0]; Cc[i * 3 + 1] = p.c[1]; Cc[i * 3 + 2] = p.c[2];
  }
  for (const k of ['position', 'aSize', 'aAlpha', 'aCol']) pMesh.geometry.attributes[k].needsUpdate = true;
}

/* =====================================================================
   NATIONS · SIMULATION
   ===================================================================== */
function makeNation(o) {
  return Object.assign({
    id: S.nations.length, name: '', color: '#22d3ee', flag2: '#f3f5f8', fstyle: 0, ai: false, leader: '', treasury: 0, tax: 10,
    capital: { x: 0, z: 0 }, list: [], pop: 0, cap: 0, happy: 0.6, approval: 62, apprMod: 0, workers: 0, jobs: 0, employed: 0, fill: 0, unemp: 0,
    ps: 0, pd: 0, ws: 0, wd: 0, pr: 1, wr: 1, roads: 0, tiles: 0, rate: { inc: {}, exp: {}, net: 0 }, acc: { inc: {}, exp: {} }, last: null, hist: [],
    pol: {}, loans: [], ms: 0, trades: [], allied: false, rel: 50, dirty: true, radius: 12, founded: S.day, popM: 0,
    dem: 0, debtM: 0, lowM: 0, coalUsed: 0, mods: [], pers: null, sanc: 0, cong: 0, imfDay: -9999
  }, o);
}
function spotScore(cx, cz, r) {
  let s = 0;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dz * dz > r * r) continue; const x = cx + dx, z = cz + dz; if (!inb(x, z)) { s -= 2; continue; }
    const i = ix(x, z), t = terr[i]; if (owner[i] >= 0) { s -= 4; continue; }
    s += t === T.GRASS || t === T.SAND ? 1 : t === T.FOREST ? 0.8 : t === T.HILL ? 0.5 : t === T.MTN ? -1 : -0.6;
  }
  return s;
}
function findCapital(minDist, region) {
  let best = null, bs = -1e9;
  for (let z = 14; z < MAP - 14; z += 2) for (let x = 14; x < MAP - 14; x += 2) {
    if (region && (Math.abs(x - HALF) > region || Math.abs(z - HALF) > region)) continue;
    const t = terr[ix(x, z)]; if ((t !== T.GRASS && t !== T.FOREST) || owner[ix(x, z)] >= 0) continue;
    if (S.nations.some(n => Math.hypot(n.capital.x - x, n.capital.z - z) < minDist)) continue;
    const sc = spotScore(x, z, 9) + Math.random() * 4; if (sc > bs) { bs = sc; best = { x, z }; }
  }
  return best;
}
function claimCircle(n, cx, cz, r) {
  let c = 0;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dz * dz > r * r + r * 0.6) continue; const x = cx + dx, z = cz + dz; if (!inb(x, z)) continue;
    const i = ix(x, z); if (owner[i] === -1) { owner[i] = n.id; c++; }
  }
  n.tiles += c; S.terrDirty = true; return c;
}
function nearestSpot(n, type, cx, cz, R = 16) {
  const d = BT[type], s = d.s, outer = ['solar', 'wind', 'farm', 'coal', 'factory', 'mine'].includes(type);
  let best = null, bd = 1e9;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, z = cz + dz, dist = Math.hypot(dx + s / 2 - 0.5, dz + s / 2 - 0.5);
    const sc = outer ? Math.abs(dist - 8) : dist; if (sc >= bd) continue;
    if (checkSite(type, x, z, n, true)) continue;
    if (d.road !== false && !touchesRoad(x, z, s)) continue;
    bd = sc; best = { x, z };
  }
  return best;
}
function starterCity(n, full) {
  const cx = n.capital.x, cz = n.capital.z, R = full ? 9 : 5;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (dx % 4 !== 0 && dz % 4 !== 0) continue; if (dx * dx + dz * dz > R * R + 3) continue;
    const x = cx + dx, z = cz + dz; if (!inb(x, z)) continue; const i = ix(x, z);
    if (owner[i] === n.id && terr[i] >= 2 && terr[i] !== T.MTN && !tileB[i]) placeRoad(i);
  }
  let pal = null; for (const [ox, oz] of [[-3, -3], [1, -3], [-3, 1], [1, 1]]) if (!checkSite('palace', cx + ox, cz + oz, n, true)) { pal = { x: cx + ox, z: cz + oz }; break; }
  if (!pal) pal = nearestSpot(n, 'palace', cx, cz, 12);
  if (pal) placeBuilding('palace', pal.x, pal.z, n, { instant: true, v: 0 });
  const items = full
    ? ['school', 'clinic', 'police', 'watertower', 'watertower', 'solar', 'wind', 'wind', 'wind', 'park', 'park', 'apartment', 'apartment', 'apartment', 'apartment', 'shop', 'shop', 'shop', 'shop', 'shop', ...Array(16).fill('house'), 'farm', 'fire']
    : ['watertower', 'wind', 'wind', 'park', 'shop', 'shop', ...Array(6).fill('house')];
  for (const t of items) { const sp = nearestSpot(n, t, cx, cz, R + 4); if (sp) placeBuilding(t, sp.x, sp.z, n, { instant: true }); }
  for (const b of n.list) if (BT[b.type].c === 'res') { b.occ = capOf(b) * 0.55; b.happy = 0.62; }
  n.dirty = true; recalcNation(n);
}
function recalcNation(n) {
  n.dirty = false;
  for (const b of n.list) b.conn = touchesRoad(b.x, b.z, b.s);
  const res = [], src = [];
  for (const b of n.list) { const d = BT[b.type]; if (d.c === 'res') res.push(b); if (b.prog >= 1 && !b.dmg && (d.svc || d.hap || d.poll) && (d.road === false || b.conn)) src.push(b); }
  for (const r of res) {
    const cv = { edu: 0, health: 0, safety: 0, fire: 0, park: 0, land: 0 }; let poll = 0; const rx = r.x + r.s / 2, rz = r.z + r.s / 2;
    for (const s of src) {
      const d = BT[s.type], dist = Math.hypot(s.x + s.s / 2 - rx, s.z + s.s / 2 - rz);
      if (d.svc && dist <= d.r) cv[d.svc] = Math.max(cv[d.svc], Math.min(1, (1 - dist / d.r * 0.45) * (d.sv || 1)));
      if (d.hap && dist <= d.r) { const v = d.hap * (1 - dist / d.r * 0.5); if (d.c === 'lm' || d.c === 'gov') cv.land += v; else cv.park += v; }
      if (d.poll && dist < 8) poll += d.poll * (1 - dist / 8) * 0.022;
    }
    r.cov = cv; r.poll = Math.min(0.5, poll); r.lval = landValue(r);
  }
  let rc = 0; for (const i of S.roadSet) if (owner[i] === n.id) rc++; n.roads = rc;
}
const sumObj = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
function simNation(n) {
  if (n.dirty) recalcNation(n);
  const M = natMods(n);
  let ps = 0, pd = 0, ws = 0, wd = 0, jobs = 0;
  for (const b of n.list) {
    if (b.prog < 1) continue; const d = BT[b.type]; b.active = (d.road === false || b.conn) && !b.dmg; if (!b.active) continue;
    const lu = LVU[b.level - 1]; ps += d.pgen || 0; ws += d.wgen || 0; pd += (d.pw || 0) * lu; wd += (d.wt || 0) * lu; jobs += jobsOf(b);
  }
  const pr = pd > 0 ? Math.min(1, ps / pd) : 1, wr = wd > 0 ? Math.min(1, ws / wd) : 1;
  Object.assign(n, { ps, pd, ws, wd, pr, wr });
  const u = n.workers > 0 ? Math.max(0, (n.workers - n.jobs) / n.workers) : 0; n.unemp = u;
  const taxPen = n.tax > 10 ? (n.tax - 10) * 0.028 : -(10 - n.tax) * 0.01;
  const polH = (n.pol.health ? 0.09 : 0) - (n.pol.sez ? 0.03 : 0);
  let pop = 0, hs = 0, cap = 0, taxBase = 0;
  for (const b of n.list) {
    const d = BT[b.type]; if (d.c !== 'res' || b.prog < 1) continue;
    const Cp = capOf(b); cap += Cp;
    if (!b.active) { b.occ *= 0.96; b.happy += (0.15 - b.happy) * 0.1; }
    else {
      const cv = b.cov;
      let h = 0.4 + cv.edu * (n.pol.edu ? 0.2 : 0.12) + cv.health * 0.13 + cv.safety * 0.11 + cv.fire * 0.06 + Math.min(0.22, cv.park) + Math.min(0.2, cv.land)
        - b.poll * (n.pol.green ? 0.4 : 1) - taxPen - (1 - pr) * 0.4 - (1 - wr) * 0.4 + polH + M.hap;
      h = clamp(h, 0, 1); b.happy += (h - b.happy) * 0.12;
      const tgt = Cp * clamp(0.18 + 0.9 * b.happy - u * 0.7, 0.04, 1);
      b.occ = clamp(b.occ + (tgt - b.occ) * 0.045, 0, Cp);
    }
    pop += b.occ; hs += b.happy * b.occ; taxBase += b.occ * (d.taxm || 1) * (0.7 + 0.5 * (b.lval ?? 0.6));
  }
  n.pop = pop; n.cap = cap; n.happy = pop > 0 ? hs / pop : 0.5;
  n.workers = pop * 0.55; n.jobs = jobs; n.employed = Math.min(n.workers, jobs); const fill = jobs > 0 ? n.employed / jobs : 0; n.fill = fill;
  n.cong = n.roads > 0 ? n.employed / (n.roads * 220 * (n.pol.transit ? 2 : 1)) : 0;
  const tf = n.tax / 10; let com = 0, ind = 0, tour = 0, trade = 0, upk = 0, air = false, appr = 0;
  for (const b of n.list) {
    const d = BT[b.type]; if (b.prog < 1) continue; upk += (d.up || 0) * LVU[b.level - 1]; if (!b.active) continue;
    if (d.rev) { const r = jobsOf(b) * fill * d.rev * tf * (0.4 + 0.6 * pr) * (n.pol.sez ? 1.2 : 1); if (d.c === 'ind') ind += r; else com += r; }
    if (d.tour) tour += d.tour; if (d.trade) trade += d.trade; if (d.tourm) air = true; if (d.appr) appr += d.appr;
  }
  com *= M.com; ind *= M.ind;
  tour *= (0.6 + n.happy * 0.8) * (air ? 1.5 : 1) * (n.pol.tour ? 1.4 : 1) * M.tour;
  for (const id of n.trades) { const a = S.nations[id]; if (a) trade += Math.sqrt(Math.max(1, n.pop) * Math.max(1, a.pop)) * 9 * ((a.allied || n.allied) ? 1.3 : 1); }
  trade *= M.trade; upk = (upk + n.roads * 25) * M.upk;
  let polc = 0; for (const k in n.pol) if (n.pol[k]) polc += POL[k].cost(n);
  let loan = 0; for (const L of n.loans) loan += L.pay;
  const taxI = taxBase * 3.5 * n.tax * M.tax;
  const inc = { tax: taxI, com, ind, tour, trade }, exp = { upk, pol: polc, loan };
  n.rate = { inc, exp, net: taxI + com + ind + tour + trade - upk - polc - loan };
  n.treasury += n.rate.net / 30;
  for (const k in inc) n.acc.inc[k] = (n.acc.inc[k] || 0) + inc[k] / 30; for (const k in exp) n.acc.exp[k] = (n.acc.exp[k] || 0) + exp[k] / 30;
  const tgtA = clamp(n.happy * 64 + (1 - u) * 22 + (n.treasury >= 0 ? 10 : -12) + n.apprMod + appr + (n.allied ? 2 : 0) + M.appr - (n.dem || 0), 0, 100);
  n.approval += (tgtA - n.approval) * 0.035; n.apprMod *= 0.993;
  if (!n.ai && n.id === S.active && S.started && S.day > 3) {
    const lp = n.pr < 0.999, lw = n.wr < 0.999;
    if (lp && !n.wP) toast('Listrik tidak cukup!', 'Bangun Ladang Surya, Turbin Angin atau PLTU', 'wa', 'bolt'); n.wP = lp;
    if (lw && !n.wW) toast('Air bersih tidak cukup!', 'Bangun Menara Air atau Instalasi Air', 'wa', 'drop'); n.wW = lw;
  }
  if (!n.ai) {
    while (n.ms < MILESTONES.length && n.pop >= MILESTONES[n.ms][0]) {
      const [p, g] = MILESTONES[n.ms++]; n.treasury += g; relieve(n, 10);
      toast(`Tonggak ${fmtPop(p)} penduduk!`, `Hibah pembangunan ${money(g)} · bangunan baru terbuka`, 'gold', 'sparkle'); sfx('coin'); addNews(`${n.name} mencapai ${fmtPop(p)} penduduk.`);
      if (n.id === S.active) refreshDrawer();
    }
  }
}
function simDay() {
  S.day++;
  for (const n of S.nations) simNation(n);
  for (const n of S.nations) if (n.ai && (S.day + n.id) % 2 === 0) aiAct(n);
  checkUnlocks(); checkMissions(); govDay();
  if (S.day % 30 === 0) monthEnd();
}
function monthEnd() {
  const m = Math.floor(S.day / 30);
  for (const n of S.nations) {
    n.last = { inc: { ...n.acc.inc }, exp: { ...n.acc.exp } }; n.acc = { inc: {}, exp: {} };
    n.hist.push({ m, t: n.treasury, p: n.pop, a: n.approval, i: sumObj(n.last.inc), e: sumObj(n.last.exp) }); if (n.hist.length > 240) n.hist.shift();
    for (const L of n.loans) L.left--; n.loans = n.loans.filter(L => L.left > 0);
    if (n.ai) { if (n.trades.length) n.rel = Math.min(100, n.rel + 0.4); n.rel += (persOf(n).rel - n.rel) * 0.01; if (m % persOf(n).exp === 0) aiExpand(n); }
    else {
      if (n.treasury < 0 && m % 2 === 0 && n.id === S.active) toast('Kas negara defisit!', 'Naikkan pajak, kurangi biaya, atau ambil pinjaman', 'bad', 'alert');
      const age = m - Math.floor(n.founded / 30); if (age > 0 && age % 60 === 0) election(n);
    }
  }
  govMonthEnd(m);
  const n = act();
  if (n && n.last) { const net = sumObj(n.last.inc) - sumObj(n.last.exp); floatText(n.capital.x + 0.5, 2.2, n.capital.z - 1.5, (net >= 0 ? '+' : '') + money(net), net < 0); if (net > 0) sfx('coin'); }
  saveGame(true);
}
function election(n) {
  const share = clamp(n.approval + (Math.random() - 0.5) * 10, 5, 95), win = share >= 47, D = dif();
  // Career rules: a lost vote can be rescued by a coalition only on easy, or once (normal) when the margin is small.
  const rescue = !win && (!career() || D.coal >= 99 || (share >= 40 && (n.coalUsed || 0) < D.coal));
  const lost = !win && !rescue;
  const html = `<p>Rakyat <b>${esc(n.name)}</b> telah memberikan suaranya dalam Pemilihan Umum.</p>
  <div class="grid2" style="margin-top:14px"><div class="box"><div class="lb">Suara untukmu</div><div class="vl ${win ? 'up' : 'dn'}">${share.toFixed(1).replace('.', ',')}%</div></div><div class="box"><div class="lb">Oposisi</div><div class="vl">${(100 - share).toFixed(1).replace('.', ',')}%</div></div></div>
  <p style="margin-top:14px">${win ? 'Selamat! Kamu terpilih kembali untuk periode 5 tahun berikutnya. Kepercayaan rakyat meningkat.'
      : rescue ? `Kamu kalah tipis — tapi koalisi parlemen menyelamatkan jabatanmu dengan syarat: dana kampanye 10% kas dibayarkan & program reformasi.${career() && D.coal < 99 ? ' <b>Koalisi darurat hanya bisa terjadi sekali.</b>' : ''}`
      : 'Oposisi menang telak. Tidak ada koalisi yang mau menyelamatkanmu.'}</p>`;
  if (win) { n.apprMod += 6; } else if (rescue) { n.treasury -= Math.max(0, n.treasury * 0.1); n.approval = 50; n.coalUsed = (n.coalUsed || 0) + 1; }
  addNews(`Pemilu ${n.name}: ${win ? 'Presiden terpilih kembali' : rescue ? 'koalisi darurat terbentuk' : 'oposisi menang'} (${share.toFixed(1)}%).`);
  queueModal(() => modal({ title: win ? 'Terpilih Kembali!' : 'Hasil Pemilu', sub: `Pemilu ${esc(n.name)}`, icon: 'vote', html, buttons: [{ l: 'Lanjutkan', pri: 1 }] }));
  if (lost) nationFails(n, 'election');
}

/* ---------------- AI ---------------- */
function nationRoads(n) { const r = []; for (const i of S.roadSet) if (owner[i] === n.id) r.push(i); return r; }
function aiAct(n) {
  if (n.treasury < 100e3) return;
  const R = Math.random; let type;
  if (n.treasury > 2e6 && R() < (n.pers === 'agresif' ? 0.22 : 0.16) && aiUpgrade(n)) return;
  if (n.pd > n.ps * 0.9) type = n.pop > 9000 && R() < 0.5 ? 'coal' : R() < 0.5 ? 'wind' : 'solar';
  else if (n.wd > n.ws * 0.9) type = n.pop > 16000 ? 'waterplant' : 'watertower';
  else if (R() < 0.2) { if (!aiRoad(n)) aiExpand(n); return; }
  else if (R() < 0.07 && n.pop > 1500) type = ['school', 'clinic', 'police', 'park', 'fire', 'park', 'plaza'][Math.floor(R() * 7)];
  else if (n.workers > n.jobs * 0.92) type = n.pop < 3000 ? 'shop' : R() < 0.35 ? 'factory' : n.pop > 7000 && R() < 0.4 ? 'mall' : n.pop > 22000 && R() < 0.3 ? 'office' : 'shop';
  else type = n.pop > 18000 && R() < 0.3 ? 'tower' : n.pop > 3000 && R() < 0.55 ? 'apartment' : 'house';
  const d = BT[type]; if ((d.unlock || 0) > n.pop * 1.3 || n.treasury < d.cost + 60e3) return;
  const sp = findSpot(n, type); if (!sp) { if (!aiRoad(n)) aiExpand(n); return; }
  n.treasury -= d.cost; placeBuilding(type, sp.x, sp.z, n, {});
}
function findSpot(n, type) {
  const s = BT[type].s, roads = nationRoads(n); if (!roads.length) return null;
  for (let t = 0; t < 50; t++) {
    const i = roads[Math.floor(Math.random() * roads.length)], rx = i % MAP, rz = (i / MAP) | 0, d = DIRS[Math.floor(Math.random() * 4)];
    let ox = d[0] === 1 ? rx + 1 : d[0] === -1 ? rx - s : rx - Math.floor(Math.random() * s);
    let oz = d[1] === 1 ? rz + 1 : d[1] === -1 ? rz - s : rz - Math.floor(Math.random() * s);
    if (!checkSite(type, ox, oz, n, true)) return { x: ox, z: oz };
  }
  return null;
}
function aiRoad(n) {
  const roads = nationRoads(n), cx = n.capital.x, cz = n.capital.z;
  for (let t = 0; t < 30; t++) {
    const i = roads[Math.floor(Math.random() * roads.length)]; if (i == null) return false;
    const x = i % MAP, z = (i / MAP) | 0, d = Math.floor(Math.random() * 4), [dx, dz] = DIRS[d];
    if (dx !== 0 && ((z - cz) % 4 + 4) % 4 !== 0) continue; if (dz !== 0 && ((x - cx) % 4 + 4) % 4 !== 0) continue;
    const L = []; let X = x + dx, Z = z + dz;
    for (let k = 0; k < 8; k++, X += dx, Z += dz) { if (!inb(X, Z)) break; const j = ix(X, Z); if (road[j]) break; if (!roadOK(j, n) || terr[j] <= 1) break; L.push(j); }
    if (L.length >= 2) { for (const j of L) placeRoad(j); n.treasury -= L.length * ROAD_COST; return true; }
  }
  return false;
}
function aiExpand(n) {
  if (n.tiles > persOf(n).cap) return;
  const cand = [];
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const i = ix(x, z); if (owner[i] !== -1) continue;
    let adj = false; for (const [dx, dz] of DIRS) if (inb(x + dx, z + dz) && owner[ix(x + dx, z + dz)] === n.id) adj = true;
    if (adj) cand.push([i, Math.hypot(x - n.capital.x, z - n.capital.z)]);
  }
  cand.sort((a, b) => a[1] - b[1]); const take = cand.slice(0, 50);
  for (const [i] of take) owner[i] = n.id; n.tiles += take.length; if (take.length) S.terrDirty = true;
}


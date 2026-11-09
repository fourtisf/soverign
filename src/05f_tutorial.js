/* =====================================================================
   TUTORIAL · guided first steps with highlights, progress and rewards
   ===================================================================== */
// Each step: title, text, target (selector to highlight), go (what "Show me" does),
// prog(base) → [current, needed] or done(base) → bool, and a cash reward.
const zoneCount = (z, n) => { let c = 0; for (let i = 0; i < MAP * MAP; i++) if (zone[i] === z && owner[i] === n.id) c++; return c; };
const builtSince = (base, ...types) => types.reduce((a, t) => a + cntB(t) - (base.b[t] || 0), 0);
const TUT = [
  { t: 'Look around', x: 'Move the camera: drag with the right mouse button (one finger on a phone), scroll or pinch to zoom, Q/E to rotate. Find a flat, open spot near your flag.',
    prog: b => [Math.min(1, Math.floor(Math.hypot(cam.gtx - b.cam.tx, cam.gtz - b.cam.tz) / 4 + Math.abs(cam.gdist - b.cam.dist) / 12 + Math.abs(cam.gyaw - b.cam.yaw) / 0.6)), 1], r: 50e3 },
  { t: 'Build roads', x: 'Everything needs road access. Open <b>Roads</b> (key 1), then click and drag on <b>your land</b> — the tinted area inside your border — to lay a straight road.', target: '#tools [data-c="road"]', go: () => { const c = act().capital; flyTo(c.x, c.z, 55); pickCat('road'); },
    prog: b => [S.cnt.road - b.road, 10], u: 'road tiles', r: 150e3 },
  { t: 'Clean water', x: 'Open <b>Power & Water</b> (key 5) and place a <b>Water Tower</b> touching a road.', target: '#tools [data-c="util"]', go: () => { pickCat('util'); setTool('build', 'watertower'); },
    prog: b => [builtSince(b, 'watertower', 'waterplant'), 1], r: 150e3 },
  { t: 'Electricity', x: 'Add power: place <b>2 Wind Turbines</b> (or a Solar Farm). Mix sources — solar drops on cloudy days.', target: '#tools [data-c="util"]', go: () => { pickCat('util'); setTool('build', 'wind'); },
    prog: b => [builtSince(b, 'wind', 'solar', 'coal'), 2], r: 200e3 },
  { t: 'Homes for citizens', x: 'Open <b>Zoning</b> (key Z), choose <b>Residential Zone</b> and drag along your road. Private builders will put up houses. (Or build Houses yourself from key 2.)', target: '#tools [data-c="zone"]', go: () => { pickCat('zone'); setTool('zone', 1); },
    prog: b => [Math.max(zoneCount(1, act()) - b.z1, builtSince(b, 'house', 'apartment') * 2), 8], u: 'tiles', r: 200e3 },
  { t: 'Jobs', x: 'Nobody moves in without work. Zone a strip as <b>Commercial Zone</b> (or build Shophouses from key 3).', target: '#tools [data-c="zone"]', go: () => { pickCat('zone'); setTool('zone', 2); },
    prog: b => [Math.max(zoneCount(2, act()) - b.z2, builtSince(b, 'shop') * 2), 6], u: 'tiles', r: 200e3 },
  { t: 'Let time run', x: 'Press <b>2× or 4×</b> speed (top right) and watch builders work and citizens move in. Reach <b>50 citizens</b>.', target: '#timebox .spd',
    prog: b => [Math.min(50, Math.floor(act().pop)), 50], u: 'citizens', r: 250e3 },
  { t: 'Public services', x: 'Happy citizens need services. Open <b>Public Services</b> (key 6) and build a <b>Clinic</b> and a <b>School</b> near homes.', target: '#tools [data-c="svc"]', go: () => pickCat('svc'),
    prog: b => [Math.min(1, builtSince(b, 'clinic', 'hospital')) + Math.min(1, builtSince(b, 'school', 'university')), 2], r: 300e3 },
  { t: 'Keep your people happy', x: 'Watch the top bar: <b>Happiness</b>, <b>Approval</b>, power and water. The <b>R C I</b> bars (bottom of the toolbar) show what citizens want next. The <b>Agenda</b> here gives goals with cash rewards — follow it!', target: '#stats',
    next: true, r: 500e3 },
];
const tutOn = () => !!(S.tut && S.tut.on && S.started && !S.over && TUT[S.tut.i]);
function tutSnap() {
  const n = act(); return { road: S.cnt.road || 0, b: { ...(S.cnt.b || {}) }, z1: n ? zoneCount(1, n) : 0, z2: n ? zoneCount(2, n) : 0, cam: { tx: cam.gtx, tz: cam.gtz, dist: cam.gdist, yaw: cam.gyaw } };   // goal values only change with player input
}
function tutStart() { S.tut = { on: true, i: 0, base: tutSnap() }; trackKey = ''; tutKey = ''; renderTracker(); }
function tutEnd(done) {
  S.tut = { on: false, i: TUT.length, done: !!done }; trackKey = ''; tutKey = ''; tutRing(null); renderTracker();
  if (!done) toast('Tutorial closed', 'Restart it any time from Menu & Settings', 'info', 'info');
}
function tutAdvance(skip) {
  const st = TUT[S.tut.i];
  if (!skip && st.r) { act().treasury += st.r; sfx('coin'); toast(`Step done: ${st.t}`, `+${money(st.r)} reward`, 'gold', 'check'); }
  S.tut.i++; S.tut.base = tutSnap(); tutKey = '';
  if (S.tut.i >= TUT.length) { addNews('The President completed the government induction.'); tutEnd(true); modal({ title: 'Tutorial complete!', sub: 'Your city is up and running', icon: 'sparkle', html: '<p>You know the basics: roads, water, power, homes, jobs and services. From here, follow the <b>Agenda</b> (top left) — each goal pays a cash reward and unlocks bigger buildings.</p>', buttons: [{ l: `${ico('play')} Keep building`, pri: 1 }] }); }
  else renderTracker();
}
let tutKey = '', tutRingEl = null;
function tutRing(sel) {
  if (!tutRingEl) { tutRingEl = document.createElement('div'); tutRingEl.id = 'tutRing'; document.body.appendChild(tutRingEl); }
  const t = sel && $('#modal').classList.contains('hidden') ? document.querySelector(sel) : null, r = t && t.getBoundingClientRect();
  if (!r || !r.width) { tutRingEl.style.display = 'none'; return; }
  // on phones the toolbar scrolls sideways: bring the highlighted button into view once per step
  if ((r.right > innerWidth || r.left < 0) && tutRingEl._step !== S.tut.i) { tutRingEl._step = S.tut.i; t.scrollIntoView({ inline: 'center', block: 'nearest' }); return; }
  Object.assign(tutRingEl.style, { display: 'block', left: (r.left - 5) + 'px', top: (r.top - 5) + 'px', width: (r.width + 10) + 'px', height: (r.height + 10) + 'px' });
}
function renderTutCard(el) {
  const st = TUT[S.tut.i], [c, need] = st.prog ? st.prog(S.tut.base) : [0, 1], cc = Math.max(0, Math.min(c, need));
  const key = S.tut.i + '|' + cc + '|' + S.trackOpen;
  if (key !== tutKey) {
    tutKey = key;
    el.innerHTML = `<div class="trh"><div class="tri">${ico('target')}</div><div style="min-width:0;flex:1"><div class="trk">Tutorial · Step ${S.tut.i + 1}/${TUT.length}</div><div class="trt">${st.t}</div></div></div>
      <div class="trb"><i style="width:${S.tut.i / TUT.length * 100}%"></i></div>
      <div class="tut"><p>${st.x}</p>${st.prog && need > 1 ? `<div class="bar ok" style="margin:8px 0 2px"><i style="width:${cc / need * 100}%"></i></div><div class="ms num">${cc}/${need}${st.u ? ' ' + st.u : ''}</div>` : ''}
      <div class="btns" style="margin-top:10px">${st.next ? `<button class="btn sm pri" data-tut="next">${ico('check')} Got it</button>` : st.go ? `<button class="btn sm pri" data-tut="go">${ico('target')} Show me</button>` : ''}<button class="btn sm" data-tut="skip">Skip</button><button class="btn sm" data-tut="end">End tutorial</button>${st.r ? `<span class="ms" style="margin-left:auto">+${money(st.r)}</span>` : ''}</div></div>`;
    el.querySelectorAll('[data-tut]').forEach(b => b.onclick = e => {
      e.stopPropagation(); sfx('click'); const a = b.dataset.tut;
      if (a === 'go') st.go(); else if (a === 'next') tutAdvance(false); else if (a === 'skip') tutAdvance(true); else tutEnd(false);
    });
  }
}
// called on the UI tick: checks progress, moves the highlight ring
function tutTick() {
  if (!tutOn()) { if (tutRingEl) tutRingEl.style.display = 'none'; return; }
  const st = TUT[S.tut.i];
  if (st.prog) { const [c, need] = st.prog(S.tut.base); if (c >= need) return tutAdvance(false); }
  tutRing(st.target);
}

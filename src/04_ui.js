
/* =====================================================================
   UI
   ===================================================================== */
let mmDirty = true, AC = null;
const THUMBS = {};
const FOUND_COST = 15e6, FOUND_SEED = 10e6;
function sfx(t) {
  if (!S.sfx) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const P = { click: [620, 0.05, 0.035, 'sine'], build: [210, 0.16, 0.09, 'triangle'], coin: [880, 0.18, 0.05, 'sine'], error: [160, 0.18, 0.05, 'square'], done: [700, 0.22, 0.05, 'sine'] }[t]; if (!P) return;
    const now = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
    o.type = P[3]; o.frequency.setValueAtTime(P[0], now);
    if (t === 'coin' || t === 'done') o.frequency.exponentialRampToValueAtTime(P[0] * 1.5, now + P[1] * 0.6); if (t === 'build') o.frequency.exponentialRampToValueAtTime(80, now + P[1]);
    g.gain.setValueAtTime(P[2], now); g.gain.exponentialRampToValueAtTime(0.0001, now + P[1]); o.start(now); o.stop(now + P[1] + 0.02);
  } catch (e) { }
}
function toast(title, sub, kind = 'info', icon = 'info') {
  const el = document.createElement('div'); el.className = 'toast glass ' + (kind === 'info' ? '' : kind);
  el.innerHTML = `<div class="ti">${ico(icon)}</div><div>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const box = $('#toasts'); box.prepend(el); while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4200);
}
function addNews(t) { S.news.unshift({ d: S.day, t }); if (S.news.length > 40) S.news.length = 40; }
const floats = [];
function floatText(x, y, z, txt, neg) { const el = document.createElement('div'); el.className = 'ft' + (neg ? ' neg' : ''); el.textContent = txt; $('#labels').appendChild(el); floats.push({ el, x: x - HALF, y, z: z - HALF, t: 0 }); }
const dateStr = d => `${d % 30 + 1} ${MONTHS[Math.floor(d / 30) % 12]} · Th ${Math.floor(d / 360) + 1}`;

/* ---------------- modal ---------------- */
function modal(o) {
  const box = $('#mbox'); box.className = 'mbox' + (o.wide ? ' wide' : '');
  box.innerHTML = `<div class="mh">${o.icon ? `<div class="mi">${ico(o.icon)}</div>` : ''}<div style="min-width:0;flex:1"><div class="mt">${o.title}</div>${o.sub ? `<div class="ms">${o.sub}</div>` : ''}</div>${o.noClose ? '' : `<button class="cl" data-x>${ico('x')}</button>`}</div>
  <div class="mbody">${o.html || ''}</div>
  ${o.choices ? `<div class="choice">${o.choices.map((c, i) => `<button class="btn" data-c="${i}">${esc(c.l)}</button>`).join('')}</div>` : ''}
  ${o.buttons ? `<div class="btns" style="justify-content:flex-end">${o.buttons.map((b, i) => `<button class="btn ${b.pri ? 'pri' : ''} ${b.dan ? 'dan' : ''}" data-b="${i}">${b.l}</button>`).join('')}</div>` : ''}`;
  $('#modal').classList.remove('hidden'); S.modalNoClose = !!o.noClose;
  box.querySelector('[data-x]')?.addEventListener('click', closeModal);
  box.querySelectorAll('[data-c]').forEach(el => el.onclick = () => { closeModal(); sfx('click'); o.choices[+el.dataset.c].f(); });
  box.querySelectorAll('[data-b]').forEach(el => el.onclick = () => { const b = o.buttons[+el.dataset.b]; sfx('click'); const keep = b.f && b.f() === false; if (!keep) closeModal(); });
  o.onRender?.(box);
}
function closeModal() { $('#modal').classList.add('hidden'); S.modalNoClose = false; }
$('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' && !S.modalNoClose) closeModal(); });

/* ---------------- HUD ---------------- */
const presName = () => S.president ? 'Presiden ' + S.president : 'Presiden';
const playerNations = () => S.nations.filter(n => !n.ai);
function renderNationCard() {
  const n = act(), pn = playerNations(), k = pn.indexOf(n) + 1;
  $('#nationCard').innerHTML = `<div class="flag">${flagSVG(n)}</div><div style="min-width:0"><div class="nm">${esc(n.name)}</div><div class="pr">${esc(presName())}${pn.length > 1 ? ` <span class="badge">${k}/${pn.length}</span>` : ''}</div></div><div class="car">${ico('chev')}</div>`;
}
const STATS = [
  ['cash', 'coins', '#3ee0c8', 'Kas Negara', 'Saldo kas & arus bersih per bulan'], ['pop', 'users', '#8d9bff', 'Penduduk', 'Jumlah warga & kapasitas hunian'],
  ['hap', 'smile', '#fbbf24', 'Bahagia', 'Rata-rata kebahagiaan warga'], ['appr', 'thumb', '#f472b6', 'Approval', 'Tingkat kepuasan terhadap Presiden'],
  ['pow', 'bolt', '#facc15', 'Listrik', 'Pemakaian / produksi listrik (MW)'], ['wat', 'drop', '#38bdf8', 'Air', 'Pemakaian / produksi air bersih', 1], ['job', 'brief', '#a3e635', 'Nganggur', 'Pengangguran & lowongan kerja', 1],
];
function buildStats() {
  $('#stats').innerHTML = STATS.map(s => `<div class="stat ${s[5] ? 'opt' : ''}" data-tip="${s[4]}" id="st-${s[0]}"><div class="ic" style="color:${s[2]}">${ico(s[1])}</div><div class="tx"><div class="lb">${s[3]}</div><div class="vl num"></div><div class="sub num"></div></div></div>`).join('');
}
function setStat(id, vl, sub, bar, bad) {
  const el = $('#st-' + id); if (!el) return; el.querySelector('.vl').textContent = vl;
  const s = el.querySelector('.sub'); if (bar != null) { s.innerHTML = `<div class="bar ${bad ? 'bad' : ''}"><i style="width:${clamp(bar, 0, 1) * 100}%"></i></div>`; } else s.innerHTML = sub;
}
function renderStats() {
  const n = act(); if (!n) return;
  const net = n.rate.net || 0, lastP = n.hist.length ? n.hist[n.hist.length - 1].p : n.pop, dp = n.pop - lastP;
  setStat('cash', money(n.treasury), `<span class="${net >= 0 ? 'up' : 'dn'}">${net >= 0 ? '+' : ''}${money(net)}/bln</span>`);
  setStat('pop', fmtPop(n.pop), `<span class="${dp >= 0 ? 'up' : 'dn'}">${dp >= 0 ? '▲' : '▼'} ${fmtPop(Math.abs(dp))}</span> <span class="mu">/ ${fmtPop(n.cap)}</span>`);
  setStat('hap', Math.round(n.happy * 100) + '%', null, n.happy, n.happy < 0.45);
  setStat('appr', Math.round(n.approval) + '%', null, n.approval / 100, n.approval < 45);
  setStat('pow', `${fmt(n.pd)}/${fmt(n.ps)}`, null, n.ps ? n.pd / n.ps : 1, n.pd > n.ps);
  setStat('wat', `${fmt(n.wd)}/${fmt(n.ws)}`, null, n.ws ? n.wd / n.ws : 1, n.wd > n.ws);
  const vac = n.jobs - n.workers;
  setStat('job', `${Math.round(n.unemp * 100)}%`, vac > 0 ? `<span class="up">${fmt(vac)} loker</span>` : `<span class="dn">${fmt(-vac)} cari kerja</span>`);
}
function renderTime() {
  const tb = $('#timebox');
  if (!tb.dataset.b) {
    tb.dataset.b = 1;
    tb.innerHTML = `<div class="date"><span id="dDate"></span><small id="dSub"></small></div><div class="spd">${[['pause', 0], ['play', 1], ['ff', 2], ['fff', 4]].map(([i, v]) => `<button data-s="${v}" data-tip="${v ? v + '× kecepatan' : 'Jeda (Spasi)'}">${ico(i, 2)}</button>`).join('')}</div>`;
    tb.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const v = +b.dataset.s; if (v === 0) S.paused = !S.paused; else { S.speed = v; S.paused = false; } sfx('click'); renderTime(); });
  }
  const d = S.day; $('#dDate').textContent = `${d % 30 + 1} ${MONTHS[Math.floor(d / 30) % 12]}`;
  $('#dSub').textContent = `Tahun ${Math.floor(d / 360) + 1} · Periode ${Math.floor(d / 1800) + 1}`;
  tb.querySelectorAll('[data-s]').forEach(b => { const v = +b.dataset.s; b.classList.toggle('on', v === 0 ? S.paused : (!S.paused && S.speed === v)); });
}
function renderMenu() {
  const M = [['nations', 'crown', 'Negara-negaraku'], ['diplo', 'globe', 'Diplomasi'], ['policy', 'scale', 'Kebijakan & Anggaran'], ['stats', 'chart', 'Statistik & Kabar'], ['save', 'save', 'Simpan'], ['settings', 'gear', 'Menu & Pengaturan']];
  $('#menu').innerHTML = M.map(m => { const lk = m[0] === 'diplo' && !S.unl.diplo; return `<button class="mbtn" data-m="${m[0]}" data-tip="${m[2]}${lk ? ' · terbuka di ' + fmtPop(UNL.diplo) + ' penduduk' : ''}">${ico(m[1])}${lk ? `<span class="lkd">${ico('lock', 2.6)}</span>` : ''}</button>`; }).join('');
  $('#menu').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { sfx('click'); ({ nations: openNations, diplo: openDiplo, policy: openPolicy, stats: openStats, save: () => saveGame(false), settings: openSettings })[b.dataset.m](); });
  $('#nationCard').onclick = () => { sfx('click'); openNations(); };
}
function renderTools() {
  $('#tools').innerHTML = CATS.map(c => c.sep ? '<div class="tsep"></div>' : `<button class="tool" data-c="${c.id}">${ico(c.icon)}<span class="tp">${c.name} <kbd>${c.key}</kbd></span></button>`).join('') + RCI_HTML;
  $('#tools').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { sfx('click'); pickCat(b.dataset.c); });
  syncTools();
}
function syncTools() {
  const m = S.tool.mode, cur = m === 'select' ? 'select' : m === 'bulldoze' ? 'bulldoze' : (m === 'land' || m === 'found') ? 'land' : m === 'road' ? 'road' : S.drawer;
  $('#tools').querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === (S.drawer || cur)));
}
function pickCat(id) {
  if (id === 'select') { setTool('select'); closeDrawer(); return; }
  if (S.drawer === id) { closeDrawer(); setTool('select'); return; }
  S.drawer = id;
  if (id === 'bulldoze') setTool('bulldoze'); else if (id === 'road') setTool('road'); else if (id === 'land') setTool('land'); else setTool('select', null, true);
  refreshDrawer(); syncTools();
}
function closeDrawer() { S.drawer = null; $('#drawer').classList.add('hidden'); syncTools(); }
function statLine(t) {
  const d = BT[t];
  if (d.c === 'res') return `+${fmtPop(d.cap)} warga${d.taxm ? ' · pajak ×' + d.taxm : ''}`;
  if (d.c === 'com' || d.c === 'ind') return `${fmtPop(d.jobs)} lapangan kerja`;
  if (d.pgen) return `+${d.pgen} MW listrik`; if (d.wgen) return `+${d.wgen} m³ air`;
  if (d.svc) return `Radius layanan ${d.r}`;
  if (d.tour) return `Wisata +${money(d.tour)}/bln`; if (d.trade) return `Dagang +${money(d.trade)}/bln`; if (d.appr) return `Approval +${d.appr}`;
  if (d.hap) return `Kebahagiaan +${Math.round(d.hap * 100)}%`; return d.desc;
}
const HINTS = {
  build: '<span><kbd>Klik</kbd> bangun</span><span><kbd>R</kbd> putar</span><span><kbd>Klik kanan</kbd> batal</span>',
  road: '<span><kbd>Klik & geser</kbd> bangun jalan</span><span>Otomatis jadi jembatan di atas air</span><span><kbd>Klik kanan</kbd> batal</span>',
  bulldoze: '<span><kbd>Klik / geser</kbd> area untuk menghapus</span><span>Refund 25%</span>',
  land: '<span><kbd>Geser kotak</kbd> di tepi wilayahmu untuk membeli lahan</span>',
  found: '<span><kbd>Klik</kbd> lahan kosong untuk mendirikan negara baru</span><span><kbd>Klik kanan</kbd> batal</span>',
};
function refreshDrawer() {
  const id = S.drawer, dr = $('#drawer'); if (!id || !S.started) { dr.classList.add('hidden'); return; }
  const cat = CATS.find(c => c.id === id), n = act(); let cards = '';
  if (id === 'road') cards = `<button class="card on"><div class="im">${ico('road', 1.5)}</div><div class="cn">Jalan Raya</div><div class="cc">${money(ROAD_COST)}/petak</div><div class="cs">Jembatan ${money(BRIDGE_COST[1])}–${money(BRIDGE_COST[0])}</div></button>`;
  else if (id === 'bulldoze') cards = `<button class="card on"><div class="im">${ico('trash', 1.5)}</div><div class="cn">Buldoser</div><div class="cc">Refund 25%</div><div class="cs">Hapus bangunan & jalan</div></button>`;
  else if (id === 'land') cards = `<button class="card ${S.tool.mode === 'land' ? 'on' : ''}" data-l="land"><div class="im">${ico('map', 1.5)}</div><div class="cn">Beli Lahan</div><div class="cc">${money(landPrice(T.GRASS, n))}/petak</div><div class="cs">Perluas wilayah negara</div></button>
     <button class="card ${S.tool.mode === 'found' ? 'on' : ''} ${n.treasury < FOUND_COST ? 'poor' : ''} ${S.unl.found ? '' : 'lock'}" data-l="found"><div class="im">${ico('flag', 1.5)}</div><div class="cn">Dirikan Negara Baru</div><div class="cc">${money(FOUND_COST)}</div><div class="cs">Jadi presiden negara baru</div>${S.unl.found ? '' : `<div class="lk">${ico('lock')}<span>Butuh ${fmtPop(UNL.found)}<br>penduduk</span></div>`}</button>`;
  else cards = Object.keys(BT).filter(t => BT[t].c === id && !BT[t].nobuild).map(t => {
    const d = BT[t], locked = d.unlock && n.pop < d.unlock, owned = d.uniq && n.list.some(b => b.type === t), poor = n.treasury < d.cost, on = S.tool.mode === 'build' && S.tool.type === t;
    return `<button class="card ${locked ? 'lock' : ''} ${poor ? 'poor' : ''} ${on ? 'on' : ''}" data-t="${t}" title="${esc(d.desc)}"><div class="im"><img src="${THUMBS[t] || ''}" alt=""></div><div class="cn">${d.n}</div><div class="cc">${money(d.cost)}</div><div class="cs">${statLine(t)}</div>${locked ? `<div class="lk">${ico('lock')}<span>Butuh ${fmtPop(d.unlock)}<br>penduduk</span></div>` : ''}${owned ? '<div class="own">Dimiliki</div>' : ''}</button>`;
  }).join('');
  const hint = HINTS[S.tool.mode] || '<span>Pilih bangunan untuk mulai membangun</span>';
  const sl = dr.querySelector('.cards')?.scrollLeft || 0;
  dr.innerHTML = `<div class="dhead"><h3>${cat.name}</h3><div class="hint">${hint}</div><button class="x">${ico('x')}</button></div><div class="cards">${cards}</div>`;
  dr.querySelector('.cards').scrollLeft = sl;
  dr.classList.remove('hidden');
  dr.querySelector('.x').onclick = () => { closeDrawer(); setTool('select'); };
  dr.querySelectorAll('[data-t]').forEach(c => c.onclick = () => {
    const t = c.dataset.t, d = BT[t];
    if (d.unlock && n.pop < d.unlock) { toast(`${d.n} masih terkunci`, `Capai ${fmtPop(d.unlock)} penduduk untuk membuka`, 'wa', 'lock'); sfx('error'); return; }
    sfx('click'); setTool('build', t);
  });
  dr.querySelectorAll('[data-l]').forEach(c => c.onclick = () => { sfx('click'); if (c.dataset.l === 'found' && !S.unl.found) return lockedModal('found'); setTool(c.dataset.l); });
}
function setTool(mode, type, keepDrawer) {
  S.tool.mode = mode; S.tool.type = type || null; if (mode !== 'build') S.tool.rotSet = false;
  ptr.mode = null; ptr.down = false; hidePreview();
  if (mode === 'select' && !keepDrawer && S.drawer && !['res', 'com', 'ind', 'util', 'svc', 'rec', 'gov', 'lm'].includes(S.drawer)) closeDrawer();
  if (W.tFill) W.tFill.visible = S.political || mode === 'land' || mode === 'found';
  if (W.grid) W.grid.visible = S.showGrid && ['build', 'road', 'land', 'bulldoze'].includes(mode);
  if (S.drawer) refreshDrawer(); syncTools(); updateHover();
}

/* ---------------- info panel ---------------- */
function select(o) { S.selected = o; renderInfo(); sfx('click'); }
function closeInfo() { S.selected = null; $('#info').classList.add('hidden'); selRing.visible = false; rangeRing.visible = false; }
function covCell(lb, v) { const p = Math.round(v * 100); return `<div><b class="${p >= 50 ? 'up' : p > 0 ? '' : 'dn'}">${p}%</b>${lb}</div>`; }
function renderInfo() {
  const sel = S.selected, el = $('#info'); if (!sel) return closeInfo();
  let h = '';
  if (sel.b) {
    const b = sel.b; if (!S.blds.has(b.id)) return closeInfo();
    const d = BT[b.type], n = nationOf(b), mine = !n.ai && n.id === S.active;
    const lvMax = d.lv || 1;
    h += `<div class="ih"><div class="th"><img src="${THUMBS[b.type] || ''}"></div><div style="min-width:0"><h3>${d.n}</h3><div class="sb"><span class="flag sm">${flagSVG(n)}</span>${esc(n.name)}${lvMax > 1 ? ` <span class="stars">${'★'.repeat(b.level)}${'☆'.repeat(lvMax - b.level)}</span>` : ''}</div></div><button class="cl" id="iX">${ico('x')}</button></div>`;
    let pills = '';
    if (b.prog < 1) pills += `<span class="pill wa">Dibangun ${Math.round(b.prog * 100)}%</span>`;
    else {
      if (d.road !== false) pills += b.conn ? `<span class="pill ok">${ico('check', 2.5).replace('<svg', '<svg width="11" height="11"')} Akses jalan</span>` : `<span class="pill bad">Tanpa akses jalan</span>`;
      if (d.pw) pills += n.pr >= 0.999 ? `<span class="pill ok">Listrik</span>` : `<span class="pill bad">Listrik kurang</span>`;
      if (d.wt) pills += n.wr >= 0.999 ? `<span class="pill ok">Air</span>` : `<span class="pill bad">Air kurang</span>`;
      if (b.vis < 1) pills += `<span class="pill wa">Renovasi</span>`;
    }
    h += `<div>${pills}</div><p style="font-size:12px;color:var(--mut);margin:6px 0 4px;font-weight:600">${d.desc}</p>`;
    const kv = (a, v) => `<div class="kv"><span>${a}</span><span>${v}</span></div>`;
    if (d.c === 'res') {
      h += kv('Penduduk', `${fmtPop(b.occ)} / ${fmtPop(capOf(b))}`) + kv('Kebahagiaan', `${Math.round(b.happy * 100)}%`) + kv('Pajak / bulan', money(b.occ * 3.5 * n.tax * (d.taxm || 1)));
      h += `<div class="sec">Cakupan layanan</div><div class="cov">${covCell('Pendidikan', b.cov.edu)}${covCell('Kesehatan', b.cov.health)}${covCell('Keamanan', b.cov.safety)}${covCell('Pemadam', b.cov.fire)}${covCell('Taman & landmark', Math.min(1, (b.cov.park + b.cov.land) / 0.3))}<div><b class="${b.poll > 0.05 ? 'dn' : 'up'}">${Math.round(b.poll * 200)}%</b>Polusi</div></div>`;
    } else if (d.rev) {
      const w = jobsOf(b) * n.fill; h += kv('Pekerja', `${fmtPop(w)} / ${fmtPop(jobsOf(b))}`) + kv('Pendapatan / bulan', money(b.active ? jobsOf(b) * n.fill * d.rev * n.tax / 10 * (0.4 + 0.6 * n.pr) : 0));
      if (d.poll) h += kv('Polusi', `<span class="dn">Tinggi (radius 8)</span>`);
    } else if (d.pgen) h += kv('Produksi listrik', `+${d.pgen} MW`) + (d.poll ? kv('Polusi', '<span class="dn">Tinggi</span>') : kv('Emisi', '<span class="up">Bersih</span>'));
    else if (d.wgen) h += kv('Produksi air', `+${d.wgen} m³`);
    if (d.svc) h += kv('Jenis layanan', { edu: 'Pendidikan', health: 'Kesehatan', safety: 'Keamanan', fire: 'Pemadam' }[d.svc]) + kv('Radius', d.r + ' petak');
    else if (d.r) h += kv('Radius pengaruh', d.r + ' petak');
    if (d.jobs && !d.rev) h += kv('Pegawai', fmtPop(jobsOf(b)));
    if (d.tour) h += kv('Wisata / bulan', `+${money(d.tour)}`); if (d.trade) h += kv('Perdagangan / bulan', `+${money(d.trade)}`); if (d.appr) h += kv('Bonus approval', `+${d.appr}`);
    h += kv('Perawatan / bulan', `<span class="dn">-${money((d.up || 0) * LVU[b.level - 1])}</span>`);
    if (mine && b.prog >= 1) {
      h += `<div class="btns">`;
      if (b.level < lvMax) h += `<button class="btn pri f1" id="iUp" ${n.treasury < upgradeCost(b) || b.vis < 1 ? 'disabled' : ''}>${ico('up')} Tingkatkan · ${money(upgradeCost(b))}</button>`;
      if (b.type !== 'palace') h += `<button class="btn dan ${b.level < lvMax ? '' : 'f1'}" id="iDel">${ico('trash')} Hancurkan</button>`;
      h += `</div>`;
    }
    selRing.visible = true; selRing.scale.set(b.s, 1, b.s); selRing.position.set(b.x + b.s / 2 - HALF, 0.1, b.z + b.s / 2 - HALF);
    if (d.r) { setRing(d.r, b.x + b.s / 2 - HALF, b.z + b.s / 2 - HALF, '#3ee0c8'); } else rangeRing.visible = false;
  } else {
    const i = sel.tile, x = i % MAP, z = (i / MAP) | 0, t = terr[i], o = owner[i], n = act(), on = o >= 0 ? S.nations[o] : null;
    h += `<div class="ih"><div class="th">${ico(road[i] ? 'road' : t <= 1 ? 'drop' : t === T.MTN ? 'alert' : 'map', 1.5)}</div><div style="min-width:0"><h3>${road[i] ? (t <= 1 ? 'Jembatan' : 'Jalan Raya') : TNAME[t]}</h3><div class="sb">${on ? `<span class="flag sm">${flagSVG(on)}</span>${esc(on.name)}` : 'Belum diklaim'} · (${x}, ${z})</div></div><button class="cl" id="iX">${ico('x')}</button></div>`;
    const kv = (a, v) => `<div class="kv"><span>${a}</span><span>${v}</span></div>`;
    h += kv('Medan', TNAME[t]) + kv('Pemilik', on ? esc(on.name) : '—') + kv('Bisa dibangun', t >= 2 && t !== T.MTN ? '<span class="up">Ya</span>' : '<span class="dn">Tidak</span>');
    if (t === T.HILL) h += kv('Potensi', 'Tambang');
    if (o === -1) h += kv('Harga lahan', money(landPrice(t, n)));
    h += `<div class="btns">`;
    if (o === -1 && adjacentTo(x, z, n.id)) h += `<button class="btn pri f1" id="iBuy">${ico('map')} Beli petak · ${money(landPrice(t, n))}</button>`;
    if (road[i] && o === n.id) h += `<button class="btn dan f1" id="iRd">${ico('trash')} Hapus jalan</button>`;
    h += `</div>`;
    selRing.visible = true; selRing.scale.set(1, 1, 1); selRing.position.set(x - HALF + 0.5, 0.1, z - HALF + 0.5); rangeRing.visible = false;
  }
  el.innerHTML = h; el.classList.remove('hidden');
  $('#iX').onclick = closeInfo;
  const up = $('#iUp'); if (up) up.onclick = () => { upgradeBuilding(sel.b); renderInfo(); };
  const del = $('#iDel'); if (del) del.onclick = () => { const b = sel.b; modal({ title: `Hancurkan ${BT[b.type].n}?`, sub: `Kamu mendapat refund ${money(BT[b.type].cost * 0.25)}.`, icon: 'trash', buttons: [{ l: 'Batal' }, { l: 'Hancurkan', dan: 1, f: () => { act().treasury += BT[b.type].cost * 0.25; removeBuilding(b); sfx('build'); } }] }); };
  const buy = $('#iBuy'); if (buy) buy.onclick = () => { buyTiles([sel.tile]); renderInfo(); };
  const rd = $('#iRd'); if (rd) rd.onclick = () => { removeRoad(sel.tile); act().treasury += ROAD_COST * 0.25; renderInfo(); };
}
function landPrice(t, n) { return (t <= 1 ? 2500 : t === T.MTN ? 4000 : 9000) * (1 + (n ? n.tiles : 0) / 3000); }
function adjacentTo(x, z, id) { for (const [dx, dz] of DIRS) if (inb(x + dx, z + dz) && owner[ix(x + dx, z + dz)] === id) return true; return false; }
function buyTiles(list) {
  const n = act(); const L = list.filter(i => owner[i] === -1); if (!L.length) return;
  const cost = L.reduce((a, i) => a + landPrice(terr[i], n), 0);
  if (n.treasury < cost) { toast('Dana tidak cukup', `Butuh ${money(cost)}`, 'bad', 'alert'); sfx('error'); return; }
  n.treasury -= cost; bump('land', L.length); for (const i of L) owner[i] = n.id; n.tiles += L.length; S.terrDirty = true; sfx('coin');
  toast(`${L.length} petak lahan dibeli`, `-${money(cost)} · wilayah ${esc(n.name)} bertambah`, 'info', 'map');
}

/* ---------------- overlays ---------------- */
const ovMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
function frame(mat, w = 0.06) { const g = new THREE.Group(); for (const [x, z, sx, sz] of [[0, -0.5, 1, w], [0, 0.5, 1, w], [-0.5, 0, w, 1], [0.5, 0, w, 1]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.04, sz), mat); m.position.set(x, 0, z); g.add(m); } return g; }
const curMat = ovMat('#3ee0c8'), cursor = frame(curMat); cursor.visible = false; fxG.add(cursor);
const fpMat = new THREE.MeshBasicMaterial({ color: '#3ee0c8', transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
const footprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), fpMat); footprint.visible = false; footprint.renderOrder = 5; fxG.add(footprint);
const selMat = ovMat('#ffffff'), selRing = frame(selMat, 0.05); selRing.visible = false; fxG.add(selRing);
const ringMat = new THREE.MeshBasicMaterial({ color: '#3ee0c8', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
const discMat = new THREE.MeshBasicMaterial({ color: '#3ee0c8', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
const rangeRing = new THREE.Group(); rangeRing.add(new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 96).rotateX(-Math.PI / 2), ringMat), new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), discMat));
rangeRing.visible = false; rangeRing.renderOrder = 5; fxG.add(rangeRing);
function setRing(r, x, z, c) { rangeRing.visible = true; rangeRing.scale.set(r, 1, r); rangeRing.position.set(x, 0.1, z); ringMat.color.set(c); discMat.color.set(c); }
const ghostMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.6, emissive: new THREE.Color('#2ee6b0'), emissiveIntensity: 0.35, depthWrite: false });
const ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat); ghost.visible = false; ghost.renderOrder = 7; fxG.add(ghost);
const pathMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), 600);
pathMesh.count = 0; pathMesh.frustumCulled = false; pathMesh.renderOrder = 5; pathMesh.setColorAt(0, new THREE.Color()); fxG.add(pathMesh);
const rectMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ee0c8', transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false })); rectMesh.visible = false; rectMesh.renderOrder = 5; fxG.add(rectMesh);
const rectFrame = frame(ovMat('#3ee0c8'), 0.08); rectFrame.visible = false; fxG.add(rectFrame);
function buildGrid() {
  if (W.grid) { fxG.remove(W.grid); W.grid.geometry.dispose(); }
  const p = [], V = MAP + 1, flat = (x, z) => Math.abs(H[z * V + x]) < 0.01;
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const t = terr[ix(x, z)]; if (t < 2 || t === T.MTN) continue; const x0 = x - HALF, z0 = z - HALF;
    if (flat(x, z) && flat(x + 1, z)) p.push(x0, 0.034, z0, x0 + 1, 0.034, z0);
    if (flat(x, z) && flat(x, z + 1)) p.push(x0, 0.034, z0, x0, 0.034, z0 + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  W.grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, depthWrite: false })); W.grid.visible = false; fxG.add(W.grid);
}
function hidePreview() { cursor.visible = footprint.visible = ghost.visible = rectMesh.visible = rectFrame.visible = false; pathMesh.count = 0; if (!S.selected || !S.selected.b || !BT[S.selected.b.type].r) rangeRing.visible = false; $('#tip').classList.add('hidden'); }
function showTip(html) { const t = $('#tip'); t.innerHTML = html; t.classList.remove('hidden'); t.style.left = ptr.x + 'px'; t.style.top = ptr.y + 'px'; }
function placeFrame(fr, x, z, w, d, col) { fr.visible = true; fr.scale.set(w, 1, d); fr.position.set(x + w / 2 - HALF, 0.09, z + d / 2 - HALF); if (col) fr.children[0].material.color.set(col); }

/* ---------------- input ---------------- */
const ray = new THREE.Raycaster(), GPLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _v2 = new THREE.Vector2(), _v3 = new THREE.Vector3();
function groundAt(cx, cy) { _v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(_v2, camera); const p = ray.ray.intersectPlane(GPLANE, _v3); return p ? { x: p.x, z: p.z } : null; }
function tileAt(g) { if (!g) return null; const x = Math.floor(g.x + HALF), z = Math.floor(g.z + HALF); return inb(x, z) ? { x, z } : null; }
const ptr = { down: false, btn: 0, sx: 0, sy: 0, x: 0, y: 0, moved: false, mode: null, g0: null, t0: null, touches: new Map(), pinch: null, lastPaint: -1 };
function buildAnchor(t, s) { return { x: t.x - Math.floor((s - 1) / 2), z: t.z - Math.floor((s - 1) / 2) }; }
function linePath(a, b) {
  const L = []; if (!a || !b) return L; const dx = b.x - a.x, dz = b.z - a.z, xf = Math.abs(dx) >= Math.abs(dz);
  const sx = Math.sign(dx), sz = Math.sign(dz); let x = a.x, z = a.z; L.push(ix(x, z));
  if (xf) { while (x !== b.x) { x += sx; L.push(ix(x, z)); } while (z !== b.z) { z += sz; L.push(ix(x, z)); } }
  else { while (z !== b.z) { z += sz; L.push(ix(x, z)); } while (x !== b.x) { x += sx; L.push(ix(x, z)); } }
  return L.slice(0, 600);
}
function rectTiles(a, b) { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z), L = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) L.push(ix(x, z)); return { L, x0, z0, w: x1 - x0 + 1, d: z1 - z0 + 1 }; }
function updateHover() {
  if (!S.started || ptr.pinch) return;
  const g = groundAt(ptr.x, ptr.y), t = tileAt(g), m = S.tool.mode, n = act();
  hidePreview(); if (!t) return;
  if (ptr.down && ptr.mode === 'drag' && ptr.t0) {
    if (m === 'road') {
      const L = linePath(ptr.t0, t); let cost = 0, cnt = 0, bad = 0; const cv = new THREE.Color();
      L.forEach((i, k) => { _m.makeTranslation(i % MAP - HALF + 0.5, 0.1, ((i / MAP) | 0) - HALF + 0.5); pathMesh.setMatrixAt(k, _m); let c = '#3ee0c8'; if (road[i]) c = '#8fa4c6'; else if (!roadOK(i, n)) { c = '#fb7185'; bad++; } else { cost += roadCostAt(i); cnt++; } pathMesh.setColorAt(k, cv.set(c)); });
      pathMesh.count = L.length; pathMesh.instanceMatrix.needsUpdate = true; pathMesh.instanceColor.needsUpdate = true;
      showTip(`<b>${cnt} petak jalan</b> · <span class="${n.treasury >= cost ? 'g' : 'r'}">${money(cost)}</span>${bad ? ` <span class="r">· ${bad} tidak valid</span>` : ''}`);
    } else {
      const R = rectTiles(ptr.t0, t); const col = m === 'bulldoze' ? '#fb7185' : '#3ee0c8';
      rectMesh.visible = true; rectMesh.scale.set(R.w, 1, R.d); rectMesh.position.set(R.x0 + R.w / 2 - HALF, 0.1, R.z0 + R.d / 2 - HALF); rectMesh.material.color.set(col); placeFrame(rectFrame, R.x0, R.z0, R.w, R.d, col);
      if (m === 'land') { const L = R.L.filter(i => owner[i] === -1), cost = L.reduce((a, i) => a + landPrice(terr[i], n), 0); showTip(`<b>${L.length} petak</b> · <span class="${n.treasury >= cost ? 'g' : 'r'}">${money(cost)}</span>${L.length && !rectTouches(R, n.id) ? ' <span class="r">· harus menempel wilayahmu</span>' : ''}`); }
      else { const B = bulldozeTargets(R.L, n); showTip(`<b>Hapus ${B.blds.size} bangunan, ${B.roads.length} jalan</b> <span class="m">· refund ${money(B.refund)}</span>`); }
    }
    return;
  }
  if (m === 'build') {
    const type = S.tool.type, d = BT[type], s = d.s, a = buildAnchor(t, s);
    let reason = checkSite(type, a.x, a.z, n, false); const cost = siteCost(type, a.x, a.z); if (!reason && n.treasury < cost) reason = 'Dana tidak cukup';
    let rot = S.tool.rotSet ? S.tool.rot : (() => { const f = faceRoad(a.x, a.z, s); return f >= 0 ? f : S.tool.rot; })(); if (type === 'port') { const r = portRot(a.x, a.z, s); rot = r < 0 ? 0 : r; }
    S.tool.curRot = rot;
    const key = `${type}|1|0|${FLAGGED.has(type) ? n.color : ''}`; ghost.geometry = geoSet(key).body; ghost.visible = true;
    ghost.position.set(a.x + s / 2 - HALF, 0.005, a.z + s / 2 - HALF); ghost.rotation.y = rot * Math.PI / 2; ghostMat.emissive.set(reason ? '#ff3355' : '#2ee6b0');
    footprint.visible = true; footprint.scale.set(s, 1, s); footprint.position.set(a.x + s / 2 - HALF, 0.08, a.z + s / 2 - HALF); fpMat.color.set(reason ? '#fb7185' : '#3ee0c8');
    placeFrame(cursor, a.x, a.z, s, s, reason ? '#fb7185' : '#3ee0c8');
    if (d.r) setRing(d.r, a.x + s / 2 - HALF, a.z + s / 2 - HALF, reason ? '#fb7185' : '#3ee0c8');
    const warn = !reason && d.road !== false && !touchesRoad(a.x, a.z, s) ? ' <span class="r">· belum ada akses jalan</span>' : '';
    showTip(`<b>${d.n}</b> · ${money(cost)} ${reason ? `<br><span class="r">${reason}</span>` : `<span class="g">✓</span>${warn}`}`);
  } else if (m === 'road' || m === 'land' || m === 'bulldoze') {
    const i = ix(t.x, t.z); let col = '#3ee0c8', tip = '';
    if (m === 'road') { const ok = roadOK(i, n) || road[i]; col = ok ? '#3ee0c8' : '#fb7185'; tip = road[i] ? 'Sudah ada jalan' : roadOK(i, n) ? `<b>${terr[i] <= 1 ? 'Jembatan' : 'Jalan'}</b> · ${money(roadCostAt(i))}/petak` : `<span class="r">${owner[i] !== n.id ? 'Bukan wilayahmu' : 'Tidak bisa dibangun di sini'}</span>`; }
    else if (m === 'land') { const ok = owner[i] === -1; col = ok ? '#3ee0c8' : '#8fa4c6'; tip = ok ? `<b>Lahan bebas</b> · ${money(landPrice(terr[i], n))}` : `<span class="m">Dimiliki ${esc(S.nations[owner[i]].name)}</span>`; }
    else { col = '#fb7185'; const b = tileB[i] ? S.blds.get(tileB[i]) : null; if (b) { placeFrame(cursor, b.x, b.z, b.s, b.s, col); showTip(`Hapus <b>${BT[b.type].n}</b>`); return; } tip = road[i] ? 'Hapus jalan' : '<span class="m">Klik / geser untuk menghapus</span>'; }
    placeFrame(cursor, t.x, t.z, 1, 1, col); showTip(tip);
  } else if (m === 'found') {
    const r = foundCheck(t); setRing(9, t.x + 0.5 - HALF, t.z + 0.5 - HALF, r ? '#fb7185' : '#3ee0c8'); placeFrame(cursor, t.x, t.z, 1, 1, r ? '#fb7185' : '#3ee0c8');
    showTip(r ? `<span class="r">${r}</span>` : `<b>Dirikan negara di sini</b> · ${money(FOUND_COST)}`);
  } else {
    const i = ix(t.x, t.z), b = tileB[i] ? S.blds.get(tileB[i]) : null;
    if (b) placeFrame(cursor, b.x, b.z, b.s, b.s, '#ffffff'); else placeFrame(cursor, t.x, t.z, 1, 1, '#ffffff');
    curMat.opacity = 0.55;
    return;
  }
  curMat.opacity = 0.9;
}
function rectTouches(R, id) { for (const i of R.L) { const x = i % MAP, z = (i / MAP) | 0; if (owner[i] === id || adjacentTo(x, z, id)) return true; } return false; }
function bulldozeTargets(L, n) {
  const blds = new Set(), roads = []; let refund = 0;
  for (const i of L) { if (tileB[i]) { const b = S.blds.get(tileB[i]); if (b && b.nid === n.id && b.type !== 'palace') blds.add(b); } if (road[i] && owner[i] === n.id) roads.push(i); }
  for (const b of blds) refund += BT[b.type].cost * 0.25; refund += roads.length * ROAD_COST * 0.25; return { blds, roads, refund };
}
function tryBuild(quiet) {
  const t = tileAt(groundAt(ptr.x, ptr.y)); if (!t) return;
  const type = S.tool.type, d = BT[type], n = act(), a = buildAnchor(t, d.s);
  let reason = checkSite(type, a.x, a.z, n, false); const cost = siteCost(type, a.x, a.z); if (!reason && n.treasury < cost) reason = 'Dana tidak cukup';
  if (reason) { if (!quiet) { toast(reason, d.n, 'bad', 'alert'); sfx('error'); } return; }
  n.treasury -= cost; placeBuilding(type, a.x, a.z, n, { rot: S.tool.rotSet ? S.tool.rot : undefined }); sfx('build'); bumpB(type);
  if (d.uniq) { setTool('select', null, true); }
  if (S.drawer) refreshDrawer();
}
function commitDrag() {
  const t = tileAt(groundAt(ptr.x, ptr.y)) || ptr.t0, m = S.tool.mode, n = act(); if (!ptr.t0) return;
  if (m === 'road') {
    let built = 0, spent = 0, broke = false;
    for (const i of linePath(ptr.t0, t)) { if (road[i] || !roadOK(i, n)) continue; const c = roadCostAt(i); if (n.treasury < c) { broke = true; break; } n.treasury -= c; spent += c; placeRoad(i); built++; }
    if (built) { sfx('build'); bump('road', built); } if (broke) toast('Dana habis', 'Sebagian jalan tidak terbangun', 'bad', 'alert');
  } else if (m === 'bulldoze') {
    const R = rectTiles(ptr.t0, t), B = bulldozeTargets(R.L, n);
    for (const b of B.blds) removeBuilding(b); for (const i of B.roads) removeRoad(i);
    n.treasury += B.refund; if (B.blds.size || B.roads.length) sfx('build');
  } else if (m === 'land') {
    const R = rectTiles(ptr.t0, t), L = R.L.filter(i => owner[i] === -1);
    if (!L.length) return; if (!rectTouches(R, n.id)) { toast('Harus menempel wilayahmu', 'Perluas wilayah dari perbatasan', 'bad', 'alert'); sfx('error'); return; }
    buyTiles(L);
  }
  if (S.drawer) refreshDrawer();
}
function pickBuilding(cx, cy) {
  _v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(_v2, camera);
  const list = []; for (const p of pools.values()) if (!p.key.startsWith('road|') && p.key !== 'rotor' && p.n) list.push(p.meshes[0]);
  const hits = ray.intersectObjects(list, false);
  for (const h of hits) { const p = h.object.userData.pool, e = p && p.items[h.instanceId]; if (e && e.type) return e; }
  return null;
}
function handleClick(cx, cy) {
  if (S.tool.mode === 'found') { const t = tileAt(groundAt(cx, cy)); const r = foundCheck(t); if (r) { toast(r, 'Pilih lokasi lain', 'bad', 'alert'); sfx('error'); return; } openFoundDialog(t); return; }
  const b = pickBuilding(cx, cy); if (b) return select({ b });
  const t = tileAt(groundAt(cx, cy)); if (!t) return closeInfo(); const i = ix(t.x, t.z);
  if (tileB[i]) select({ b: S.blds.get(tileB[i]) }); else select({ tile: i });
}
function grabPan(cx, cy) { const g = groundAt(cx, cy); if (!g || !ptr.g0) return; cam.tx += ptr.g0.x - g.x; cam.tz += ptr.g0.z - g.z; cam.tx = clamp(cam.tx, -HALF, HALF); cam.tz = clamp(cam.tz, -HALF, HALF); cam.gtx = cam.tx; cam.gtz = cam.tz; applyCam(); }
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (!S.started) return; canvas.focus();
  if (e.pointerType === 'touch') { ptr.touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.touches.size === 2) { ptr.down = false; ptr.mode = null; hidePreview(); const [a, b] = [...ptr.touches.values()]; ptr.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, g: groundAt((a.x + b.x) / 2, (a.y + b.y) / 2) }; return; } }
  canvas.setPointerCapture(e.pointerId);
  ptr.down = true; ptr.btn = e.button; ptr.sx = ptr.x = e.clientX; ptr.sy = ptr.y = e.clientY; ptr.moved = false; ptr.g0 = groundAt(e.clientX, e.clientY); ptr.lastPaint = -1;
  if (e.button === 2) ptr.mode = 'pan';
  else if (e.button === 1 || (e.button === 0 && e.altKey)) ptr.mode = 'rot';
  else { const m = S.tool.mode; ptr.mode = (m === 'select' || m === 'found') ? 'clickpan' : m === 'build' ? 'build' : 'drag'; ptr.t0 = tileAt(ptr.g0); if (ptr.mode === 'build' && BT[S.tool.type].s === 1) { tryBuild(false); ptr.lastPaint = ptr.t0 ? ix(ptr.t0.x, ptr.t0.z) : -1; } }
  updateHover();
});
canvas.addEventListener('pointermove', e => {
  if (!S.started) return;
  if (e.pointerType === 'touch' && ptr.touches.has(e.pointerId)) {
    ptr.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.pinch && ptr.touches.size >= 2) {
      const [a, b] = [...ptr.touches.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      cam.gdist = clamp(cam.gdist * ptr.pinch.d / Math.max(10, d), 7, 175); cam.dist = cam.gdist; cam.gyaw -= (ang - ptr.pinch.ang); cam.yaw = cam.gyaw; ptr.pinch.d = d; ptr.pinch.ang = ang;
      applyCam(); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; if (ptr.pinch.g) { ptr.g0 = ptr.pinch.g; grabPan(mx, my); } return;
    }
  }
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
  if (ptr.down && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 6) ptr.moved = true;
  if (ptr.down) {
    if (ptr.mode === 'pan' || (ptr.mode === 'clickpan' && ptr.moved)) { grabPan(e.clientX, e.clientY); return; }
    if (ptr.mode === 'rot') { cam.gyaw -= dx * 0.006; cam.gpitch = clamp(cam.gpitch + dy * 0.004, 0.32, 1.45); return; }
    if (ptr.mode === 'build' && BT[S.tool.type].s === 1) { const t = tileAt(groundAt(e.clientX, e.clientY)); if (t && ix(t.x, t.z) !== ptr.lastPaint) { ptr.lastPaint = ix(t.x, t.z); tryBuild(true); } }
  }
  updateHover();
});
function endPointer(e) {
  if (e.pointerType === 'touch') { ptr.touches.delete(e.pointerId); if (ptr.pinch) { if (ptr.touches.size < 2) ptr.pinch = null; return; } }
  if (!ptr.down) return; ptr.down = false;
  const m = ptr.mode; ptr.mode = null;
  if (m === 'clickpan' && !ptr.moved) handleClick(e.clientX, e.clientY);
  else if (m === 'drag') commitDrag();
  else if (m === 'build' && BT[S.tool.type]?.s > 1 && !ptr.moved) tryBuild(false);
  else if (m === 'pan' && !ptr.moved && S.tool.mode !== 'select') { setTool('select', null, true); }
  ptr.t0 = null; updateHover();
}
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { if (!ptr.down) hidePreview(); });
canvas.addEventListener('wheel', e => {
  e.preventDefault(); if (!S.started) return;
  const nd = clamp(cam.gdist * Math.exp(e.deltaY * 0.0011), 7, 175), g = groundAt(e.clientX, e.clientY);
  if (g) { const k = 1 - nd / cam.gdist; cam.gtx += (g.x - cam.gtx) * k; cam.gtz += (g.z - cam.gtz) * k; }
  cam.gdist = nd; clampCam();
}, { passive: false });
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); keys.add(k); if (!S.started) return;
  if (k === 'escape') { if (!$('#modal').classList.contains('hidden')) { if (!S.modalNoClose) closeModal(); } else if (S.tool.mode !== 'select') { setTool('select'); closeDrawer(); } else if (S.drawer) closeDrawer(); else if (S.overlay) setOverlay(S.overlay); else closeInfo(); }
  else if (!$('#modal').classList.contains('hidden')) return;
  else if (k === ' ') { e.preventDefault(); S.paused = !S.paused; renderTime(); }
  else if (k === 'r') { S.tool.rot = ((S.tool.curRot ?? S.tool.rot) + 1) % 4; S.tool.rotSet = true; updateHover(); }
  else if (k === 'tab') { e.preventDefault(); togglePolitical(); }
  else if (k === 'b') pickCat('bulldoze'); else if (k === 'v') pickCat('select'); else if (k === 'l') pickCat('land');
  else if (/^[1-9]$/.test(k)) { const c = CATS.find(c => c.key === k); if (c) pickCat(c.id); }
  else if (k === '+' || k === '=') cam.gdist = clamp(cam.gdist * 0.85, 7, 175); else if (k === '-') cam.gdist = clamp(cam.gdist * 1.18, 7, 175);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
function keyPan(dt) {
  if (keys.has('q')) cam.gyaw += dt * 1.6; if (keys.has('e')) cam.gyaw -= dt * 1.6;
  let f = 0, r = 0; if (keys.has('w') || keys.has('arrowup')) f++; if (keys.has('s') || keys.has('arrowdown')) f--; if (keys.has('d') || keys.has('arrowright')) r++; if (keys.has('a') || keys.has('arrowleft')) r--;
  if (!f && !r) return; const sp = cam.gdist * 0.85 * dt, s = Math.sin(cam.yaw), c = Math.cos(cam.yaw);
  cam.gtx += (-s * f + c * r) * sp; cam.gtz += (-c * f - s * r) * sp; clampCam(); updateHover();
}
function togglePolitical() { S.political = !S.political; S.terrDirty = true; renderMMBar(); toast(S.political ? 'Peta politik aktif' : 'Peta politik nonaktif', 'Tekan Tab untuk beralih', 'info', 'layers'); }

/* ---------------- minimap ---------------- */
const mmc = $('#mmc'), mmx = mmc.getContext('2d'); let mmBase = null, mmOver = document.createElement('canvas'); mmOver.width = mmOver.height = MAP;
function buildMinimapBase() {
  const cv = document.createElement('canvas'); cv.width = cv.height = MAP; const cx = cv.getContext('2d'), img = cx.createImageData(MAP, MAP);
  const TCm = ['#0f3a58', '#2a7da0', '#e3d3a0', '#6aa84a', '#3f7a34', '#9a9a62', '#8b867e'].map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let i = 0; i < MAP * MAP; i++) { const c = TCm[terr[i]]; let k = 1; if (terr[i] === T.MTN) k = 0.9 + clamp((elev[i] - W.mtn) / (W.maxE - W.mtn), 0, 1) * 0.5; img.data[i * 4] = Math.min(255, c[0] * k); img.data[i * 4 + 1] = Math.min(255, c[1] * k); img.data[i * 4 + 2] = Math.min(255, c[2] * k); img.data[i * 4 + 3] = 255; }
  cx.putImageData(img, 0, 0); mmBase = cv; mmDirty = true;
}
function drawMinimap() {
  if (!mmBase) return; const Wd = mmc.width;
  if (mmDirty) {
    mmDirty = false; const ox = mmOver.getContext('2d'), img = ox.createImageData(MAP, MAP), D = img.data;
    const cols = S.nations.map(n => { const c = new THREE.Color(n.color); return [c.r * 255, c.g * 255, c.b * 255]; });
    for (let i = 0; i < MAP * MAP; i++) {
      const o = owner[i];
      if (tileB[i]) { D[i * 4] = 250; D[i * 4 + 1] = 252; D[i * 4 + 2] = 255; D[i * 4 + 3] = 235; }
      else if (road[i]) { D[i * 4] = 70; D[i * 4 + 1] = 76; D[i * 4 + 2] = 88; D[i * 4 + 3] = 255; }
      else if (o >= 0) { const c = cols[o]; D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = S.political ? 150 : 70; }
    }
    ox.putImageData(img, 0, 0);
  }
  mmx.imageSmoothingEnabled = true; mmx.drawImage(mmBase, 0, 0, Wd, Wd); mmx.imageSmoothingEnabled = false; mmx.drawImage(mmOver, 0, 0, Wd, Wd);
  if (!S.started) return;
  mmx.save(); mmx.beginPath(); mmx.rect(0, 0, Wd, Wd); mmx.clip();
  const k = Wd / MAP, pts = [[0, 0], [innerWidth, 0], [innerWidth, innerHeight], [0, innerHeight]].map(([x, y]) => { let g = groundAt(x, Math.max(y, innerHeight * 0.02)); if (!g) { const d = 200; g = { x: cam.tx + (x / innerWidth - 0.5) * d, z: cam.tz - d }; } return [(g.x + HALF) * k, (g.z + HALF) * k]; });
  mmx.strokeStyle = 'rgba(255,255,255,.9)'; mmx.lineWidth = 2; mmx.fillStyle = 'rgba(255,255,255,.08)'; mmx.beginPath(); pts.forEach((p, i) => i ? mmx.lineTo(p[0], p[1]) : mmx.moveTo(p[0], p[1])); mmx.closePath(); mmx.fill(); mmx.stroke();
  for (const n of S.nations) { mmx.fillStyle = n.color; mmx.strokeStyle = '#fff'; mmx.lineWidth = 2; mmx.beginPath(); mmx.arc((n.capital.x + 0.5) * k, (n.capital.z + 0.5) * k, n.id === S.active ? 6 : 4, 0, 7); mmx.fill(); mmx.stroke(); }
  mmx.restore();
}
function mmPick(e) { const r = mmc.getBoundingClientRect(); cam.gtx = ((e.clientX - r.left) / r.width) * MAP - HALF; cam.gtz = ((e.clientY - r.top) / r.height) * MAP - HALF; clampCam(); }
mmc.addEventListener('pointerdown', e => { mmc.setPointerCapture(e.pointerId); mmPick(e); mmc._d = 1; });
mmc.addEventListener('pointermove', e => { if (mmc._d) mmPick(e); });
mmc.addEventListener('pointerup', () => mmc._d = 0);
$('#compass').innerHTML = `<svg viewBox="0 0 24 24">${I.compass}</svg>`; $('#compass').onclick = () => { cam.gyaw = Math.round(cam.gyaw / (Math.PI * 2)) * Math.PI * 2; };
function renderMMBar() {
  const B = [['data', 'scan', 'Peta data (cakupan, polusi…)', !!S.overlay], ['pol', 'layers', 'Peta politik (Tab)', S.political], ['grid', 'grid', 'Grid saat membangun', S.showGrid], ['dn', 'sun', 'Siklus siang/malam', S.dayNight], ['snd', 'vol', 'Efek suara', S.sfx]];
  $('#mmbar').innerHTML = B.map(b => `<button data-k="${b[0]}" class="${b[3] ? 'on' : ''}" data-tip="${b[2]}">${ico(b[1])}</button>`).join('');
  $('#mmbar').querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
    const k = el.dataset.k; if (k === 'data') { renderDPop(); $('#dpop').classList.toggle('hidden'); sfx('click'); return; } if (k === 'pol') { togglePolitical(); return; } if (k === 'grid') S.showGrid = !S.showGrid; if (k === 'dn') S.dayNight = !S.dayNight; if (k === 'snd') S.sfx = !S.sfx;
    sfx('click'); renderMMBar(); setTool(S.tool.mode, S.tool.type, true);
  });
}

/* ---------------- dialogs ---------------- */
function foundCheck(t) {
  if (!S.unl.found) return `Terbuka saat ${fmtPop(UNL.found)} penduduk`;
  if (!t) return 'Arahkan ke daratan'; const i = ix(t.x, t.z), n = act();
  if (owner[i] !== -1) return 'Wilayah ini sudah dimiliki'; if (terr[i] < 2 || terr[i] === T.MTN) return 'Harus di daratan datar';
  if (S.nations.some(o => Math.hypot(o.capital.x - t.x, o.capital.z - t.z) < 16)) return 'Terlalu dekat dengan ibu kota lain';
  let free = 0; for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) { if (dx * dx + dz * dz > 64) continue; const x = t.x + dx, z = t.z + dz; if (inb(x, z) && owner[ix(x, z)] === -1 && terr[ix(x, z)] >= 2 && terr[ix(x, z)] !== T.MTN) free++; }
  if (free < 90) return 'Lahan bebas di sekitar kurang luas';
  if (playerNations().length >= MAX_PLAYER_NATIONS) return `Maksimal ${MAX_PLAYER_NATIONS} negara`;
  if (n.treasury < FOUND_COST) return `Dana tidak cukup (${money(FOUND_COST)})`;
  return null;
}
function openFoundDialog(t) {
  const used = new Set(S.nations.map(n => n.color)); let col = NCOLORS.find(c => !used.has(c)) || NCOLORS[0], fst = 1 + Math.floor(Math.random() * 3);
  const names = ['Republik Samudra', 'Federasi Cakrawala', 'Kerajaan Nirwana', 'Republik Arunika', 'Uni Bentala', 'Republik Baskara', 'Persemakmuran Tirta'];
  modal({
    title: 'Dirikan Negara Baru', sub: `Biaya pendirian ${money(FOUND_COST)} dari kas ${esc(act().name)}. Negara baru menerima kas awal ${money(FOUND_SEED)}, Istana Presiden & infrastruktur dasar.`, icon: 'flag',
    html: `<label class="flbl" style="margin-top:0">Nama negara</label><input class="tinput" id="fName" maxlength="32" value="${names[Math.floor(Math.random() * names.length)]}">
      <label class="flbl">Warna bendera</label><div class="swatch" id="fSw">${NCOLORS.map(c => `<button data-c="${c}" style="background:${c}" class="${c === col ? 'on' : ''}"></button>`).join('')}</div>
      <label class="flbl">Gaya bendera</label><div class="row" id="fSt">${[0, 1, 2, 3].map(s => `<button class="flag lg" data-s="${s}" style="cursor:pointer;opacity:${s === fst ? 1 : 0.45}">${flagSVG({ color: col, fstyle: s, flag2: '#f3f5f8' })}</button>`).join('')}</div>`,
    onRender: box => {
      const st = () => box.querySelectorAll('#fSt [data-s]').forEach(b => { b.innerHTML = flagSVG({ color: col, fstyle: +b.dataset.s, flag2: '#f3f5f8' }); b.style.opacity = +b.dataset.s === fst ? 1 : 0.45; });
      box.querySelectorAll('#fSw [data-c]').forEach(b => b.onclick = () => { col = b.dataset.c; box.querySelectorAll('#fSw [data-c]').forEach(x => x.classList.toggle('on', x === b)); st(); });
      box.querySelectorAll('#fSt [data-s]').forEach(b => b.onclick = () => { fst = +b.dataset.s; st(); });
    },
    buttons: [{ l: 'Batal' }, { l: `${ico('flag')} Dirikan · ${money(FOUND_COST)}`, pri: 1, f: () => { const nm = ($('#fName').value || '').trim() || 'Negara Baru'; foundNation(t, nm, col, fst); } }]
  });
}
function foundNation(t, name, color, fstyle) {
  const src = act(); if (src.treasury < FOUND_COST) return; src.treasury -= FOUND_COST;
  const n = makeNation({ name, color, fstyle, treasury: FOUND_SEED, capital: { x: t.x, z: t.z }, founded: S.day, approval: 66 });
  S.nations.push(n); claimCircle(n, t.x, t.z, 9); starterCity(n, false);
  sfx('coin'); addNews(`${presName()} mendirikan negara baru: ${name}.`);
  toast(`${name} resmi berdiri!`, `Kamu kini presiden ${playerNations().length} negara`, 'gold', 'flag');
  switchNation(n.id); setTool('select'); closeDrawer();
}
function switchNation(id) {
  S.active = id; const n = act(); renderNationCard(); renderStats(); closeInfo(); if (S.drawer) refreshDrawer();
  flyTo(n.capital.x, n.capital.z, 36); mmDirty = true;
}
function openNations() {
  const pn = playerNations(), n = act();
  const rows = pn.map(p => `<div class="nrow ${p.id === n.id ? 'act' : ''}"><div class="flag">${flagSVG(p)}</div><div style="min-width:0"><div class="nn">${esc(p.name)}</div><div class="ns">${fmtPop(p.pop)} warga · ${money(p.treasury)} · approval ${Math.round(p.approval)}%</div></div><div class="na">${p.id === n.id ? '<span class="badge">Aktif</span>' : `<button class="btn sm pri" data-go="${p.id}">Pimpin</button>`}<button class="btn sm" data-tr="${p.id}" ${pn.length < 2 ? 'disabled' : ''}>${ico('send')} Transfer</button></div></div>`).join('');
  modal({
    title: 'Negara-negaraku', sub: `${esc(presName())} memimpin ${pn.length} dari maks. ${MAX_PLAYER_NATIONS} negara. Setiap negara punya kas, rakyat & approval sendiri.`, icon: 'crown',
    html: rows + `<div class="btns"><button class="btn pri f1" id="nFound" ${pn.length >= MAX_PLAYER_NATIONS ? 'disabled' : ''}>${S.unl.found ? `${ico('flag')} Dirikan Negara Baru · ${money(FOUND_COST)}` : `${ico('lock')} Negara baru terbuka di ${fmtPop(UNL.found)} penduduk`}</button><button class="btn" id="nRen">${ico('flag')} Ganti nama</button></div>`,
    onRender: box => {
      box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { closeModal(); switchNation(+b.dataset.go); });
      box.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => openTransfer(+b.dataset.tr));
      box.querySelector('#nFound').onclick = () => { if (!S.unl.found) return lockedModal('found'); closeModal(); S.drawer = 'land'; setTool('found'); refreshDrawer(); toast('Pilih lokasi negara baru', 'Klik lahan kosong yang luas di peta', 'info', 'flag'); };
      box.querySelector('#nRen').onclick = () => modal({ title: 'Ganti nama negara', icon: 'flag', html: `<input class="tinput" id="rnm" maxlength="32" value="${esc(n.name)}">`, buttons: [{ l: 'Batal' }, { l: 'Simpan', pri: 1, f: () => { n.name = ($('#rnm').value || '').trim() || n.name; renderNationCard(); } }] });
    }
  });
}
function openTransfer(fromId) {
  const from = S.nations[fromId], others = playerNations().filter(p => p.id !== fromId); let to = others[0]?.id;
  if (to == null) return;
  modal({
    title: `Transfer dana dari ${esc(from.name)}`, sub: `Saldo tersedia ${money(from.treasury)}`, icon: 'send',
    html: `<label class="flbl" style="margin-top:0">Negara tujuan</label><div class="row" style="flex-wrap:wrap" id="trTo">${others.map(o => `<button class="btn sm ${o.id === to ? 'pri' : ''}" data-to="${o.id}"><span class="flag sm">${flagSVG(o)}</span>${esc(o.name)}</button>`).join('')}</div>
      <label class="flbl">Jumlah</label><div class="row" style="flex-wrap:wrap">${[1e6, 5e6, 25e6, 100e6].map(v => `<button class="btn sm" data-v="${v}" ${from.treasury < v ? 'disabled' : ''}>${money(v)}</button>`).join('')}<button class="btn sm" data-v="half" ${from.treasury <= 0 ? 'disabled' : ''}>50% kas</button></div>`,
    onRender: box => {
      box.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { to = +b.dataset.to; box.querySelectorAll('[data-to]').forEach(x => x.classList.toggle('pri', x === b)); });
      box.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const v = b.dataset.v === 'half' ? Math.floor(from.treasury / 2) : +b.dataset.v; if (from.treasury < v || v <= 0) return; from.treasury -= v; S.nations[to].treasury += v; sfx('coin'); toast('Transfer berhasil', `${money(v)} → ${S.nations[to].name}`, 'info', 'send'); closeModal(); });
    }
  });
}
function relColor(r) { return r >= 70 ? 'linear-gradient(90deg,#34d399,#3ee0c8)' : r >= 40 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#fb7185,#f43f5e)'; }
function borderTiles(ai, me) {
  const L = [];
  for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
    const i = ix(x, z); if (owner[i] !== ai.id || tileB[i] || road[i]) continue;
    let near = false; for (let dz = -3; dz <= 3 && !near; dz++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Z = z + dz; if (inb(X, Z) && owner[ix(X, Z)] === me.id) { near = true; break; } }
    if (near && Math.hypot(x - ai.capital.x, z - ai.capital.z) > 6) L.push(i);
  }
  return L;
}
function openDiplo() {
  if (!S.unl.diplo) return lockedModal('diplo');
  const me = act(), ais = S.nations.filter(n => n.ai);
  const rows = ais.map(a => {
    const trading = me.trades.includes(a.id), inc = trading ? Math.sqrt(Math.max(1, me.pop) * Math.max(1, a.pop)) * 9 : 0;
    return `<div class="nrow" style="flex-wrap:wrap"><div class="flag">${flagSVG(a)}</div><div style="min-width:0;flex:1"><div class="nn">${esc(a.name)} ${a.allied ? '<span class="badge">Sekutu</span>' : ''} ${trading ? '<span class="badge" style="background:rgba(125,140,255,.18);color:#aab4ff">Mitra dagang</span>' : ''}</div><div class="ns">${esc(a.leader)} · ${fmtPop(a.pop)} warga · ${a.tiles} petak</div><div class="row" style="gap:8px"><div class="rel"><i style="width:${a.rel}%;background:${relColor(a.rel)}"></i></div><span style="font-size:11px;font-weight:800;color:var(--mut)">Hubungan ${Math.round(a.rel)}</span></div>${trading ? `<div class="ns up">Pendapatan dagang ≈ ${money(inc)}/bln</div>` : ''}</div>
      <div class="na" style="flex-basis:100%;justify-content:flex-start;margin-top:10px">
        ${trading ? `<button class="btn sm" data-a="cancel" data-id="${a.id}">Batalkan dagang</button>` : `<button class="btn sm pri" data-a="trade" data-id="${a.id}" ${a.rel < 35 ? 'disabled' : ''}>${ico('hand')} Perjanjian dagang · $1,5 jt</button>`}
        <button class="btn sm" data-a="aid" data-id="${a.id}">${ico('send')} Bantuan $1 jt</button>
        <button class="btn sm" data-a="ally" data-id="${a.id}" ${a.allied || a.rel < 75 || !trading ? 'disabled' : ''}>${ico('shield')} Aliansi · $5 jt</button>
        <button class="btn sm" data-a="land" data-id="${a.id}" ${a.rel < 50 ? 'disabled' : ''}>${ico('map')} Beli wilayah</button>
      </div></div>`;
  }).join('');
  modal({
    title: 'Diplomasi Internasional', sub: `Hubungan luar negeri ${esc(me.name)}. Dagang butuh hubungan ≥35, beli wilayah ≥50, aliansi ≥75 + mitra dagang.`, icon: 'globe', wide: 1, html: rows,
    onRender: box => box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = S.nations[+b.dataset.id], k = b.dataset.a;
      if (k === 'trade') { if (me.treasury < 1.5e6) return toast('Dana tidak cukup', '', 'bad', 'alert'); me.treasury -= 1.5e6; me.trades.push(a.id); a.trades.push(me.id); bump('trade'); a.rel = Math.min(100, a.rel + 5); toast('Perjanjian dagang ditandatangani', `${me.name} × ${a.name}`, 'gold', 'hand'); addNews(`${me.name} dan ${a.name} menandatangani perjanjian dagang.`); sfx('coin'); }
      if (k === 'cancel') { me.trades = me.trades.filter(x => x !== a.id); a.trades = a.trades.filter(x => x !== me.id); a.rel -= 10; if (a.allied) { a.allied = false; me.allied = S.nations.some(o => o.ai && o.allied); } }
      if (k === 'aid') { if (me.treasury < 1e6) return toast('Dana tidak cukup', '', 'bad', 'alert'); me.treasury -= 1e6; a.rel = Math.min(100, a.rel + 8); sfx('coin'); toast(`Bantuan dikirim ke ${a.name}`, 'Hubungan +8', 'info', 'send'); }
      if (k === 'ally') { if (me.treasury < 5e6) return toast('Dana tidak cukup', '', 'bad', 'alert'); me.treasury -= 5e6; a.allied = true; me.allied = true; me.apprMod += 4; toast(`Aliansi dengan ${a.name}!`, 'Approval naik & dagang +30%', 'gold', 'shield'); addNews(`${me.name} resmi bersekutu dengan ${a.name}.`); sfx('coin'); }
      if (k === 'land') {
        const L = borderTiles(a, me); if (!L.length) { toast('Tidak berbatasan', `${a.name} tidak berbatasan langsung dengan ${me.name}`, 'wa', 'map'); return; }
        const take = L.slice(0, 80), price = Math.round(take.length * 40000 * (1.6 - a.rel / 100));
        modal({ title: `Beli wilayah dari ${esc(a.name)}`, sub: `${take.length} petak di perbatasan · harga ${money(price)} · hubungan −12`, icon: 'map', buttons: [{ l: 'Batal' }, { l: `Beli · ${money(price)}`, pri: 1, f: () => { if (me.treasury < price) { toast('Dana tidak cukup', '', 'bad', 'alert'); return; } me.treasury -= price; for (const i of take) owner[i] = me.id; me.tiles += take.length; a.tiles -= take.length; a.rel -= 12; S.terrDirty = true; sfx('coin'); toast('Wilayah berpindah tangan', `${take.length} petak kini milik ${me.name}`, 'gold', 'map'); addNews(`${me.name} membeli ${take.length} petak wilayah dari ${a.name}.`); } }] });
        return;
      }
      openDiplo();
    })
  });
}
function openPolicy() {
  const n = act();
  const polRows = () => Object.keys(POL).map(k => `<div class="tog ${n.pol[k] ? 'on' : ''}" data-p="${k}"><div class="sw"></div><div><div class="tt">${POL[k].n}</div><div class="td">${POL[k].d}</div></div><div class="tc">${POL[k].cost(n) ? '-' + money(POL[k].cost(n)) + '/bln' : 'Gratis'}</div></div>`).join('');
  const loans = () => n.loans.length ? n.loans.map((L, i) => `<div class="kv"><span>Pinjaman ${money(L.p)} · sisa ${L.left} bln</span><span><button class="btn sm" data-rp="${i}">Lunasi ${money(L.pay * L.left)}</button></span></div>`).join('') : '<div class="ms">Tidak ada pinjaman aktif.</div>';
  modal({
    title: 'Kebijakan & Anggaran', sub: `Atur pajak, program pemerintah, dan pembiayaan ${esc(n.name)}.`, icon: 'scale', wide: 1,
    html: `<div class="grid2" style="align-items:start"><div>
      <div class="box"><div class="row" style="justify-content:space-between"><div><div class="lb">Tarif pajak</div><div class="vl" id="pTax">${n.tax}%</div></div><div style="text-align:right"><div class="lb">Pajak warga / bln</div><div class="vl up" id="pInc">${money(n.rate.inc.tax || 0)}</div></div></div>
      <input type="range" min="0" max="25" step="1" value="${n.tax}" id="pRange" style="margin-top:14px"><div class="ms" id="pNote" style="margin-top:10px"></div></div>
      <span class="flbl">Pinjaman Bank Dunia</span><div class="box"><div class="row" style="flex-wrap:wrap;gap:6px">${[10e6, 50e6, 250e6].map(v => `<button class="btn sm" data-ln="${v}" ${n.loans.length >= 3 ? 'disabled' : ''}>${ico('bank')} ${money(v)}</button>`).join('')}</div><div class="ms" style="margin-top:8px">Cicilan 60 bulan, total bunga 30%. Maks. 3 pinjaman.</div><div class="lst" style="margin-top:8px" id="pLoans">${loans()}</div></div>
    </div><div><span class="flbl" style="margin-top:0">Program pemerintah</span><div id="pPol">${polRows()}</div></div></div>`,
    onRender: box => {
      const r = box.querySelector('#pRange'), note = () => { const t = +r.value; box.querySelector('#pTax').textContent = t + '%'; box.querySelector('#pInc').textContent = money(n.cap ? (n.rate.inc.tax || 0) / Math.max(1, n.tax) * t : 0); box.querySelector('#pNote').innerHTML = t > 14 ? '<span class="dn">Pajak tinggi menurunkan kebahagiaan & minat warga pindah.</span>' : t < 7 ? '<span class="up">Pajak rendah membuat warga bahagia, tapi kas tumbuh lambat.</span>' : 'Tarif seimbang.'; };
      r.oninput = () => { n.tax = +r.value; note(); }; note();
      const bindPol = () => box.querySelectorAll('[data-p]').forEach(el => el.onclick = () => { const k = el.dataset.p; n.pol[k] = !n.pol[k]; sfx('click'); box.querySelector('#pPol').innerHTML = polRows(); bindPol(); markAllDirty(); });
      bindPol();
      box.querySelectorAll('[data-ln]').forEach(b => b.onclick = () => { const v = +b.dataset.ln; if (n.loans.length >= 3) return; n.loans.push({ p: v, pay: v * 1.3 / 60, left: 60 }); n.treasury += v; sfx('coin'); toast('Pinjaman cair', `+${money(v)} masuk kas`, 'info', 'bank'); closeModal(); openPolicy(); });
      box.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { const L = n.loans[+b.dataset.rp], c = L.pay * L.left; if (n.treasury < c) { toast('Dana tidak cukup', '', 'bad', 'alert'); return; } n.treasury -= c; n.loans.splice(+b.dataset.rp, 1); sfx('coin'); closeModal(); openPolicy(); });
    }
  });
}
function drawChart(cv, data, color, fmtF) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
  const x = cv.getContext('2d'); x.scale(dpr, dpr); const Wd = r.width, Hd = r.height, pad = 6;
  x.clearRect(0, 0, Wd, Hd);
  if (data.length < 2) { x.fillStyle = '#8fa4c6'; x.font = '600 12px Manrope'; x.fillText('Data muncul setelah beberapa bulan…', 10, Hd / 2); return; }
  let mn = Math.min(...data), mx = Math.max(...data); if (mx === mn) { mx += 1; mn -= 1; }
  const X = i => pad + i / (data.length - 1) * (Wd - pad * 2), Y = v => Hd - 18 - (v - mn) / (mx - mn) * (Hd - 34);
  x.strokeStyle = 'rgba(150,190,255,.1)'; x.lineWidth = 1; for (let k = 0; k < 4; k++) { const y = 10 + k * (Hd - 28) / 3; x.beginPath(); x.moveTo(0, y); x.lineTo(Wd, y); x.stroke(); }
  const gr = x.createLinearGradient(0, 0, 0, Hd); gr.addColorStop(0, color + '55'); gr.addColorStop(1, color + '00');
  x.beginPath(); data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v))); x.lineTo(X(data.length - 1), Hd); x.lineTo(X(0), Hd); x.closePath(); x.fillStyle = gr; x.fill();
  x.beginPath(); data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v))); x.strokeStyle = color; x.lineWidth = 2.2; x.lineJoin = 'round'; x.stroke();
  x.fillStyle = '#c6d4ec'; x.font = '700 11px Manrope'; x.fillText(fmtF(mx), 6, 12); x.fillText(fmtF(data[data.length - 1]), Wd - x.measureText(fmtF(data[data.length - 1])).width - 6, Hd - 4);
}
function openStats(tab = 'sum') {
  const n = act(), L = n.last || { inc: n.rate.inc, exp: n.rate.exp };
  const inc = L.inc || {}, exp = L.exp || {}, kv = (a, v, c) => `<div class="kv"><span>${a}</span><span class="${c || ''}">${v}</span></div>`;
  const tabs = `<div class="tabs">${[['sum', 'Ringkasan'], ['fin', 'Keuangan'], ['news', 'Kabar Negara']].map(t => `<button data-tab="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'sum') body = `<div class="grid3"><div class="box"><div class="lb">Kas</div><div class="vl">${money(n.treasury)}</div></div><div class="box"><div class="lb">Penduduk</div><div class="vl">${fmtPop(n.pop)}</div></div><div class="box"><div class="lb">Approval</div><div class="vl">${Math.round(n.approval)}%</div></div></div>
    <span class="flbl">Kas negara</span><canvas class="chart" id="c1"></canvas><div class="grid2"><div><span class="flbl">Penduduk</span><canvas class="chart" id="c2"></canvas></div><div><span class="flbl">Approval presiden</span><canvas class="chart" id="c3"></canvas></div></div>`;
  else if (tab === 'fin') body = `<div class="ms" style="margin-bottom:10px">${n.last ? 'Realisasi bulan lalu' : 'Proyeksi bulan ini'}</div><div class="grid2" style="align-items:start"><div class="box"><div class="lb" style="margin-bottom:6px">Pendapatan</div><div class="lst">${kv('Pajak warga', money(inc.tax || 0), 'up')}${kv('Bisnis & komersial', money(inc.com || 0), 'up')}${kv('Industri', money(inc.ind || 0), 'up')}${kv('Pariwisata', money(inc.tour || 0), 'up')}${kv('Perdagangan', money(inc.trade || 0), 'up')}${kv('<b>Total</b>', `<b>${money(sumObj(inc))}</b>`, 'up')}</div></div>
    <div class="box"><div class="lb" style="margin-bottom:6px">Pengeluaran</div><div class="lst">${kv('Perawatan bangunan & jalan', money(exp.upk || 0), 'dn')}${kv('Program pemerintah', money(exp.pol || 0), 'dn')}${kv('Cicilan pinjaman', money(exp.loan || 0), 'dn')}${kv('<b>Total</b>', `<b>${money(sumObj(exp))}</b>`, 'dn')}</div></div></div>
    <div class="box" style="margin-top:10px"><div class="row" style="justify-content:space-between"><div class="lb">Saldo bersih / bulan</div><div class="vl ${sumObj(inc) - sumObj(exp) >= 0 ? 'up' : 'dn'}">${money(sumObj(inc) - sumObj(exp))}</div></div></div>`;
  else body = S.news.length ? S.news.map(x => `<div class="news"><b>${dateStr(x.d)}</b>${esc(x.t)}</div>`).join('') : '<div class="ms">Belum ada kabar.</div>';
  modal({
    title: `Statistik ${esc(n.name)}`, sub: `${dateStr(S.day)} · ${n.list.length} bangunan · ${n.tiles} petak wilayah`, icon: 'chart', wide: 1, html: tabs + body,
    onRender: box => {
      box.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openStats(b.dataset.tab));
      if (tab === 'sum') requestAnimationFrame(() => { drawChart(box.querySelector('#c1'), n.hist.map(h => h.t), '#3ee0c8', money); drawChart(box.querySelector('#c2'), n.hist.map(h => h.p), '#8d9bff', v => fmtPop(v)); drawChart(box.querySelector('#c3'), n.hist.map(h => h.a), '#f472b6', v => Math.round(v) + '%'); });
    }
  });
}
function openSettings() {
  const tg = (k, t, d) => `<div class="tog ${S[k] ? 'on' : ''}" data-k="${k}"><div class="sw"></div><div><div class="tt">${t}</div><div class="td">${d}</div></div></div>`;
  modal({
    title: 'Menu & Pengaturan', icon: 'gear', wide: 1,
    html: `<div class="grid2" style="align-items:start"><div>${tg('dayNight', 'Siklus siang & malam', 'Lampu kota menyala di malam hari')}${tg('sfx', 'Efek suara', 'Suara klik, bangun & pemasukan')}${tg('showGrid', 'Grid saat membangun', 'Bantu menata kota rapi')}
      <div class="btns"><button class="btn pri f1" id="sSave">${ico('save')} Simpan</button><button class="btn f1" id="sNew">${ico('plus')} Permainan baru</button></div></div>
      <div class="box"><div class="lb" style="margin-bottom:6px">Kontrol</div><div class="lst" style="font-size:12px">
      <div class="kv"><span>Geser peta</span><span>Klik kanan + geser · WASD</span></div><div class="kv"><span>Putar / miring</span><span>Klik tengah · Alt + geser · Q / E</span></div>
      <div class="kv"><span>Zoom</span><span>Scroll · + / −</span></div><div class="kv"><span>Putar bangunan</span><span>R</span></div><div class="kv"><span>Batal alat</span><span>Klik kanan · Esc</span></div>
      <div class="kv"><span>Peta politik</span><span>Tab</span></div><div class="kv"><span>Jeda</span><span>Spasi</span></div><div class="kv"><span>Kategori</span><span>1–9 · B · L · V</span></div></div></div></div>`,
    onRender: box => {
      box.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { S[el.dataset.k] = !S[el.dataset.k]; el.classList.toggle('on', S[el.dataset.k]); renderMMBar(); setTool(S.tool.mode, S.tool.type, true); });
      box.querySelector('#sSave').onclick = () => saveGame(false);
      box.querySelector('#sNew').onclick = () => modal({ title: 'Mulai permainan baru?', sub: 'Progres saat ini tetap tersimpan sampai kamu memulai negara baru dari layar judul.', icon: 'alert', buttons: [{ l: 'Batal' }, { l: 'Ke layar judul', dan: 1, f: () => { saveGame(true); location.reload(); } }] });
    }
  });
}

/* =====================================================================
   GOVERNANCE · DIFFICULTY · CRISIS · ELECTIONS · ENDINGS · AI · EVENTS
   ===================================================================== */
Object.assign(I, {
  car: '<path d="M5 17h14M6 17v2M18 17v2"/><path d="M4 17v-4l2-5h12l2 5v4z"/><path d="M7.5 13.5h.01M16.5 13.5h.01"/>',
  zone: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M14 17h6M17 14v6"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  quake: '<path d="M2 12h4l2-5 3 10 3-12 2 7h6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
});

/* ---------------- difficulty & mode ---------------- */
// cash: start funds ×, upk: player upkeep ×, dem: public demand per month, appLo: impeachment threshold,
// crisis: months in deficit before bankruptcy, coal: coalition rescues allowed, dis: disaster frequency ×,
// ai: AI diplomatic aggression ×, vic: population needed for the Adidaya victory, sc: score multiplier
const DIFF = {
  easy: { n: 'Mudah', d: 'Modal besar, rakyat sabar, bencana jarang', cash: 1.4, upk: 0.85, dem: 0.45, demMax: 30, appLo: 18, crisis: 9, coal: 99, dis: 0.5, ai: 0.6, vic: 150e3, sc: 0.75 },
  normal: { n: 'Normal', d: 'Tantangan seimbang', cash: 1, upk: 1, dem: 0.8, demMax: 45, appLo: 25, crisis: 6, coal: 1, dis: 1, ai: 1, vic: 250e3, sc: 1 },
  hard: { n: 'Sulit', d: 'Modal kecil, rakyat menuntut, tetangga agresif', cash: 0.7, upk: 1.15, dem: 1.1, demMax: 55, appLo: 30, crisis: 4, coal: 0, dis: 1.5, ai: 1.5, vic: 400e3, sc: 1.5 },
};
const MODES = { career: { n: 'Karier', d: 'Ada kemenangan & kekalahan' }, sandbox: { n: 'Bebas', d: 'Santai, tanpa game over' } };
const TERM_MONTHS = 240;                       // masa bakti 20 tahun (4 periode)
const dif = () => DIFF[S.diff] || DIFF.normal;
const career = () => S.mode === 'career';
const homeN = () => S.nations[0];
const totalPop = () => playerNations().reduce((a, n) => a + n.pop, 0);
const relieve = (n, v) => { if (n && !n.ai) n.dem = Math.max(0, (n.dem || 0) - v); };

/* ---------------- modal queue ---------------- */
// Several systems may want the player's attention in the same month; show them one after another.
function queueModal(fn) { S.mq.push(fn); }
function pumpModal() { if (S.mq.length && $('#modal').classList.contains('hidden') && S.started) S.mq.shift()(); }
function decide(o) {
  S.paused = true; renderTime();
  modal({ ...o, noClose: 1, choices: o.choices.map(c => ({ l: c.l, f: () => { S.paused = false; renderTime(); c.f(); } })) });
}

/* ---------------- timed effects (modifiers) ---------------- */
const MODK = { tax: 'Pajak warga', com: 'Bisnis', ind: 'Industri', tour: 'Pariwisata', trade: 'Perdagangan', upk: 'Biaya perawatan', hap: 'Kebahagiaan', appr: 'Approval' };
function addMod(n, id, t, k, months) { n.mods = (n.mods || []).filter(m => m.id !== id); n.mods.push({ id, t, k, left: months }); n.dirty = true; }
function dropMods(n, prefix) { n.mods = (n.mods || []).filter(m => !m.id.startsWith(prefix)); }
function tickMods(n) { if (!n.mods || !n.mods.length) return; for (const m of n.mods) m.left--; n.mods = n.mods.filter(m => m.left > 0); }
function modText(k) {
  return Object.entries(k).map(([key, v]) => key === 'hap' ? `${MODK[key]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`
    : key === 'appr' ? `${MODK[key]} ${v > 0 ? '+' : ''}${v}` : `${MODK[key]} ${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`).join(' · ');
}
// Combined multipliers for a nation: timed effects, trade-off policies, difficulty and traffic.
function natMods(n) {
  const M = { tax: 1, com: 1, ind: 1, tour: 1, trade: 1, upk: 1, hap: 0, appr: 0 };
  for (const m of n.mods || []) for (const k in m.k) { if (k === 'hap' || k === 'appr') M[k] += m.k[k]; else M[k] *= m.k[k]; }
  const p = n.pol;
  if (p.progtax) { M.tax *= 1.15; M.appr -= 3; }
  if (p.privat) { M.upk *= 0.8; M.hap -= 0.05; }
  if (p.fuel) M.appr += 6;
  if (p.conscript) M.appr -= 4;
  if (!n.ai) M.upk *= dif().upk;
  const over = Math.max(0, (n.cong || 0) - 1);
  if (over > 0) { M.hap -= Math.min(0.15, over * 0.12); M.com *= 1 - Math.min(0.3, over * 0.2); }
  return M;
}

/* ---------------- public demand · crisis · impeachment ---------------- */
function updateDemand(n) {
  // growth counts only above the best population reached so far (recovering from a dip is not progress)
  const peak = Math.max(1, n.popM || n.pop), g = Math.max(0, n.pop - peak) / peak; n.popM = Math.max(peak, n.pop);
  if (!career()) { n.dem = Math.max(0, (n.dem || 0) - 2); return; }
  // Demand grows every month (slower once the nation is large) and is relieved by growth: 1% growth/month = −3 points.
  const D = dif(), before = n.dem || 0, rate = D.dem * clamp(1 - totalPop() / D.vic, 0.25, 1);
  n.dem = clamp(before + rate - clamp(g * 300, 0, 8), 0, D.demMax);
  if (n.id === S.active) {
    if (before < 15 && n.dem >= 15) toast('Rakyat mulai tidak sabar', 'Tuntutan rakyat naik — tumbuhkan penduduk & selesaikan program kerja', 'wa', 'users');
    if (before < 30 && n.dem >= 30) toast('Tuntutan rakyat tinggi!', `Approval tergerus ${Math.round(n.dem)} poin. Rakyat menuntut kemajuan nyata`, 'bad', 'users');
  }
}
function checkCrisis(n) {
  if (!career()) { n.debtM = 0; n.lowM = 0; return; }
  const D = dif();
  n.debtM = n.treasury < 0 ? (n.debtM || 0) + 1 : 0;
  n.lowM = n.approval < D.appLo ? (n.lowM || 0) + 1 : 0;
  if (n.debtM >= D.crisis) return nationFails(n, 'bankrupt');
  if (n.lowM >= 6) return nationFails(n, 'impeach');
  if (n.debtM === Math.ceil(D.crisis / 2) && S.day - (n.imfDay ?? -9999) > 1800) queueModal(() => imfModal(n));
  else if (n.debtM === 1 && n.id === S.active) toast('Peringatan krisis fiskal', `Kas minus ${D.crisis} bulan berturut-turut = negara bangkrut`, 'bad', 'alert');
  if (n.lowM === 2) queueModal(() => protestModal(n));
  if (n.lowM === 4) toast('Mosi tidak percaya disiapkan!', `${esc(n.name)}: naikkan approval di atas ${D.appLo}% dalam 2 bulan`, 'bad', 'alert');
}
function imfModal(n) {
  if (S.over || n.ai) return;
  const amt = Math.round(Math.max(5e6, -n.treasury + Math.abs(Math.min(0, n.rate.net)) * 6 + 2e6) / 1e5) * 1e5;
  decide({
    title: 'Krisis Fiskal', sub: `${esc(n.name)} defisit ${n.debtM} bulan berturut-turut`, icon: 'alert',
    html: `<p>Kas negara minus <b>${money(-n.treasury)}</b>. Jika kas tetap minus selama <b>${dif().crisis} bulan berturut-turut</b>, negara dinyatakan <b>bangkrut</b> dan masa jabatanmu berakhir.</p><p style="margin-top:8px">Dana Moneter Internasional menawarkan bailout <b>${money(amt)}</b> (cicilan 72 bulan, bunga 40%) dengan syarat penghematan ketat selama 12 bulan.</p>`,
    choices: [
      { l: `Terima bailout ${money(amt)} — perawatan −10%, kebahagiaan −4%, approval −6 (12 bln)`, f: () => { n.treasury += amt; n.loans.push({ p: amt, pay: amt * 1.4 / 72, left: 72 }); n.imfDay = S.day; addMod(n, 'imf', 'Syarat penghematan IMF', { upk: 0.9, hap: -0.04, appr: -6 }, 12); addNews(`${n.name} menerima bailout IMF ${money(amt)}.`); toast('Bailout IMF cair', `+${money(amt)} · syarat penghematan berlaku`, 'wa', 'bank'); } },
      { l: 'Tolak — atasi sendiri (naikkan pajak, kurangi program, jual aset)', f: () => toast('Bailout ditolak', 'Waktu terus berjalan — perbaiki kas sebelum bangkrut', 'bad', 'alert') },
    ]
  });
}
function protestModal(n) {
  if (S.over || n.ai) return;
  const cost = Math.max(1e6, Math.round(Math.max(0, n.treasury) * 0.05 / 1e5) * 1e5);
  decide({
    title: 'Demo Besar-besaran', sub: `${esc(n.name)} · approval ${Math.round(n.approval)}%`, icon: 'users',
    html: `<p>Ribuan warga turun ke jalan menuntut presiden mundur. Approval sudah di bawah <b>${dif().appLo}%</b> selama 2 bulan. Jika bertahan hingga <b>6 bulan</b>, parlemen akan memakzulkanmu.</p>`,
    choices: [
      { l: `Reshuffle kabinet & janji reformasi · ${money(cost)} (approval +9)`, f: () => { n.treasury -= cost; n.apprMod += 9; addNews(`${presName()} merombak kabinet ${n.name}.`); } },
      { l: 'Bubarkan paksa (approval −4, kebahagiaan −3% selama 6 bln)', f: () => { n.apprMod -= 4; addMod(n, 'represi', 'Represi aparat', { hap: -0.03 }, 6); addNews(`Aparat membubarkan demo di ${n.name}.`); } },
      { l: 'Abaikan', f: () => { } },
    ]
  });
}

/* ---------------- game over · secession ---------------- */
const OVER = {
  bankrupt: { t: 'Negara Bangkrut', i: 'coins', d: n => `Kas ${esc(n.name)} minus selama ${dif().crisis} bulan berturut-turut. Kreditor internasional mengambil alih keuangan negara dan parlemen memberhentikanmu.` },
  impeach: { t: 'Dilengserkan', i: 'alert', d: n => `Approval di bawah ${dif().appLo}% selama 6 bulan. Parlemen meloloskan mosi tidak percaya dan memakzulkanmu.` },
  election: { t: 'Kalah Pemilu', i: 'vote', d: n => `Rakyat ${esc(n.name)} memilih oposisi. Masa jabatanmu berakhir.` },
};
function nationFails(n, reason) {
  if (n.ai || S.over) return;
  if (n.id === homeN().id) return gameOver(reason);
  // A secondary nation breaks away and becomes independent (AI).
  n.ai = true; n.pers = 'pedagang'; n.rel = 25; n.leader = 'Presiden Sementara ' + ['Adiwangsa', 'Larasati', 'Mahendra', 'Kirana', 'Satria'][n.id % 5];
  n.treasury = Math.max(n.treasury, 2e6); n.dem = 0; n.debtM = 0; n.lowM = 0; n.mods = []; n.sec = true;
  for (const p of playerNations()) { p.trades = p.trades.filter(x => x !== n.id); }
  n.trades = n.trades.filter(x => S.nations[x]?.ai);
  if (S.active === n.id) switchNation(homeN().id);
  renderNationCard(); renderMenu(); S.terrDirty = true;
  addNews(`${n.name} memisahkan diri dan menjadi negara merdeka.`);
  queueModal(() => modal({ title: `${esc(n.name)} memisahkan diri`, sub: OVER[reason].t, icon: 'flag', html: `<p>${OVER[reason].d(n)}</p><p style="margin-top:8px">Negara ini kini berdiri sendiri di luar kepemimpinanmu. Negara-negaramu yang lain tetap kamu pimpin.</p>`, buttons: [{ l: 'Mengerti', pri: 1 }] }));
}
function gameOver(reason) {
  if (S.over) return;
  S.over = { r: reason, d: S.day }; S.paused = true; renderTime();
  addNews(`${presName()} lengser: ${OVER[reason].t}.`); saveGame(true);
  queueModal(showGameOver);
}
function showGameOver() {
  if (!S.over) return;
  const o = OVER[S.over.r], n = homeN();
  modal({
    title: o.t, sub: `Masa jabatan berakhir · ${dateStr(S.over.d)}`, icon: o.i, noClose: 1, wide: 1,
    html: `<p>${o.d(n)}</p>${legacyHTML()}`,
    buttons: [
      { l: `${ico('sparkle')} Lanjut di mode bebas`, f: () => { S.over = null; S.mode = 'sandbox'; S.paused = false; renderTime(); addNews('Permainan dilanjutkan dalam mode bebas.'); saveGame(true); toast('Mode bebas aktif', 'Tanpa kondisi kalah — bangun sesukamu', 'info', 'sparkle'); } },
      { l: `${ico('plus')} Main lagi`, pri: 1, f: () => { saveGame(true); location.reload(); } },
    ]
  });
}

/* ---------------- victory · term end · legacy ---------------- */
function victoryState() {
  const n = homeN(), D = dif();
  return [
    { t: 'Tuntaskan semua program kerja', ok: curChapter() < 0, v: `${S.mis.length}/${MISSIONS.length}` },
    { t: `Total penduduk negaramu ≥ ${fmtPop(D.vic)}`, ok: totalPop() >= D.vic, v: fmtPop(totalPop()) },
    { t: 'Ekonomi (PDB) nomor 1 di dunia', ok: rankOf(n, 'gdp') === 1, v: `#${rankOf(n, 'gdp')}` },
    { t: 'Approval negara utama ≥ 55%', ok: n.approval >= 55, v: `${Math.round(n.approval)}%` },
  ];
}
function checkEndings(m) {
  if (!career() || S.over) return;
  if (!S.won && victoryState().every(c => c.ok)) {
    S.won = S.day; addNews(`${homeN().name} diakui dunia sebagai Negara Adidaya!`); sfx('coin');
    return queueModal(() => endingModal('Negara Adidaya!', 'Kemenangan · semua target tercapai', 'trophy', `<p><b>${esc(homeN().name)}</b> kini diakui dunia sebagai negara adidaya — ekonomi terbesar, rakyat yang besar dan percaya pada pemimpinnya.</p>`));
  }
  const age = m - Math.floor(homeN().founded / 30);
  if (!S.ended && age >= TERM_MONTHS) {
    S.ended = S.day; addNews(`Masa bakti 20 tahun ${presName()} berakhir.`);
    queueModal(() => endingModal('Akhir Masa Bakti', '20 tahun memimpin · 4 periode', 'crown', `<p>Setelah 20 tahun dan 4 periode, masa baktimu berakhir. Sejarah akan mengenangmu sebagai:</p>`));
  }
}
function endingModal(title, sub, icon, intro) {
  S.paused = true; renderTime();
  modal({
    title, sub, icon, noClose: 1, wide: 1, html: intro + legacyHTML(),
    buttons: [{ l: `${ico('play')} Lanjutkan (mode bebas)`, pri: 1, f: () => { S.mode = 'sandbox'; S.paused = false; renderTime(); saveGame(true); } }]
  });
}
function styleOf() {
  const n = homeN(), st = S.st, inc = n.last?.inc || n.rate.inc || {}, tot = Math.max(1, sumObj(inc)), months = Math.max(1, st.months);
  const avgAppr = st.months ? st.apprSum / st.months : n.approval, peak = Math.max(st.peak, totalPop()), allies = S.nations.filter(a => a.ai && a.allied).length;
  const greens = playerNations().reduce((a, p) => a + p.list.filter(b => b.type === 'park' || b.type === 'forest' || b.type === 'solar' || b.type === 'wind').length, 0);
  const tiles = playerNations().reduce((a, p) => a + p.tiles, 0), founded = S.nations.filter(x => x.founded > 0).length;
  const c = [
    ['Bapak Pembangunan', 'Kota-kotamu tumbuh pesat dan megah.', peak / dif().vic * 1.2],
    ['Pemimpin Rakyat', 'Rakyat mencintaimu sepanjang masa jabatan.', (avgAppr - 55) / 25],
    ['Presiden Hijau', 'Kamu membangun negeri yang bersih dan lestari.', st.greenM / months + greens / 250],
    ['Diplomat Ulung', 'Dunia mengenalmu sebagai juru damai.', (S.cnt.trade + allies * 2) / 5 + (st.relSum / months - 50) / 50],
    ['Raja Pariwisata', 'Negerimu menjadi destinasi impian dunia.', (inc.tour || 0) / tot * 3.2],
    ['Sang Industrialis', 'Cerobong pabrikmu menggerakkan ekonomi.', (inc.ind || 0) / tot * 2.6],
    ['Sang Ekspansionis', 'Wilayahmu membentang dari pantai ke pantai.', tiles / 3500 + founded * 0.25],
  ];
  return c.reduce((a, b) => b[2] > a[2] ? b : a);
}
function scoreOf() {
  const st = S.st, n = homeN(), avgAppr = st.months ? st.apprSum / st.months : n.approval;
  const gdp = playerNations().reduce((a, p) => a + sumObj(p.rate.inc), 0);
  const landmarks = playerNations().reduce((a, p) => a + p.list.filter(b => BT[b.type].c === 'lm' && b.prog >= 1).length, 0);
  const parts = [
    ['Penduduk puncak', Math.round(Math.max(st.peak, totalPop()) / 100)],
    ['Ekonomi (PDB per bulan)', Math.round(gdp / 20000)],
    ['Rata-rata approval', Math.round(avgAppr * 20)],
    ['Lama menjabat', Math.round(S.day / 360 * 40)],
    ['Program kerja tuntas', S.mis.length * 80],
    ['Landmark nasional', landmarks * 300],
    ['Negara didirikan', S.nations.filter(x => x.founded > 0).length * 400],
  ];
  if (S.won) parts.push(['Kemenangan Adidaya', 5000]);
  const base = parts.reduce((a, p) => a + p[1], 0);
  return { parts, total: Math.round(base * dif().sc), mult: dif().sc, n };
}
function legacyHTML() {
  const [title, desc] = styleOf(), sc = scoreOf();
  return `<div class="box" style="margin-top:14px;display:flex;gap:12px;align-items:center"><div class="tri">${ico('trophy')}</div><div><div class="lb">Gelar sejarah</div><div class="vl">${title}</div><div class="ms">${desc}</div></div></div>
  <div class="grid2" style="margin-top:10px;align-items:start"><div class="box"><div class="lb" style="margin-bottom:6px">Rincian skor</div><div class="lst">${sc.parts.map(p => `<div class="kv"><span>${p[0]}</span><span>${fmtPop(p[1])}</span></div>`).join('')}<div class="kv"><span>Pengali kesulitan (${dif().n})</span><span>×${String(sc.mult).replace('.', ',')}</span></div></div></div>
  <div class="box"><div class="lb">Skor akhir</div><div class="vl" style="font-size:30px">${fmtPop(sc.total)}</div><div class="ms" style="margin-top:6px">${esc(presName())} · ${esc(homeN().name)} · ${Math.floor(S.day / 360)} tahun menjabat · ${MODES[S.mode]?.n || ''} ${dif().n}</div></div></div>`;
}

/* ---------------- world ranking ---------------- */
const gdpOf = n => sumObj(n.rate?.inc);
function ranking(key) { const f = key === 'pop' ? (n => n.pop) : key === 'hap' ? (n => n.happy) : gdpOf; return S.nations.slice().sort((a, b) => f(b) - f(a)); }
function rankOf(n, key) { return ranking(key).indexOf(n) + 1; }

/* ---------------- AI personalities · upgrades · diplomacy ---------------- */
const PERS = {
  agresif: { n: 'Agresif', rel: 35, cap: 2200, exp: 2, d: 'Gemar ekspansi & menuntut wilayah' },
  pedagang: { n: 'Pedagang', rel: 55, cap: 1600, exp: 3, d: 'Mengutamakan perdagangan' },
  damai: { n: 'Damai', rel: 62, cap: 1400, exp: 4, d: 'Bersahabat & suka bekerja sama' },
};
const persOf = n => PERS[n.pers] || PERS.pedagang;
function assignPersonalities() {
  const ks = Object.keys(PERS).sort(() => Math.random() - 0.5); let k = 0;
  for (const n of S.nations) if (n.ai && !PERS[n.pers]) n.pers = ks[k++ % ks.length];
}
function quietUpgrade(b) {
  b._pool.remove(b); S.emitters = S.emitters.filter(e => e.b !== b);
  b.level++; b.vis = 0.3; b.upg = true; attachVisual(b); S.building.push(b); markAllDirty();
}
function aiUpgrade(n) {
  const c = n.list.filter(b => b.prog >= 1 && b.vis >= 1 && !b.dmg && b.level < (BT[b.type].lv || 1)); if (!c.length) return false;
  const b = c[Math.floor(Math.random() * c.length)], cost = upgradeCost(b);
  if (n.treasury < cost + 1e6) return false;
  n.treasury -= cost; quietUpgrade(b); return true;
}
const hasDeterrence = n => !!(n.pol.conscript || n.list.some(b => b.type === 'military' && b.prog >= 1));
function touchesNation(a, id) {
  for (let i = 0; i < MAP * MAP; i++) {
    if (owner[i] !== a.id) continue; const x = i % MAP, z = (i / MAP) | 0;
    for (const [dx, dz] of DIRS) if (inb(x + dx, z + dz) && owner[ix(x + dx, z + dz)] === id) return true;
  }
  return false;
}
const tradesWithPlayer = a => playerNations().some(p => p.trades.includes(a.id));
function endTrade(a) {
  for (const p of playerNations()) p.trades = p.trades.filter(x => x !== a.id);
  a.trades = a.trades.filter(x => S.nations[x]?.ai); a.allied = false;
  for (const p of playerNations()) p.allied = S.nations.some(o => o.ai && o.allied);
}
function applySanctions(a) {
  a.sanc = 12;
  for (const p of playerNations()) addMod(p, 'sanksi' + a.id, `Sanksi ekonomi ${a.name}`, { tour: 0.75, trade: 0.85 }, 12);
  addNews(`${a.name} menjatuhkan sanksi ekonomi.`);
}
function makePeace(a) {
  for (const p of playerNations()) { dropMods(p, 'tarif' + a.id); dropMods(p, 'sanksi' + a.id); }
  a.sanc = 0; a.rel = Math.min(100, a.rel + 10);
}
function aiFriction() {
  for (const a of S.nations) {
    if (!a.ai) continue;
    if (a.sanc > 0) a.sanc--;
    if (a.pers === 'agresif' && playerNations().some(p => touchesNation(a, p.id))) a.rel = Math.max(0, a.rel - 0.5 * dif().ai);
  }
}
// Returns a function that shows one AI-initiated diplomatic event, or null.
function aiDiplomacy() {
  if (!S.unl.diplo || S.over) return null;
  const me = act(); if (!me || me.ai) return null;
  const D = dif(), deter = hasDeterrence(me);
  for (const a of S.nations.filter(x => x.ai).sort(() => Math.random() - 0.5)) {
    if (Math.random() > 0.08 * D.ai * (a.pers === 'agresif' ? 1.5 : 1)) continue;
    const trading = tradesWithPlayer(a);
    if (a.rel < 30 && trading) return () => tariffEvent(a);
    if (a.rel < 22 && !trading && !a.sanc) return () => sanctionEvent(a);
    if (a.pers === 'agresif' && a.rel < 50 && !(deter && Math.random() < 0.75)) { const L = borderTiles(me, a).slice(0, 30); if (L.length >= 6) return () => demandEvent(a, me, L, deter); }
    if (a.treasury < 2e6) return () => aidRequest(a, me);
    if (a.pers === 'pedagang' && a.rel >= 50 && !trading) return () => tradeOffer(a, me);
    if (a.pers !== 'agresif' && a.rel >= 80 && trading && !a.allied) return () => allianceOffer(a, me);
  }
  return null;
}
const aiHead = a => `<div class="row" style="gap:10px;margin-bottom:8px"><span class="flag" style="width:42px;height:28px">${flagSVG(a)}</span><div><b>${esc(a.leader)}</b><div class="ms">${esc(a.name)} · ${persOf(a).n} · hubungan ${Math.round(a.rel)}</div></div></div>`;
function tariffEvent(a) {
  const hit = playerNations().filter(p => p.trades.includes(a.id));
  endTrade(a); for (const p of hit) addMod(p, 'tarif' + a.id, `Tarif impor ${a.name}`, { com: 0.92, ind: 0.85 }, 12);
  addNews(`${a.name} membatalkan perjanjian dagang dan memberlakukan tarif impor.`);
  decide({
    title: 'Perang Dagang!', sub: `${esc(a.name)} memberlakukan tarif impor`, icon: 'alert',
    html: aiHead(a) + `<p>Hubungan yang memburuk membuat ${esc(a.name)} membatalkan perjanjian dagang dan menaikkan tarif. Selama 12 bulan: <b>bisnis −8%, industri −15%</b>.</p>`,
    choices: [
      { l: 'Kirim delegasi damai · $2 jt (cabut tarif, hubungan +10)', f: () => { const p = act(); if (p.treasury < 2e6) return toast('Dana tidak cukup', '', 'bad', 'alert'); p.treasury -= 2e6; makePeace(a); toast('Tarif dicabut', `${a.name} melunak`, 'info', 'hand'); } },
      { l: 'Balas dengan tarif (hubungan −8, approval +3)', f: () => { a.rel = Math.max(0, a.rel - 8); for (const p of playerNations()) p.apprMod += 3; } },
      { l: 'Terima saja', f: () => { } },
    ]
  });
}
function sanctionEvent(a) {
  applySanctions(a);
  decide({
    title: 'Sanksi Ekonomi', sub: `${esc(a.name)} menjatuhkan sanksi`, icon: 'alert',
    html: aiHead(a) + `<p>${esc(a.name)} menuduh negaramu bersikap bermusuhan dan menjatuhkan sanksi selama 12 bulan: <b>pariwisata −25%, perdagangan −15%</b>.</p>`,
    choices: [
      { l: 'Negosiasi · $3 jt (cabut sanksi, hubungan +10)', f: () => { const p = act(); if (p.treasury < 3e6) return toast('Dana tidak cukup', '', 'bad', 'alert'); p.treasury -= 3e6; makePeace(a); toast('Sanksi dicabut', `${a.name} melunak`, 'info', 'hand'); } },
      { l: 'Kecam di forum internasional (approval +4, hubungan −6)', f: () => { a.rel = Math.max(0, a.rel - 6); for (const p of playerNations()) p.apprMod += 4; } },
    ]
  });
}
function demandEvent(a, me, L, deter) {
  const pay = Math.round(L.length * 60000 / 1e5) * 1e5;
  decide({
    title: 'Tuntutan Wilayah', sub: `${esc(a.name)} mengklaim perbatasanmu`, icon: 'map',
    html: aiHead(a) + `<p>${esc(a.leader)} mengklaim <b>${L.length} petak</b> perbatasan ${esc(me.name)} sebagai wilayah leluhur mereka.</p>${deter ? '<p class="ms" style="margin-top:6px">Pertahananmu membuat mereka tidak berani bertindak jauh jika kamu menolak.</p>' : '<p class="ms" style="margin-top:6px">Tanpa Pangkalan Militer atau Wajib Militer, menolak berisiko memicu sanksi.</p>'}`,
    choices: [
      { l: `Serahkan ${L.length} petak (hubungan +15, approval −5)`, f: () => { for (const i of L) { if (owner[i] === me.id && !tileB[i] && !road[i]) { owner[i] = a.id; zone[i] = 0; me.tiles--; a.tiles++; } } a.rel = Math.min(100, a.rel + 15); me.apprMod -= 5; S.terrDirty = true; S.zoneDirty = true; mmDirty = true; addNews(`${me.name} menyerahkan ${L.length} petak perbatasan kepada ${a.name}.`); } },
      { l: `Bayar kompensasi ${money(pay)} (hubungan +5)`, f: () => { if (me.treasury < pay) { a.rel = Math.max(0, a.rel - 5); toast('Dana tidak cukup', 'Tuntutan menggantung — hubungan −5', 'bad', 'alert'); return; } me.treasury -= pay; a.treasury += pay; a.rel = Math.min(100, a.rel + 5); } },
      { l: 'Tolak tegas (hubungan −15, approval +4)', f: () => { a.rel = Math.max(0, a.rel - 15); me.apprMod += 4; if (!deter && Math.random() < 0.6) { applySanctions(a); toast(`${a.name} menjatuhkan sanksi`, 'Pariwisata −25%, perdagangan −15% (12 bln)', 'bad', 'alert'); } } },
    ]
  });
}
function aidRequest(a, me) {
  const amt = Math.round(Math.min(5e6, 1e6 * (1 + a.pop / 20000)) / 1e5) * 1e5;
  decide({
    title: 'Permintaan Bantuan', sub: `${esc(a.name)} dilanda krisis keuangan`, icon: 'hand',
    html: aiHead(a) + `<p>${esc(a.leader)} meminta bantuan dana <b>${money(amt)}</b> untuk menyelamatkan ekonomi negaranya.</p>`,
    choices: [
      { l: `Kirim ${money(amt)} (hubungan +12)`, f: () => { if (me.treasury < amt) return toast('Dana tidak cukup', '', 'bad', 'alert'); me.treasury -= amt; a.treasury += amt; a.rel = Math.min(100, a.rel + 12); addNews(`${me.name} membantu ${a.name} sebesar ${money(amt)}.`); } },
      { l: 'Tolak dengan sopan (hubungan −6)', f: () => { a.rel = Math.max(0, a.rel - 6); } },
    ]
  });
}
function tradeOffer(a, me) {
  decide({
    title: 'Tawaran Dagang', sub: `${esc(a.name)} ingin berdagang`, icon: 'hand',
    html: aiHead(a) + `<p>${esc(a.name)} menawarkan perjanjian dagang <b>tanpa biaya</b> (biasanya $1,5 jt).</p>`,
    choices: [
      { l: 'Terima perjanjian dagang', f: () => { if (!me.trades.includes(a.id)) { me.trades.push(a.id); a.trades.push(me.id); bump('trade'); } a.rel = Math.min(100, a.rel + 5); addNews(`${me.name} dan ${a.name} menandatangani perjanjian dagang.`); toast('Perjanjian dagang ditandatangani', `${me.name} × ${a.name}`, 'gold', 'hand'); } },
      { l: 'Tolak (hubungan −3)', f: () => { a.rel -= 3; } },
    ]
  });
}
function allianceOffer(a, me) {
  decide({
    title: 'Tawaran Aliansi', sub: `${esc(a.name)} ingin bersekutu`, icon: 'shield',
    html: aiHead(a) + `<p>Persahabatan yang erat membuat ${esc(a.name)} menawarkan aliansi resmi dengan biaya seremonial <b>$2 jt</b> (biasanya $5 jt). Aliansi: approval +4, dagang +30%.</p>`,
    choices: [
      { l: 'Bersekutu · $2 jt', f: () => { if (me.treasury < 2e6) return toast('Dana tidak cukup', '', 'bad', 'alert'); me.treasury -= 2e6; a.allied = true; me.allied = true; me.apprMod += 4; addNews(`${me.name} resmi bersekutu dengan ${a.name}.`); toast(`Aliansi dengan ${a.name}!`, 'Approval naik & dagang +30%', 'gold', 'shield'); } },
      { l: 'Belum saatnya', f: () => { } },
    ]
  });
}

/* ---------------- events with lasting effects & follow-ups ---------------- */
const evScale = n => Math.max(1, n.pop / 4000);
const anyB = (n, ...types) => n.list.some(b => types.includes(b.type) && b.prog >= 1);
function queueEvent(id, nid, months) { S.evq.push({ id, nid, day: S.day + months * 30 }); }
const EVENTS = [
  { id: 'investor', t: 'Investor Asing Datang', i: 'brief', d: n => `Konsorsium global menawarkan investasi <b>${money(3e6 * evScale(n))}</b> untuk membuka kawasan industri baru di ${esc(n.name)}. Aktivis lingkungan khawatir.`,
    a: [{ l: 'Terima investasi (industri +15% selama 2 tahun)', f: n => { n.treasury += 3e6 * evScale(n); n.apprMod -= 3; addMod(n, 'investor', 'Investasi asing', { ind: 1.15 }, 24); queueEvent('limbah', n.id, 10 + Math.floor(Math.random() * 6)); return `Kas bertambah ${money(3e6 * evScale(n))}.`; } }, { l: 'Tolak, lindungi lingkungan', f: n => { n.apprMod += 4; return 'Rakyat mengapresiasi keputusanmu.'; } }] },
  { id: 'limbah', chain: 1, t: 'Skandal Limbah Pabrik Asing', i: 'factory', d: n => `Pabrik milik investor asing ketahuan membuang limbah ke sungai. Pembersihan menyeluruh butuh <b>${money(8e5 * evScale(n))}</b>.`,
    a: [{ l: 'Bersihkan & denda investor', f: n => { n.treasury -= 8e5 * evScale(n); n.apprMod += 3; return 'Sungai kembali bersih.'; } }, { l: 'Tutupi demi investasi (kebahagiaan −5% setahun)', f: n => { n.apprMod -= 6; addMod(n, 'limbah', 'Sungai tercemar', { hap: -0.05 }, 12); return 'Warga marah ketika kabar bocor.'; } }] },
  { id: 'banjir', t: 'Banjir Musiman', i: 'drop', d: n => `Hujan deras merendam beberapa permukiman. Warga menunggu respons pemerintah. Dana darurat yang dibutuhkan: <b>${money(n.pop * 120 + 2e5)}</b>.`,
    a: [{ l: 'Kucurkan dana darurat', f: n => { n.treasury -= n.pop * 120 + 2e5; n.apprMod += 6; return 'Penanganan cepat — approval naik.'; } }, { l: 'Serahkan ke pemerintah daerah (bangunan dekat air rusak)', f: n => { n.apprMod -= 9; floodDamage(n, 6); return 'Warga kecewa, beberapa bangunan terendam.'; } }] },
  { id: 'festival', t: 'Festival Budaya Nasional', i: 'sparkle', d: n => `Seniman mengusulkan festival budaya besar-besaran. Biaya penyelenggaraan <b>${money(5e5 * evScale(n))}</b>.`,
    a: [{ l: 'Selenggarakan! (pariwisata +20% selama 6 bln)', f: n => { n.treasury -= 5e5 * evScale(n); n.apprMod += 6; addMod(n, 'festival', 'Gaung festival budaya', { tour: 1.2 }, 6); return 'Festival meriah, rakyat bahagia.'; } }, { l: 'Tunda tahun depan', f: n => { n.apprMod -= 1; return 'Festival ditunda.'; } }] },
  { id: 'demo', t: 'Demo Mahasiswa', i: 'users', d: n => `Ribuan mahasiswa menuntut biaya pendidikan lebih murah. Subsidi akan memakan <b>${money(8e5 * evScale(n))}</b>.`,
    a: [{ l: 'Kabulkan tuntutan', f: n => { n.treasury -= 8e5 * evScale(n); n.apprMod += 7; return 'Mahasiswa bubar dengan damai.'; } }, { l: 'Tolak dengan tegas', f: n => { n.apprMod -= 7; queueEvent('demo2', n.id, 2); return 'Demo meluas ke kota lain.'; } }] },
  { id: 'demo2', chain: 1, t: 'Demo Meluas', i: 'users', d: n => `Demo mahasiswa kini diikuti buruh dan ojek daring. Tuntutan bertambah: subsidi <b>${money(1.6e6 * evScale(n))}</b>.`,
    a: [{ l: 'Akhirnya kabulkan (biaya 2×)', f: n => { n.treasury -= 1.6e6 * evScale(n); n.apprMod += 4; return 'Situasi mereda.'; } }, { l: 'Kerahkan aparat (approval −12)', f: n => { n.apprMod -= 12; addMod(n, 'represi', 'Represi aparat', { hap: -0.04 }, 6); return 'Demo dibubarkan, luka sosial membekas.'; } }] },
  { id: 'emas', t: 'Cadangan Emas Ditemukan', i: 'coins', d: n => `Ahli geologi menemukan cadangan emas di pegunungan ${esc(n.name)}. Eksploitasi bisa menghasilkan <b>${money(6e6 * evScale(n))}</b>.`,
    a: [{ l: 'Eksploitasi sekarang (kebahagiaan −3% setahun)', f: n => { n.treasury += 6e6 * evScale(n); n.apprMod -= 2; addMod(n, 'tambang', 'Debu tambang emas', { hap: -0.03 }, 12); return `Kas bertambah ${money(6e6 * evScale(n))}.`; } }, { l: 'Jadikan kawasan konservasi (pariwisata +15% 2 thn)', f: n => { n.apprMod += 4; addMod(n, 'konservasi', 'Taman nasional baru', { tour: 1.15 }, 24); return 'Alam terjaga, dunia memuji.'; } }] },
  { id: 'kunjungan', t: 'Kunjungan Kenegaraan', i: 'globe', c: () => S.unl.diplo, d: n => { const a = S.nations.find(x => x.ai); return `${a ? esc(a.leader) + ' dari ' + esc(a.name) : 'Pemimpin asing'} ingin berkunjung. Jamuan kenegaraan bernilai <b>${money(1e6)}</b>.`; },
    a: [{ l: 'Sambut dengan jamuan megah', f: n => { n.treasury -= 1e6; const a = S.nations.find(x => x.ai); if (a) a.rel = Math.min(100, a.rel + 15); return 'Hubungan diplomatik menghangat (+15).'; } }, { l: 'Tolak dengan sopan', f: n => { const a = S.nations.find(x => x.ai); if (a) a.rel -= 8; return 'Hubungan sedikit mendingin.'; } }] },
  { id: 'flu', t: 'Wabah Flu Musiman', i: 'shield', d: n => `Kasus flu meningkat tajam. Vaksinasi massal butuh <b>${money(n.pop * 90 + 1e5)}</b>.`,
    a: [{ l: 'Vaksinasi massal', f: n => { n.treasury -= n.pop * 90 + 1e5; n.apprMod += 4; return 'Wabah terkendali.'; } }, { l: 'Imbau warga jaga kesehatan', f: n => { n.apprMod -= 8; for (const b of n.list) b.occ *= 0.95; return 'Penduduk berkurang 5%.'; } }] },
  { id: 'skandal', t: 'Skandal Menteri', i: 'alert', d: n => 'Media mengungkap dugaan korupsi seorang menteri kabinetmu.',
    a: [{ l: 'Pecat & proses hukum', f: n => { n.apprMod += 5; return 'Integritas pemerintahan terjaga.'; } }, { l: 'Lindungi menteri', f: n => { n.apprMod -= 9; if (Math.random() < 0.6) queueEvent('skandal2', n.id, 4); return 'Kepercayaan publik anjlok.'; } }] },
  { id: 'skandal2', chain: 1, t: 'Bukti Baru Skandal', i: 'alert', d: n => 'Jurnalis investigasi merilis rekaman yang membuktikan menteri yang kamu lindungi menerima suap.',
    a: [{ l: 'Akui kesalahan & pecat menteri', f: n => { n.apprMod -= 4; return 'Pahit, tapi rakyat menghargai kejujuranmu.'; } }, { l: 'Bantah semuanya (approval −15)', f: n => { n.apprMod -= 15; return 'Kepercayaan publik runtuh.'; } }] },
  { id: 'startup', t: 'Startup Unicorn Lokal', i: 'sparkle', d: n => `Startup teknologi lokal meminta suntikan dana negara <b>${money(2e6 * evScale(n))}</b> dengan imbalan saham.`,
    a: [{ l: 'Investasikan (hasil terlihat 6 bulan lagi)', f: n => { const c = 2e6 * evScale(n); n.treasury -= c; n.stake = c; queueEvent('startup2', n.id, 6); return 'Dana negara masuk ke startup.'; } }, { l: 'Biarkan pasar bekerja', f: n => 'Tidak ada perubahan.' }] },
  { id: 'startup2', chain: 1, t: 'Kabar dari Startup Negara', i: 'sparkle', d: n => (n.stakeOk = Math.random() < 0.6) ? `Startup yang kamu danai melantai di bursa! Nilai saham negara melonjak menjadi <b>${money((n.stake || 2e6) * 3)}</b>.` : 'Startup yang kamu danai gagal mendapat pendanaan lanjutan dan tutup.',
    a: [{ l: 'Lanjutkan', f: n => { if (n.stakeOk) { n.treasury += (n.stake || 2e6) * 3; n.apprMod += 3; addMod(n, 'tekno', 'Ekosistem startup', { com: 1.1 }, 12); return 'Sukses besar!'; } n.apprMod -= 2; return 'Dana hilang.'; } }] },
  { id: 'komoditas', t: 'Lonjakan Harga Komoditas', i: 'chart', d: n => `Harga komoditas ekspor naik di pasar dunia. Kas negara mendapat bonus <b>${money(1.5e6 * evScale(n))}</b>.`,
    a: [{ l: 'Masukkan ke kas negara', f: n => { n.treasury += 1.5e6 * evScale(n); return 'Kas bertambah.'; } }, { l: 'Bagikan sebagai bansos', f: n => { n.apprMod += 8; return 'Rakyat bersuka cita.'; } }] },
  { id: 'energi', t: 'Krisis Energi Global', i: 'bolt', d: n => 'Harga minyak dunia melonjak. Biaya listrik dan transportasi naik tajam.',
    a: [{ l: 'Subsidi energi (perawatan +12% selama 6 bln, approval +4)', f: n => { addMod(n, 'energi', 'Subsidi krisis energi', { upk: 1.12 }, 6); n.apprMod += 4; return 'Harga di tingkat warga tetap stabil.'; } }, { l: 'Lepas ke harga pasar (kebahagiaan −5% selama 6 bln)', f: n => { addMod(n, 'energi', 'Harga energi tinggi', { hap: -0.05 }, 6); return 'Warga mengeluh harga naik.'; } }] },
  { id: 'resesi', t: 'Resesi Global', i: 'chart', d: n => `Ekonomi dunia melambat. Ekonom menyarankan paket stimulus <b>${money(3e6 * evScale(n))}</b>.`,
    a: [{ l: 'Gelontorkan stimulus (bisnis −5% selama 6 bln)', f: n => { n.treasury -= 3e6 * evScale(n); addMod(n, 'resesi', 'Resesi global (diredam)', { com: 0.95 }, 6); return 'Dampak resesi teredam.'; } }, { l: 'Hemat anggaran (bisnis −20%, industri −15% selama 9 bln)', f: n => { addMod(n, 'resesi', 'Resesi global', { com: 0.8, ind: 0.85, upk: 0.95 }, 9); return 'Ekonomi terpukul.'; } }] },
  { id: 'teknopark', t: 'Ledakan Ekonomi Digital', i: 'brief', c: n => n.pop >= 8000, d: n => 'Perusahaan teknologi berbondong-bondong mencari lokasi kantor baru dan meminta keringanan pajak.',
    a: [{ l: 'Beri keringanan pajak (pajak −5%, bisnis +20% selama 18 bln)', f: n => { addMod(n, 'digital', 'Insentif ekonomi digital', { tax: 0.95, com: 1.2 }, 18); return 'Kantor-kantor baru bermunculan.'; } }, { l: 'Tidak perlu', f: n => 'Mereka memilih negara lain.' }] },
  { id: 'pengungsi', t: 'Gelombang Pengungsi', i: 'users', c: () => S.unl.diplo, d: n => { const a = S.nations.find(x => x.ai); return `Ribuan pengungsi dari ${a ? esc(a.name) : 'negara tetangga'} tiba di perbatasan meminta perlindungan.`; },
    a: [{ l: 'Terima pengungsi (penduduk +4%, approval −3)', f: n => { for (const b of n.list) if (BT[b.type].c === 'res') b.occ = Math.min(capOf(b), b.occ * 1.04); n.apprMod -= 3; const a = S.nations.find(x => x.ai); if (a) a.rel = Math.min(100, a.rel + 10); return 'Dunia memuji kemanusiaanmu.'; } }, { l: 'Tutup perbatasan', f: n => { n.apprMod += 2; const a = S.nations.find(x => x.ai); if (a) a.rel -= 8; return 'Perbatasan dijaga ketat.'; } }] },
  { id: 'olimpiade', t: 'Tuan Rumah Pesta Olahraga', i: 'trophy', c: n => n.pop >= 30000 && anyB(n, 'stadium'), d: n => `Komite internasional menawarkan ${esc(n.name)} menjadi tuan rumah pesta olahraga dunia. Biaya persiapan <b>${money(8e6)}</b>.`,
    a: [{ l: 'Ajukan diri! (setahun lagi: wisata +60% & approval +8)', f: n => { n.treasury -= 8e6; queueEvent('olimpiade2', n.id, 12); return 'Persiapan dimulai.'; } }, { l: 'Tolak, terlalu mahal', f: n => 'Kesempatan lewat.' }] },
  { id: 'olimpiade2', chain: 1, t: 'Pesta Olahraga Dibuka!', i: 'trophy', d: n => `Mata dunia tertuju ke ${esc(n.name)}. Stadion penuh, hotel penuh, rakyat bangga.`,
    a: [{ l: 'Rayakan!', f: n => { addMod(n, 'olimpiade', 'Demam pesta olahraga', { tour: 1.6 }, 6); n.apprMod += 8; return 'Momen bersejarah.'; } }] },
  { id: 'kpk', t: 'Gerakan Antikorupsi', i: 'shield', d: n => 'Lembaga antikorupsi meminta dukungan anggaran untuk membongkar mafia proyek.',
    a: [{ l: 'Dukung penuh · $1 jt (perawatan −8% selama 2 thn)', f: n => { n.treasury -= 1e6; n.apprMod += 3; addMod(n, 'kpk', 'Proyek bebas korupsi', { upk: 0.92 }, 24); return 'Anggaran proyek jadi efisien.'; } }, { l: 'Lindungi koalisi (approval −6)', f: n => { n.apprMod -= 6; return 'Publik curiga.'; } }] },
  { id: 'mogok', t: 'Mogok Buruh Nasional', i: 'factory', c: n => anyB(n, 'factory', 'farm', 'mine', 'industrial'), d: n => 'Serikat buruh menuntut kenaikan upah minimum dan mengancam mogok nasional.',
    a: [{ l: 'Naikkan upah (industri −8%, kebahagiaan +4% setahun)', f: n => { addMod(n, 'upah', 'Upah minimum naik', { ind: 0.92, hap: 0.04 }, 12); return 'Buruh kembali bekerja.'; } }, { l: 'Tolak (industri −30% selama 2 bln, approval −5)', f: n => { addMod(n, 'mogok', 'Mogok nasional', { ind: 0.7 }, 2); n.apprMod -= 5; return 'Pabrik-pabrik berhenti.'; } }] },
  { id: 'hoaks', t: 'Hoaks Viral', i: 'alert', d: n => 'Berita bohong tentang kebijakanmu viral di media sosial dan dipercaya jutaan warga.',
    a: [{ l: 'Kampanye klarifikasi · $500 rb', f: n => { n.treasury -= 5e5; return 'Hoaks berhasil diluruskan.'; } }, { l: 'Abaikan (approval −6)', f: n => { n.apprMod -= 6; return 'Hoaks terus menyebar.'; } }] },
  { id: 'panen', t: 'Panen Raya', i: 'sparkle', c: n => n.list.filter(b => b.type === 'farm').length >= 2, d: n => `Lumbung pangan ${esc(n.name)} melimpah tahun ini.`,
    a: [{ l: `Ekspor surplus (+${money(1.2e6)})`, f: n => { n.treasury += 1.2e6; return 'Devisa bertambah.'; } }, { l: 'Bagikan beras murah (approval +4)', f: n => { n.apprMod += 4; return 'Warga senang.'; } }] },
  { id: 'hijau', t: 'Teknologi Hijau', i: 'wind', c: n => n.pol.green || anyB(n, 'solar', 'wind'), d: n => 'Ilmuwan nasional menawarkan teknologi efisiensi energi untuk gedung pemerintah.',
    a: [{ l: 'Terapkan · $2 jt (perawatan −5% selama 3 thn)', f: n => { n.treasury -= 2e6; addMod(n, 'hijau', 'Efisiensi energi', { upk: 0.95 }, 36); return 'Tagihan listrik pemerintah turun.'; } }, { l: 'Nanti saja', f: n => 'Tidak ada perubahan.' }] },
];
function runEvent(e, n) {
  S.evRecent = [e.id, ...S.evRecent.filter(x => x !== e.id)].slice(0, 6);
  decide({
    title: e.t, sub: `Laporan untuk Presiden · ${esc(n.name)}`, icon: e.i, html: `<p>${e.d(n)}</p>`,
    choices: e.a.map(a => ({ l: a.l, f: () => { const r = a.f(n); if (r) toast(e.t, r, 'info', 'info'); addNews(`${e.t}: ${a.l.replace(/ \(.*$/, '')}.`); } }))
  });
}
function pickEvent(n) {
  const pool = EVENTS.filter(e => !e.chain && !S.evRecent.includes(e.id) && (!e.c || e.c(n)));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function monthEvents(m) {
  if (S.over || S.mq.length > 2) return;
  const due = S.evq.find(q => q.day <= S.day);
  if (due) {
    S.evq = S.evq.filter(q => q !== due);
    const n = S.nations[due.nid], e = EVENTS.find(x => x.id === due.id);
    if (n && !n.ai && e) return queueModal(() => runEvent(e, n));
  }
  const ai = aiDiplomacy(); if (ai) return queueModal(ai);
  if (m >= 3 && Math.random() < 0.3) { const n = act(); if (n && !n.ai) { const e = pickEvent(n); if (e) queueModal(() => runEvent(e, n)); } }
}

/* ---------------- monthly & daily driver ---------------- */
function govMonthEnd(m) {
  for (const n of S.nations) tickMods(n);
  aiFriction();
  for (const n of playerNations()) { updateDemand(n); checkCrisis(n); if (S.over) return; }
  for (const n of playerNations()) { if (n.pol.autoup) autoUpgrade(n); disasterRoll(n); }
  const h = homeN(), st = S.st;
  st.months++; st.apprSum += h.approval; st.peak = Math.max(st.peak, totalPop()); if (h.pol.green) st.greenM++;
  const ais = S.nations.filter(a => a.ai); st.relSum += ais.length ? ais.reduce((a, b) => a + b.rel, 0) / ais.length : 50;
  checkEndings(m);
  monthEvents(m);
}
function govDay() {
  if (S.dmgSet.size) tickDamage();
  if (S.day % 3 === 0) for (const n of playerNations()) zoneDev(n);
}

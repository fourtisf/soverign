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
// ai: AI diplomatic aggression ×, vic: population needed for the Superpower victory, sc: score multiplier
const DIFF = {
  easy: { n: 'Easy', d: 'Big budget, patient citizens, rare disasters', cash: 1.4, upk: 0.85, dem: 0.45, demMax: 30, appLo: 18, crisis: 9, coal: 99, dis: 0.5, ai: 0.6, vic: 150e3, sc: 0.75 },
  normal: { n: 'Normal', d: 'A balanced challenge', cash: 1, upk: 1, dem: 0.8, demMax: 45, appLo: 25, crisis: 6, coal: 1, dis: 1, ai: 1, vic: 250e3, sc: 1 },
  hard: { n: 'Hard', d: 'Small budget, demanding citizens, aggressive neighbors', cash: 0.7, upk: 1.15, dem: 1.1, demMax: 55, appLo: 30, crisis: 4, coal: 0, dis: 1.5, ai: 1.5, vic: 400e3, sc: 1.5 },
};
const WORLDS = { standard: { n: 'Standard', d: 'Starter city & neighbouring nations' }, empty: { n: 'Blank Slate', d: 'Empty, tidy land — just money' } };
const MODES = { career: { n: 'Career', d: 'Victory & defeat are possible' }, sandbox: { n: 'Sandbox', d: 'Relaxed, no game over' } };
const TERM_MONTHS = 240;                       // 20-year tenure (4 terms)
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
const MODK = { tax: 'Income tax', com: 'Business', ind: 'Industry', tour: 'Tourism', trade: 'Trade', upk: 'Upkeep', hap: 'Happiness', appr: 'Approval' };
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
  const P = priceNow(n); M.tax *= P; M.com *= P; M.ind *= P; M.trade *= P; M.upk *= P; M.tour *= P * wxNow().tour;
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
    if (before < 15 && n.dem >= 15) toast('Citizens are growing impatient', 'Public demand is rising — grow your population & complete your agenda', 'wa', 'users');
    if (before < 30 && n.dem >= 30) toast('Public demand is high!', `Approval down ${Math.round(n.dem)} points. Citizens want real progress`, 'bad', 'users');
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
  else if (n.debtM === 1 && n.id === S.active) toast('Fiscal crisis warning', `Treasury in the red ${D.crisis} months in a row = national bankruptcy`, 'bad', 'alert');
  if (n.lowM === 2) queueModal(() => protestModal(n));
  if (n.lowM === 4) toast('No-confidence motion in the works!', `${esc(n.name)}: raise approval above ${D.appLo}% within 2 months`, 'bad', 'alert');
}
function imfModal(n) {
  if (S.over || n.ai) return;
  const amt = Math.round(Math.max(5e6, -n.treasury + Math.abs(Math.min(0, n.rate.net)) * 6 + 2e6) / 1e5) * 1e5;
  decide({
    title: 'Fiscal Crisis', sub: `${esc(n.name)} has run a deficit ${n.debtM} months in a row`, icon: 'alert',
    html: `<p>The Treasury is <b>${money(-n.treasury)}</b> in the red. If it stays negative for <b>${dif().crisis} months in a row</b>, the nation will be declared <b>bankrupt</b> and your term will end.</p><p style="margin-top:8px">The International Monetary Fund offers a <b>${money(amt)}</b> IMF bailout (72 monthly installments, 40% interest) on condition of strict austerity for 12 months.</p>`,
    choices: [
      { l: `Accept the ${money(amt)} bailout — upkeep −10%, happiness −4%, approval −6 (12 mo)`, f: () => { n.treasury += amt; n.loans.push({ p: amt, pay: amt * 1.4 / 72, left: 72 }); n.imfDay = S.day; addMod(n, 'imf', 'IMF austerity terms', { upk: 0.9, hap: -0.04, appr: -6 }, 12); addNews(`${n.name} accepts a ${money(amt)} IMF bailout.`); toast('IMF bailout disbursed', `+${money(amt)} · austerity terms in effect`, 'wa', 'bank'); } },
      { l: 'Refuse — handle it yourself (raise taxes, cut programs, sell assets)', f: () => toast('Bailout refused', 'The clock is ticking — fix the Treasury before bankruptcy', 'bad', 'alert') },
    ]
  });
}
function protestModal(n) {
  if (S.over || n.ai) return;
  const cost = Math.max(1e6, Math.round(Math.max(0, n.treasury) * 0.05 / 1e5) * 1e5);
  decide({
    title: 'Mass Protests', sub: `${esc(n.name)} · approval ${Math.round(n.approval)}%`, icon: 'users',
    html: `<p>Thousands of citizens have taken to the streets demanding the President resign. Approval has been below <b>${dif().appLo}%</b> for 2 months. If it stays there for <b>6 months</b>, parliament will impeach you.</p>`,
    choices: [
      { l: `Reshuffle the cabinet & promise reform · ${money(cost)} (approval +9)`, f: () => { n.treasury -= cost; n.apprMod += 9; addNews(`${presName()} reshuffles the cabinet of ${n.name}.`); } },
      { l: 'Disperse by force (approval −4, happiness −3% for 6 mo)', f: () => { n.apprMod -= 4; addMod(n, 'represi', 'Security crackdown', { hap: -0.03 }, 6); addNews(`Security forces break up protests in ${n.name}.`); } },
      { l: 'Ignore', f: () => { } },
    ]
  });
}

/* ---------------- game over · secession ---------------- */
const OVER = {
  bankrupt: { t: 'National Bankruptcy', i: 'coins', d: n => `The Treasury of ${esc(n.name)} was in the red for ${dif().crisis} months in a row. International creditors took over the nation's finances and parliament removed you from office.` },
  impeach: { t: 'Impeached', i: 'alert', d: n => `Approval stayed below ${dif().appLo}% for 6 months. Parliament passed a no-confidence motion and impeached you.` },
  election: { t: 'Election Lost', i: 'vote', d: n => `The citizens of ${esc(n.name)} voted for the opposition. Your term is over.` },
};
function nationFails(n, reason) {
  if (n.ai || S.over) return;
  if (n.id === homeN().id) return gameOver(reason);
  // A secondary nation breaks away and becomes independent (AI).
  n.ai = true; n.pers = 'pedagang'; n.rel = 25; n.leader = 'Interim President ' + ['Hayes', 'Laurent', 'Mercer', 'Kendall', 'Sterling'][n.id % 5];
  n.treasury = Math.max(n.treasury, 2e6); n.dem = 0; n.debtM = 0; n.lowM = 0; n.mods = []; n.sec = true;
  for (const p of playerNations()) { p.trades = p.trades.filter(x => x !== n.id); }
  n.trades = n.trades.filter(x => S.nations[x]?.ai);
  if (S.active === n.id) switchNation(homeN().id);
  renderNationCard(); renderMenu(); S.terrDirty = true;
  addNews(`${n.name} secedes and becomes an independent nation.`);
  queueModal(() => modal({ title: `${esc(n.name)} secedes`, sub: OVER[reason].t, icon: 'flag', html: `<p>${OVER[reason].d(n)}</p><p style="margin-top:8px">This nation now stands on its own, outside your leadership. You still lead your other nations.</p>`, buttons: [{ l: 'Got it', pri: 1 }] }));
}
function gameOver(reason) {
  if (S.over) return;
  S.over = { r: reason, d: S.day }; S.paused = true; renderTime();
  addNews(`${presName()} leaves office: ${OVER[reason].t}.`); saveGame(true);
  queueModal(showGameOver);
}
function showGameOver() {
  if (!S.over) return;
  const o = OVER[S.over.r], n = homeN();
  modal({
    title: o.t, sub: `Term ended · ${dateStr(S.over.d)}`, icon: o.i, noClose: 1, wide: 1,
    html: `<p>${o.d(n)}</p>${legacyHTML()}`,
    buttons: [
      { l: `${ico('sparkle')} Continue in Sandbox mode`, f: () => { S.over = null; S.mode = 'sandbox'; S.paused = false; renderTime(); addNews('The game continues in Sandbox mode.'); saveGame(true); toast('Sandbox mode on', 'No way to lose — build as you like', 'info', 'sparkle'); } },
      { l: `${ico('plus')} Play again`, pri: 1, f: () => { saveGame(true); location.reload(); } },
    ]
  });
}

/* ---------------- victory · term end · legacy ---------------- */
function victoryState() {
  const n = homeN(), D = dif();
  return [
    { t: 'Complete the entire agenda', ok: curChapter() < 0, v: `${S.mis.length}/${MISSIONS.length}` },
    { t: `Total population of your nations ≥ ${fmtPop(D.vic)}`, ok: totalPop() >= D.vic, v: fmtPop(totalPop()) },
    { t: "World's #1 economy (GDP)", ok: rankOf(n, 'gdp') === 1, v: `#${rankOf(n, 'gdp')}` },
    { t: 'Home nation approval ≥ 55%', ok: n.approval >= 55, v: `${Math.round(n.approval)}%` },
  ];
}
function checkEndings(m) {
  if (!career() || S.over) return;
  if (!S.won && victoryState().every(c => c.ok)) {
    S.won = S.day; addNews(`${homeN().name} is recognized worldwide as a Superpower!`); sfx('coin');
    return queueModal(() => endingModal('Superpower!', 'Victory · all goals achieved', 'trophy', `<p><b>${esc(homeN().name)}</b> is now recognized worldwide as a superpower — the largest economy, with a great people who trust their leader.</p>`));
  }
  const age = m - Math.floor(homeN().founded / 30);
  if (!S.ended && age >= TERM_MONTHS) {
    S.ended = S.day; addNews(`${presName()}'s 20 years in office come to an end.`);
    queueModal(() => endingModal('End of Term', '20 years in power · 4 terms', 'crown', `<p>After 20 years and 4 terms, your time in office is over. History will remember you as:</p>`));
  }
}
function endingModal(title, sub, icon, intro) {
  S.paused = true; renderTime();
  modal({
    title, sub, icon, noClose: 1, wide: 1, html: intro + legacyHTML(),
    buttons: [{ l: `${ico('play')} Continue (Sandbox mode)`, pri: 1, f: () => { S.mode = 'sandbox'; S.paused = false; renderTime(); saveGame(true); } }]
  });
}
function styleOf() {
  const n = homeN(), st = S.st, inc = n.last?.inc || n.rate.inc || {}, tot = Math.max(1, sumObj(inc)), months = Math.max(1, st.months);
  const avgAppr = st.months ? st.apprSum / st.months : n.approval, peak = Math.max(st.peak, totalPop()), allies = S.nations.filter(a => a.ai && a.allied).length;
  const greens = playerNations().reduce((a, p) => a + p.list.filter(b => b.type === 'park' || b.type === 'forest' || b.type === 'solar' || b.type === 'wind').length, 0);
  const tiles = playerNations().reduce((a, p) => a + p.tiles, 0), founded = S.nations.filter(x => x.founded > 0).length;
  const c = [
    ['The Great Builder', 'Your cities grew fast and grand.', peak / dif().vic * 1.2],
    ["The People's Leader", 'The people loved you throughout your term.', (avgAppr - 55) / 25],
    ['The Green President', 'You built a clean, sustainable nation.', st.greenM / months + greens / 250],
    ['The Master Diplomat', 'The world knows you as a peacemaker.', (S.cnt.trade + allies * 2) / 5 + (st.relSum / months - 50) / 50],
    ['The Tourism Tycoon', "Your nation became the world's dream destination.", (inc.tour || 0) / tot * 3.2],
    ['The Industrialist', 'Your factory smokestacks powered the economy.', (inc.ind || 0) / tot * 2.6],
    ['The Expansionist', 'Your territory stretches from coast to coast.', tiles / 3500 + founded * 0.25],
  ];
  return c.reduce((a, b) => b[2] > a[2] ? b : a);
}
function scoreOf() {
  const st = S.st, n = homeN(), avgAppr = st.months ? st.apprSum / st.months : n.approval;
  const gdp = playerNations().reduce((a, p) => a + sumObj(p.rate.inc), 0);
  const landmarks = playerNations().reduce((a, p) => a + p.list.filter(b => BT[b.type].c === 'lm' && b.prog >= 1).length, 0);
  const parts = [
    ['Peak population', Math.round(Math.max(st.peak, totalPop()) / 100)],
    ['Economy (monthly GDP)', Math.round(gdp / 20000)],
    ['Average approval', Math.round(avgAppr * 20)],
    ['Years in office', Math.round(S.day / 360 * 40)],
    ['Agenda missions completed', S.mis.length * 80],
    ['National landmarks', landmarks * 300],
    ['Nations founded', S.nations.filter(x => x.founded > 0).length * 400],
  ];
  if (S.won) parts.push(['Superpower victory', 5000]);
  const base = parts.reduce((a, p) => a + p[1], 0);
  return { parts, total: Math.round(base * dif().sc), mult: dif().sc, n };
}
function legacyHTML() {
  const [title, desc] = styleOf(), sc = scoreOf();
  return `<div class="box" style="margin-top:14px;display:flex;gap:12px;align-items:center"><div class="tri">${ico('trophy')}</div><div><div class="lb">Historical title</div><div class="vl">${title}</div><div class="ms">${desc}</div></div></div>
  <div class="grid2" style="margin-top:10px;align-items:start"><div class="box"><div class="lb" style="margin-bottom:6px">Score breakdown</div><div class="lst">${sc.parts.map(p => `<div class="kv"><span>${p[0]}</span><span>${fmtPop(p[1])}</span></div>`).join('')}<div class="kv"><span>Difficulty multiplier (${dif().n})</span><span>×${String(sc.mult)}</span></div></div></div>
  <div class="box"><div class="lb">Final score</div><div class="vl" style="font-size:30px">${fmtPop(sc.total)}</div><div class="ms" style="margin-top:6px">${esc(presName())} · ${esc(homeN().name)} · ${Math.floor(S.day / 360)} years in office · ${MODES[S.mode]?.n || ''} ${dif().n}</div></div></div>`;
}

/* ---------------- world ranking ---------------- */
const gdpOf = n => sumObj(n.rate?.inc);
function ranking(key) { const f = key === 'pop' ? (n => n.pop) : key === 'hap' ? (n => n.happy) : gdpOf; return S.nations.slice().sort((a, b) => f(b) - f(a)); }
function rankOf(n, key) { return ranking(key).indexOf(n) + 1; }

/* ---------------- AI personalities · upgrades · diplomacy ---------------- */
const PERS = {
  agresif: { n: 'Aggressive', rel: 35, cap: 2200, exp: 2, d: 'Loves expansion & territorial claims' },
  pedagang: { n: 'Mercantile', rel: 55, cap: 1600, exp: 3, d: 'Puts trade first' },
  damai: { n: 'Peaceful', rel: 62, cap: 1400, exp: 4, d: 'Friendly & cooperative' },
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
  for (const p of playerNations()) addMod(p, 'sanksi' + a.id, `Economic sanctions by ${a.name}`, { tour: 0.75, trade: 0.85 }, 12);
  addNews(`${a.name} imposes economic sanctions.`);
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
const aiHead = a => `<div class="row" style="gap:10px;margin-bottom:8px"><span class="flag" style="width:42px;height:28px">${flagSVG(a)}</span><div><b>${esc(a.leader)}</b><div class="ms">${esc(a.name)} · ${persOf(a).n} · relations ${Math.round(a.rel)}</div></div></div>`;
function tariffEvent(a) {
  const hit = playerNations().filter(p => p.trades.includes(a.id));
  endTrade(a); for (const p of hit) addMod(p, 'tarif' + a.id, `Import tariffs by ${a.name}`, { com: 0.92, ind: 0.85 }, 12);
  addNews(`${a.name} cancels its trade deal and imposes import tariffs.`);
  decide({
    title: 'Trade War!', sub: `${esc(a.name)} imposes import tariffs`, icon: 'alert',
    html: aiHead(a) + `<p>Souring relations have led ${esc(a.name)} to cancel its trade deal and raise tariffs. For 12 months: <b>business −8%, industry −15%</b>.</p>`,
    choices: [
      { l: 'Send a peace delegation · $2M (lift tariffs, relations +10)', f: () => { const p = act(); if (p.treasury < 2e6) return toast('Not enough funds', '', 'bad', 'alert'); p.treasury -= 2e6; makePeace(a); toast('Tariffs lifted', `${a.name} softens its stance`, 'info', 'hand'); } },
      { l: 'Retaliate with tariffs (relations −8, approval +3)', f: () => { a.rel = Math.max(0, a.rel - 8); for (const p of playerNations()) p.apprMod += 3; } },
      { l: 'Accept it', f: () => { } },
    ]
  });
}
function sanctionEvent(a) {
  applySanctions(a);
  decide({
    title: 'Economic Sanctions', sub: `${esc(a.name)} imposes sanctions`, icon: 'alert',
    html: aiHead(a) + `<p>${esc(a.name)} accuses your nation of hostility and imposes sanctions for 12 months: <b>tourism −25%, trade −15%</b>.</p>`,
    choices: [
      { l: 'Negotiate · $3M (lift sanctions, relations +10)', f: () => { const p = act(); if (p.treasury < 3e6) return toast('Not enough funds', '', 'bad', 'alert'); p.treasury -= 3e6; makePeace(a); toast('Sanctions lifted', `${a.name} softens its stance`, 'info', 'hand'); } },
      { l: 'Condemn it on the world stage (approval +4, relations −6)', f: () => { a.rel = Math.max(0, a.rel - 6); for (const p of playerNations()) p.apprMod += 4; } },
    ]
  });
}
function demandEvent(a, me, L, deter) {
  const pay = Math.round(L.length * 60000 / 1e5) * 1e5;
  decide({
    title: 'Territorial Demand', sub: `${esc(a.name)} claims your border`, icon: 'map',
    html: aiHead(a) + `<p>${esc(a.leader)} claims <b>${L.length} tiles</b> along the border of ${esc(me.name)} as ancestral land.</p>${deter ? '<p class="ms" style="margin-top:6px">Your defenses will keep them from going too far if you refuse.</p>' : '<p class="ms" style="margin-top:6px">Without a Military Base or Conscription, refusing risks sanctions.</p>'}`,
    choices: [
      { l: `Cede ${L.length} tiles (relations +15, approval −5)`, f: () => { for (const i of L) { if (owner[i] === me.id && !tileB[i] && !road[i]) { owner[i] = a.id; zone[i] = 0; me.tiles--; a.tiles++; } } a.rel = Math.min(100, a.rel + 15); me.apprMod -= 5; S.terrDirty = true; S.zoneDirty = true; mmDirty = true; addNews(`${me.name} cedes ${L.length} border tiles to ${a.name}.`); } },
      { l: `Pay ${money(pay)} in compensation (relations +5)`, f: () => { if (me.treasury < pay) { a.rel = Math.max(0, a.rel - 5); toast('Not enough funds', 'Demand left unresolved — relations −5', 'bad', 'alert'); return; } me.treasury -= pay; a.treasury += pay; a.rel = Math.min(100, a.rel + 5); } },
      { l: 'Firmly refuse (relations −15, approval +4)', f: () => { a.rel = Math.max(0, a.rel - 15); me.apprMod += 4; if (!deter && Math.random() < 0.6) { applySanctions(a); toast(`${a.name} imposes sanctions`, 'Tourism −25%, trade −15% (12 mo)', 'bad', 'alert'); } } },
    ]
  });
}
function aidRequest(a, me) {
  const amt = Math.round(Math.min(5e6, 1e6 * (1 + a.pop / 20000)) / 1e5) * 1e5;
  decide({
    title: 'Aid Request', sub: `${esc(a.name)} is in a financial crisis`, icon: 'hand',
    html: aiHead(a) + `<p>${esc(a.leader)} asks for <b>${money(amt)}</b> in aid to rescue their nation's economy.</p>`,
    choices: [
      { l: `Send ${money(amt)} (relations +12)`, f: () => { if (me.treasury < amt) return toast('Not enough funds', '', 'bad', 'alert'); me.treasury -= amt; a.treasury += amt; a.rel = Math.min(100, a.rel + 12); addNews(`${me.name} sends ${money(amt)} in aid to ${a.name}.`); } },
      { l: 'Politely decline (relations −6)', f: () => { a.rel = Math.max(0, a.rel - 6); } },
    ]
  });
}
function tradeOffer(a, me) {
  decide({
    title: 'Trade Offer', sub: `${esc(a.name)} wants to trade`, icon: 'hand',
    html: aiHead(a) + `<p>${esc(a.name)} offers a trade deal <b>free of charge</b> (normally $1.5M).</p>`,
    choices: [
      { l: 'Accept the trade deal', f: () => { if (!me.trades.includes(a.id)) { me.trades.push(a.id); a.trades.push(me.id); bump('trade'); } a.rel = Math.min(100, a.rel + 5); addNews(`${me.name} and ${a.name} sign a trade deal.`); toast('Trade deal signed', `${me.name} × ${a.name}`, 'gold', 'hand'); } },
      { l: 'Decline (relations −3)', f: () => { a.rel -= 3; } },
    ]
  });
}
function allianceOffer(a, me) {
  decide({
    title: 'Alliance Offer', sub: `${esc(a.name)} wants an alliance`, icon: 'shield',
    html: aiHead(a) + `<p>Close ties have led ${esc(a.name)} to offer a formal alliance for a ceremonial fee of <b>$2M</b> (normally $5M). Alliance: approval +4, trade +30%.</p>`,
    choices: [
      { l: 'Form the alliance · $2M', f: () => { if (me.treasury < 2e6) return toast('Not enough funds', '', 'bad', 'alert'); me.treasury -= 2e6; a.allied = true; me.allied = true; me.apprMod += 4; addNews(`${me.name} formally allies with ${a.name}.`); toast(`Alliance with ${a.name}!`, 'Approval up & trade +30%', 'gold', 'shield'); } },
      { l: 'Not yet', f: () => { } },
    ]
  });
}

/* ---------------- events with lasting effects & follow-ups ---------------- */
const evScale = n => Math.max(1, n.pop / 4000);
const anyB = (n, ...types) => n.list.some(b => types.includes(b.type) && b.prog >= 1);
function queueEvent(id, nid, months) { S.evq.push({ id, nid, day: S.day + months * 30 }); }
const EVENTS = [
  { id: 'investor', t: 'Foreign Investors Arrive', i: 'brief', d: n => `A global consortium offers <b>${money(3e6 * evScale(n))}</b> to open a new industrial zone in ${esc(n.name)}. Environmental activists are worried.`,
    a: [{ l: 'Accept the investment (industry +15% for 2 years)', f: n => { n.treasury += 3e6 * evScale(n); n.apprMod -= 3; addMod(n, 'investor', 'Foreign investment', { ind: 1.15 }, 24); queueEvent('limbah', n.id, 10 + Math.floor(Math.random() * 6)); return `Treasury +${money(3e6 * evScale(n))}.`; } }, { l: 'Decline and protect the environment', f: n => { n.apprMod += 4; return 'Citizens applaud your decision.'; } }] },
  { id: 'limbah', chain: 1, t: 'Foreign Factory Waste Scandal', i: 'factory', d: n => `A foreign-owned factory was caught dumping waste into a river. A full cleanup will cost <b>${money(8e5 * evScale(n))}</b>.`,
    a: [{ l: 'Clean up & fine the investor', f: n => { n.treasury -= 8e5 * evScale(n); n.apprMod += 3; return 'The river runs clean again.'; } }, { l: 'Cover it up to keep the investor (happiness −5% for a year)', f: n => { n.apprMod -= 6; addMod(n, 'limbah', 'Polluted river', { hap: -0.05 }, 12); return 'Citizens are furious when the story leaks.'; } }] },
  { id: 'banjir', t: 'Seasonal Floods', i: 'drop', d: n => `Heavy rain has flooded several neighborhoods and citizens await the government's response. Emergency funds needed: <b>${money(n.pop * 120 + 2e5)}</b>.`,
    a: [{ l: 'Release emergency funds', f: n => { n.treasury -= n.pop * 120 + 2e5; n.apprMod += 6; return 'Swift response — approval rises.'; } }, { l: 'Leave it to local officials (waterside buildings damaged)', f: n => { n.apprMod -= 9; floodDamage(n, 6); return 'Citizens are let down and several buildings are flooded.'; } }] },
  { id: 'festival', t: 'National Culture Festival', i: 'sparkle', d: n => `Artists propose a grand cultural festival. Staging it will cost <b>${money(5e5 * evScale(n))}</b>.`,
    a: [{ l: 'Host it! (tourism +20% for 6 mo)', f: n => { n.treasury -= 5e5 * evScale(n); n.apprMod += 6; addMod(n, 'festival', 'Festival buzz', { tour: 1.2 }, 6); return 'A lively festival — the people are happy.'; } }, { l: 'Postpone to next year', f: n => { n.apprMod -= 1; return 'Festival postponed.'; } }] },
  { id: 'demo', t: 'Student Protests', i: 'users', d: n => `Thousands of students are demanding cheaper tuition. Subsidies would cost <b>${money(8e5 * evScale(n))}</b>.`,
    a: [{ l: 'Meet their demands', f: n => { n.treasury -= 8e5 * evScale(n); n.apprMod += 7; return 'The students disperse peacefully.'; } }, { l: 'Firmly refuse', f: n => { n.apprMod -= 7; queueEvent('demo2', n.id, 2); return 'Protests spread to other cities.'; } }] },
  { id: 'demo2', chain: 1, t: 'Protests Spread', i: 'users', d: n => `Workers and ride-hailing drivers have joined the student protests. Demands have grown: <b>${money(1.6e6 * evScale(n))}</b> in subsidies.`,
    a: [{ l: 'Give in at last (2× the cost)', f: n => { n.treasury -= 1.6e6 * evScale(n); n.apprMod += 4; return 'The situation calms down.'; } }, { l: 'Deploy security forces (approval −12)', f: n => { n.apprMod -= 12; addMod(n, 'represi', 'Security crackdown', { hap: -0.04 }, 6); return 'Protests broken up, but the social scars remain.'; } }] },
  { id: 'emas', t: 'Gold Reserves Discovered', i: 'coins', d: n => `Geologists have found gold reserves in the mountains of ${esc(n.name)}. Mining could bring in <b>${money(6e6 * evScale(n))}</b>.`,
    a: [{ l: 'Mine it now (happiness −3% for a year)', f: n => { n.treasury += 6e6 * evScale(n); n.apprMod -= 2; addMod(n, 'tambang', 'Gold mine dust', { hap: -0.03 }, 12); return `Treasury +${money(6e6 * evScale(n))}.`; } }, { l: 'Make it a conservation area (tourism +15% for 2 yrs)', f: n => { n.apprMod += 4; addMod(n, 'konservasi', 'New national park', { tour: 1.15 }, 24); return 'Nature is preserved and the world applauds.'; } }] },
  { id: 'kunjungan', t: 'State Visit', i: 'globe', c: () => S.unl.diplo, d: n => { const a = S.nations.find(x => x.ai); return `${a ? esc(a.leader) + ' of ' + esc(a.name) : 'A foreign leader'} wishes to pay a visit. A state banquet would cost <b>${money(1e6)}</b>.`; },
    a: [{ l: 'Host a lavish banquet', f: n => { n.treasury -= 1e6; const a = S.nations.find(x => x.ai); if (a) a.rel = Math.min(100, a.rel + 15); return 'Diplomatic relations warm up (+15).'; } }, { l: 'Politely decline', f: n => { const a = S.nations.find(x => x.ai); if (a) a.rel -= 8; return 'Relations cool slightly.'; } }] },
  { id: 'flu', t: 'Seasonal Flu Outbreak', i: 'shield', d: n => `Flu cases are rising sharply. A mass vaccination drive will cost <b>${money(n.pop * 90 + 1e5)}</b>.`,
    a: [{ l: 'Mass vaccination', f: n => { n.treasury -= n.pop * 90 + 1e5; n.apprMod += 4; return 'Outbreak under control.'; } }, { l: 'Urge citizens to stay healthy', f: n => { n.apprMod -= 8; for (const b of n.list) b.occ *= 0.95; return 'Population falls by 5%.'; } }] },
  { id: 'skandal', t: 'Minister Scandal', i: 'alert', d: n => 'The media has exposed alleged corruption by one of your cabinet ministers.',
    a: [{ l: 'Fire & prosecute', f: n => { n.apprMod += 5; return 'Government integrity is upheld.'; } }, { l: 'Protect the minister', f: n => { n.apprMod -= 9; if (Math.random() < 0.6) queueEvent('skandal2', n.id, 4); return 'Public trust plummets.'; } }] },
  { id: 'skandal2', chain: 1, t: 'New Evidence in Scandal', i: 'alert', d: n => 'Investigative journalists release recordings proving that the minister you protected took bribes.',
    a: [{ l: 'Admit fault & fire the minister', f: n => { n.apprMod -= 4; return 'Bitter, but the people respect your honesty.'; } }, { l: 'Deny everything (approval −15)', f: n => { n.apprMod -= 15; return 'Public trust collapses.'; } }] },
  { id: 'startup', t: 'Local Unicorn Startup', i: 'sparkle', d: n => `A local tech startup is asking for <b>${money(2e6 * evScale(n))}</b> in state funding in exchange for equity.`,
    a: [{ l: 'Invest (results in 6 months)', f: n => { const c = 2e6 * evScale(n); n.treasury -= c; n.stake = c; queueEvent('startup2', n.id, 6); return 'State funds flow into the startup.'; } }, { l: 'Let the market decide', f: n => 'No change.' }] },
  { id: 'startup2', chain: 1, t: 'News from the State-Backed Startup', i: 'sparkle', d: n => (n.stakeOk = Math.random() < 0.6) ? `The startup you backed has gone public! The state's stake has soared to <b>${money((n.stake || 2e6) * 3)}</b>.` : 'The startup you backed failed to raise more funding and has shut down.',
    a: [{ l: 'Continue', f: n => { if (n.stakeOk) { n.treasury += (n.stake || 2e6) * 3; n.apprMod += 3; addMod(n, 'tekno', 'Startup ecosystem', { com: 1.1 }, 12); return 'A huge success!'; } n.apprMod -= 2; return 'The money is gone.'; } }] },
  { id: 'komoditas', t: 'Commodity Price Boom', i: 'chart', d: n => `Export commodity prices are climbing on world markets, handing the Treasury a <b>${money(1.5e6 * evScale(n))}</b> windfall.`,
    a: [{ l: 'Put it in the Treasury', f: n => { n.treasury += 1.5e6 * evScale(n); return 'The Treasury grows.'; } }, { l: 'Hand it out as welfare', f: n => { n.apprMod += 8; return 'The people rejoice.'; } }] },
  { id: 'energi', t: 'Global Energy Crisis', i: 'bolt', d: n => 'World oil prices are soaring. Electricity and transport costs are rising sharply.',
    a: [{ l: 'Subsidize energy (upkeep +12% for 6 mo, approval +4)', f: n => { addMod(n, 'energi', 'Energy crisis subsidy', { upk: 1.12 }, 6); n.apprMod += 4; return 'Prices stay stable for citizens.'; } }, { l: 'Let the market set prices (happiness −5% for 6 mo)', f: n => { addMod(n, 'energi', 'High energy prices', { hap: -0.05 }, 6); return 'Citizens complain about rising prices.'; } }] },
  { id: 'resesi', t: 'Global Recession', i: 'chart', d: n => `The world economy is slowing. Economists recommend a <b>${money(3e6 * evScale(n))}</b> stimulus package.`,
    a: [{ l: 'Roll out the stimulus (business −5% for 6 mo)', f: n => { n.treasury -= 3e6 * evScale(n); addMod(n, 'resesi', 'Global recession (cushioned)', { com: 0.95 }, 6); return "The recession's impact is softened."; } }, { l: 'Tighten the budget (business −20%, industry −15% for 9 mo)', f: n => { addMod(n, 'resesi', 'Global recession', { com: 0.8, ind: 0.85, upk: 0.95 }, 9); return 'The economy takes a hit.'; } }] },
  { id: 'teknopark', t: 'Digital Economy Boom', i: 'brief', c: n => n.pop >= 8000, d: n => 'Tech companies are flocking in search of new office space and asking for tax breaks.',
    a: [{ l: 'Grant tax breaks (tax −5%, business +20% for 18 mo)', f: n => { addMod(n, 'digital', 'Digital economy incentives', { tax: 0.95, com: 1.2 }, 18); return 'New offices spring up.'; } }, { l: 'No need', f: n => 'They choose another country.' }] },
  { id: 'pengungsi', t: 'Refugee Wave', i: 'users', c: () => S.unl.diplo, d: n => { const a = S.nations.find(x => x.ai); return `Thousands of refugees from ${a ? esc(a.name) : 'a neighboring country'} arrive at the border seeking asylum.`; },
    a: [{ l: 'Take in the refugees (population +4%, approval −3)', f: n => { for (const b of n.list) if (BT[b.type].c === 'res') b.occ = Math.min(capOf(b), b.occ * 1.04); n.apprMod -= 3; const a = S.nations.find(x => x.ai); if (a) a.rel = Math.min(100, a.rel + 10); return 'The world praises your compassion.'; } }, { l: 'Close the border', f: n => { n.apprMod += 2; const a = S.nations.find(x => x.ai); if (a) a.rel -= 8; return 'The border is tightly guarded.'; } }] },
  { id: 'olimpiade', t: 'Hosting the World Games', i: 'trophy', c: n => n.pop >= 30000 && anyB(n, 'stadium'), d: n => `An international committee invites ${esc(n.name)} to host the World Games. Preparations will cost <b>${money(8e6)}</b>.`,
    a: [{ l: 'Bid to host! (in a year: tourism +60% & approval +8)', f: n => { n.treasury -= 8e6; queueEvent('olimpiade2', n.id, 12); return 'Preparations are underway.'; } }, { l: 'Decline, too expensive', f: n => 'The opportunity passes.' }] },
  { id: 'olimpiade2', chain: 1, t: 'The World Games Open!', i: 'trophy', d: n => `All eyes are on ${esc(n.name)}. Stadiums are packed, hotels are full and the nation is proud.`,
    a: [{ l: 'Celebrate!', f: n => { addMod(n, 'olimpiade', 'Games fever', { tour: 1.6 }, 6); n.apprMod += 8; return 'A historic moment.'; } }] },
  { id: 'kpk', t: 'Anti-Corruption Drive', i: 'shield', d: n => 'The anti-corruption agency is asking for funding to bust a bid-rigging ring in public works.',
    a: [{ l: 'Full support · $1M (upkeep −8% for 2 yrs)', f: n => { n.treasury -= 1e6; n.apprMod += 3; addMod(n, 'kpk', 'Corruption-free projects', { upk: 0.92 }, 24); return 'Project budgets get leaner.'; } }, { l: 'Shield the coalition (approval −6)', f: n => { n.apprMod -= 6; return 'The public grows suspicious.'; } }] },
  { id: 'mogok', t: 'National Labor Strike', i: 'factory', c: n => anyB(n, 'factory', 'farm', 'mine', 'industrial'), d: n => 'Labor unions are demanding a higher minimum wage and threatening a nationwide strike.',
    a: [{ l: 'Raise wages (industry −8%, happiness +4% for a year)', f: n => { addMod(n, 'upah', 'Higher minimum wage', { ind: 0.92, hap: 0.04 }, 12); return 'Workers return to their jobs.'; } }, { l: 'Refuse (industry −30% for 2 mo, approval −5)', f: n => { addMod(n, 'mogok', 'National strike', { ind: 0.7 }, 2); n.apprMod -= 5; return 'Factories grind to a halt.'; } }] },
  { id: 'hoaks', t: 'Viral Hoax', i: 'alert', d: n => 'Fake news about your policies has gone viral on social media, and millions of citizens believe it.',
    a: [{ l: 'Fact-check campaign · $500K', f: n => { n.treasury -= 5e5; return 'The hoax has been debunked.'; } }, { l: 'Ignore it (approval −6)', f: n => { n.apprMod -= 6; return 'The hoax keeps spreading.'; } }] },
  { id: 'panen', t: 'Bumper Harvest', i: 'sparkle', c: n => n.list.filter(b => b.type === 'farm').length >= 2, d: n => `The granaries of ${esc(n.name)} are overflowing this year.`,
    a: [{ l: `Export the surplus (+${money(1.2e6)})`, f: n => { n.treasury += 1.2e6; return 'Export earnings rise.'; } }, { l: 'Hand out cheap rice (approval +4)', f: n => { n.apprMod += 4; return 'Citizens are pleased.'; } }] },
  { id: 'hijau', t: 'Green Technology', i: 'wind', c: n => n.pol.green || anyB(n, 'solar', 'wind'), d: n => 'National scientists are offering energy-saving technology for government buildings.',
    a: [{ l: 'Adopt it · $2M (upkeep −5% for 3 yrs)', f: n => { n.treasury -= 2e6; addMod(n, 'hijau', 'Energy efficiency', { upk: 0.95 }, 36); return 'Government power bills go down.'; } }, { l: 'Maybe later', f: n => 'No change.' }] },
];
function runEvent(e, n) {
  S.evRecent = [e.id, ...S.evRecent.filter(x => x !== e.id)].slice(0, 6);
  decide({
    title: e.t, sub: `Briefing for the President · ${esc(n.name)}`, icon: e.i, html: `<p>${e.d(n)}</p>`,
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
  realMonth(m);
  checkEndings(m);
  monthEvents(m);
}
function govDay() {
  realDay();
  if (S.dmgSet.size) tickDamage();
  if (S.day % 3 === 0) for (const n of playerNations()) zoneDev(n);
}

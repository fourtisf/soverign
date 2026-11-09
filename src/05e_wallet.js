/* =====================================================================
   WALLETS · EVM (EIP-6963 discovery, multiple linked wallets, chain switching)
   Read-only: the game only reads addresses, chain and native balance.
   It never asks for keys and never sends transactions.
   ===================================================================== */
Object.assign(I, {
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z"/><path d="M16 14.5h.01"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
});
const EVM_CHAINS = [
  { id: '0x1', n: 'Ethereum', sym: 'ETH', rpc: 'https://ethereum-rpc.publicnode.com', exp: 'https://etherscan.io', c: '#8c9eff' },
  { id: '0x2105', n: 'Base', sym: 'ETH', rpc: 'https://mainnet.base.org', exp: 'https://basescan.org', c: '#3b82f6' },
  { id: '0xa4b1', n: 'Arbitrum One', sym: 'ETH', rpc: 'https://arb1.arbitrum.io/rpc', exp: 'https://arbiscan.io', c: '#60a5fa' },
  { id: '0xa', n: 'OP Mainnet', sym: 'ETH', rpc: 'https://mainnet.optimism.io', exp: 'https://optimistic.etherscan.io', c: '#fb7185' },
  { id: '0x89', n: 'Polygon', sym: 'POL', rpc: 'https://polygon-rpc.com', exp: 'https://polygonscan.com', c: '#a78bfa' },
  { id: '0x38', n: 'BNB Chain', sym: 'BNB', rpc: 'https://bsc-dataseed.binance.org', exp: 'https://bscscan.com', c: '#facc15' },
  { id: '0xa86a', n: 'Avalanche', sym: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc', exp: 'https://snowtrace.io', c: '#f87171' },
  { id: '0xaa36a7', n: 'Sepolia (testnet)', sym: 'ETH', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', exp: 'https://sepolia.etherscan.io', c: '#94a3b8' },
];
const WKEY = 'cityhood_wallets';
const WAL = { found: new Map(), list: [], active: null, info: {}, bound: new Set() };   // found: rdns → { info, provider }
const chainOf = id => EVM_CHAINS.find(c => c.id === String(id).toLowerCase()) || { id, n: `Chain ${parseInt(id, 16) || id}`, sym: 'ETH', c: '#94a3b8' };
const shortAddr = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
const validAddr = a => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
const safeIcon = s => typeof s === 'string' && /^data:image\/(png|svg\+xml|webp|jpeg|gif);/i.test(s) ? s : '';
function walletSave() { try { localStorage.setItem(WKEY, JSON.stringify({ list: WAL.list, active: WAL.active })); } catch (e) { } }
function walletLoad() {
  try { const d = JSON.parse(localStorage.getItem(WKEY) || 'null'); if (d && Array.isArray(d.list)) { WAL.list = d.list.filter(w => validAddr(w.address)).map(w => ({ address: w.address, rdns: String(w.rdns || 'injected'), name: String(w.name || 'Wallet') })); WAL.active = WAL.list.some(w => w.address === d.active) ? d.active : (WAL.list[0]?.address || null); } } catch (e) { }
}
function fmtUnits(hex, dec = 18) {
  try { const v = BigInt(hex), base = 10n ** BigInt(dec), whole = v / base, frac = (v % base).toString().padStart(dec, '0').slice(0, 4).replace(/0+$/, ''); return whole.toLocaleString('en-US') + (frac ? '.' + frac : ''); } catch (e) { return '—'; }
}
function walletAvatar(a) { const h = hashStr(a.toLowerCase()); return `linear-gradient(135deg, hsl(${h % 360} 75% 60%), hsl(${(h >> 9) % 360} 70% 45%))`; }
/* discovery: EIP-6963 announcements, plus the legacy window.ethereum as a fallback */
function walletDiscover() {
  addEventListener('eip6963:announceProvider', e => {
    const d = e.detail; if (!d || !d.provider || !d.info) return;
    const rdns = String(d.info.rdns || d.info.uuid || 'unknown');
    WAL.found.set(rdns, { info: { name: String(d.info.name || 'Wallet').slice(0, 40), icon: safeIcon(d.info.icon), rdns }, provider: d.provider });
    walletBind(rdns);
  });
  dispatchEvent(new Event('eip6963:requestProvider'));
  setTimeout(() => {
    if (!WAL.found.size && window.ethereum) { WAL.found.set('injected', { info: { name: window.ethereum.isMetaMask ? 'MetaMask' : 'Browser wallet', icon: '', rdns: 'injected' }, provider: window.ethereum }); walletBind('injected'); }
    walletRestore();
  }, 400);
}
function walletBind(rdns) {
  const w = WAL.found.get(rdns); if (!w || WAL.bound.has(rdns) || typeof w.provider.on !== 'function') return; WAL.bound.add(rdns);
  w.provider.on('accountsChanged', () => walletRefresh());
  w.provider.on('chainChanged', () => walletRefresh());
}
async function walletReq(rdns, method, params) { const w = WAL.found.get(rdns); if (!w) throw new Error('Wallet not detected'); return w.provider.request(params ? { method, params } : { method }); }
async function walletRestore() { if (WAL.list.length) await walletRefresh(); }
// read chain + balance of every linked wallet whose extension is present (eth_accounts never opens a popup)
async function walletRefresh() {
  for (const w of WAL.list) {
    const info = WAL.info[w.address] = WAL.info[w.address] || {};
    if (!WAL.found.has(w.rdns)) { info.status = 'missing'; continue; }
    try {
      const accs = (await walletReq(w.rdns, 'eth_accounts')).map(a => a.toLowerCase());
      info.status = accs.includes(w.address.toLowerCase()) ? 'ok' : 'locked';
      info.chain = await walletReq(w.rdns, 'eth_chainId');
      info.bal = info.status === 'ok' ? await walletReq(w.rdns, 'eth_getBalance', [w.address, 'latest']) : null;
    } catch (e) { info.status = 'error'; }
  }
  if (S.started) renderChips();
  if ($('#wPanel')) renderWalletPanel();
}
function walletErr(e) {
  const c = e && e.code;
  if (c === 4001) toast('Request rejected', 'You declined the request in your wallet', 'wa', 'wallet');
  else if (c === -32002) toast('Check your wallet', 'A request is already waiting for your approval', 'wa', 'wallet');
  else toast('Wallet error', (e && e.message ? String(e.message) : 'Unknown error').slice(0, 90), 'bad', 'alert');
}
async function walletConnect(rdns) {
  try {
    const accs = await walletReq(rdns, 'eth_requestAccounts'), name = WAL.found.get(rdns).info.name; let added = 0;
    for (const a of accs || []) { if (!validAddr(a)) continue; if (!WAL.list.some(w => w.address.toLowerCase() === a.toLowerCase())) { WAL.list.push({ address: a, rdns, name }); added++; } if (!WAL.active) WAL.active = a; }
    if (accs && accs[0] && validAddr(accs[0]) && added) WAL.active = WAL.list.find(w => w.address.toLowerCase() === accs[0].toLowerCase()).address;
    walletSave(); sfx('coin');
    toast(added ? `${name} connected` : 'Already linked', added ? `${added} address${added > 1 ? 'es' : ''} linked · ${shortAddr(WAL.active)}` : 'This wallet address is already in your list', 'info', 'wallet');
    await walletRefresh();
  } catch (e) { walletErr(e); }
}
async function walletSwitchChain(chainId) {
  const w = WAL.list.find(x => x.address === WAL.active); if (!w) return toast('No active wallet', 'Connect a wallet first', 'wa', 'wallet');
  const ch = chainOf(chainId);
  try { await walletReq(w.rdns, 'wallet_switchEthereumChain', [{ chainId }]); }
  catch (e) {
    if (e && (e.code === 4902 || e?.data?.originalError?.code === 4902) && ch.rpc) {
      try { await walletReq(w.rdns, 'wallet_addEthereumChain', [{ chainId, chainName: ch.n, nativeCurrency: { name: ch.sym, symbol: ch.sym, decimals: 18 }, rpcUrls: [ch.rpc], blockExplorerUrls: [ch.exp] }]); }
      catch (e2) { return walletErr(e2); }
    } else return walletErr(e);
  }
  toast(`Switched to ${ch.n}`, shortAddr(w.address), 'info', 'wallet'); await walletRefresh();
}
async function walletRemove(addr) {
  const w = WAL.list.find(x => x.address === addr); if (!w) return;
  WAL.list = WAL.list.filter(x => x.address !== addr); delete WAL.info[addr];
  if (WAL.active === addr) WAL.active = WAL.list[0]?.address || null;
  if (!WAL.list.some(x => x.rdns === w.rdns)) { try { await walletReq(w.rdns, 'wallet_revokePermissions', [{ eth_accounts: {} }]); } catch (e) { } }
  walletSave(); toast('Wallet removed', shortAddr(addr), 'info', 'wallet'); if (S.started) renderChips(); renderWalletPanel();
}
/* UI */
function walletChip() {
  const w = WAL.list.find(x => x.address === WAL.active); if (!w) return '';
  const i = WAL.info[w.address] || {}, ch = i.chain ? chainOf(i.chain) : null;
  return `<button class="gc" data-g="wallet" title="${esc(w.name)} · ${esc(w.address)}"><span class="wdot" style="background:${walletAvatar(w.address)}"></span>${shortAddr(w.address)}${ch ? ` · ${esc(ch.n.replace(' (testnet)', ''))}` : ''}</button>`;
}
function renderWalletPanel() {
  const el = $('#wPanel'); if (!el) return;
  const act = WAL.list.find(x => x.address === WAL.active), ai = act ? WAL.info[act.address] || {} : {};
  const rows = WAL.list.map(w => {
    const i = WAL.info[w.address] || {}, ch = i.chain ? chainOf(i.chain) : null, on = w.address === WAL.active;
    const st = i.status === 'ok' ? (i.bal != null ? `${fmtUnits(i.bal)} ${ch ? ch.sym : ''}` : '…') : i.status === 'missing' ? '<span class="dn">wallet not detected</span>' : i.status === 'locked' ? '<span class="dn">locked — open your wallet</span>' : i.status === 'error' ? '<span class="dn">unavailable</span>' : '…';
    return `<div class="nrow ${on ? 'act' : ''}"><span class="wav" style="background:${walletAvatar(w.address)}"></span><div style="min-width:0;flex:1"><div class="nn">${esc(w.name)} ${on ? '<span class="badge">Active</span>' : ''}</div><div class="ns num">${shortAddr(w.address)}${ch ? ` · ${esc(ch.n)}` : ''} · ${st}</div></div>
      <div class="na">${on ? '' : `<button class="btn sm pri" data-wact="${w.address}">Use</button>`}<button class="btn sm" data-wcopy="${w.address}" title="Copy address">${ico('copy')}</button>${ch && ch.exp ? `<a class="btn sm" href="${ch.exp}/address/${w.address}" target="_blank" rel="noopener" title="View on explorer">${ico('link')}</a>` : ''}<button class="btn sm dan" data-wdel="${w.address}" title="Remove">${ico('x')}</button></div></div>`;
  }).join('') || '<div class="ms">No wallet linked yet.</div>';
  const found = [...WAL.found.values()];
  const picker = found.length ? found.map(f => `<button class="btn wpick" data-wcon="${esc(f.info.rdns)}">${f.info.icon ? `<img src="${f.info.icon}" alt="">` : ico('wallet')}<span>${esc(f.info.name)}</span></button>`).join('')
    : `<div class="ms" style="margin-bottom:8px">No browser wallet detected. Install one (MetaMask, Rabby, Coinbase Wallet, OKX…) or, on a phone, open Cityhood inside your wallet app's browser.</div>
       <div class="row" style="flex-wrap:wrap;gap:6px"><a class="btn sm pri" href="https://metamask.app.link/dapp/${esc(location.host + location.pathname)}" target="_blank" rel="noopener">${ico('wallet')} Open in MetaMask app</a><a class="btn sm" href="https://metamask.io/download/" target="_blank" rel="noopener">Get MetaMask</a><a class="btn sm" href="https://rabby.io/" target="_blank" rel="noopener">Get Rabby</a></div>`;
  const chains = EVM_CHAINS.map(c => `<button class="btn sm ${ai.chain && c.id === String(ai.chain).toLowerCase() ? 'pri' : ''}" data-wchain="${c.id}" ${act ? '' : 'disabled'}><span class="wdot" style="background:${c.c}"></span>${esc(c.n)}</button>`).join('');
  el.innerHTML = `<span class="flbl" style="margin-top:0">Linked wallets</span><div>${rows}</div>
    <span class="flbl">Network${act ? ` · ${esc(act.name)}` : ''}</span><div class="row" style="flex-wrap:wrap;gap:6px">${chains}</div>
    <span class="flbl">${WAL.list.length ? 'Add another wallet' : 'Connect a wallet'}</span><div class="wgrid">${picker}</div>`;
  el.querySelectorAll('[data-wcon]').forEach(b => b.onclick = () => walletConnect(b.dataset.wcon));
  el.querySelectorAll('[data-wact]').forEach(b => b.onclick = () => { WAL.active = b.dataset.wact; walletSave(); sfx('click'); if (S.started) renderChips(); renderWalletPanel(); walletRefresh(); });
  el.querySelectorAll('[data-wdel]').forEach(b => b.onclick = () => walletRemove(b.dataset.wdel));
  el.querySelectorAll('[data-wchain]').forEach(b => b.onclick = () => walletSwitchChain(b.dataset.wchain));
  el.querySelectorAll('[data-wcopy]').forEach(b => b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.wcopy); toast('Address copied', shortAddr(b.dataset.wcopy), 'info', 'copy'); } catch (e) { } });
}
function openWallet() {
  modal({
    title: 'Wallets · EVM', sub: 'Link one or more browser wallets. Cityhood only reads your address, network and balance — it never asks for keys and never sends transactions.', icon: 'wallet', wide: 1,
    html: '<div id="wPanel"></div>', onRender: () => { renderWalletPanel(); dispatchEvent(new Event('eip6963:requestProvider')); setTimeout(renderWalletPanel, 300); walletRefresh(); }
  });
}

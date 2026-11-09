# Cityhood (formerly SOVEREIGN) — Handoff (v0.4 prototype)

> 3D nation builder. The player is president: starts with land, money and basic facilities, builds roads and buildings, grows a country, then unlocks diplomacy and founds up to 5 nations.
> Status: **playable prototype.** It is pure client side, with no backend yet. v0.3 adds win/lose conditions, difficulty, competitive AI, lasting events, zoning, traffic, land value, disasters, music, graphics settings and save export/import (see §3.7–3.8). v0.4 is fully in English and adds realism: living city, weather and seasons, transport buildings, a citizens' feed, calendar moments and a real economy (see §3.9).

---

## 1. TL;DR for the developer

| | |
|---|---|
| Output | `dist/index.html`, a single self-contained file (~355 KB) |
| Runtime deps | **Three.js r160** (ESM from `cdn.jsdelivr.net`) + Google Fonts (Unbounded, Manrope). Nothing else. |
| Build | `node build.mjs` (Node ≥ 18, no npm install needed). It concatenates `src/` → `dist/index.html` |
| Deploy now | Static hosting. Nginx on the Hostinger VPS (config in `deploy/`) or Vercel (`vercel.json`). GitHub Actions (`.github/workflows/deploy.yml`) builds, smoke-tests and deploys on push; setup in README |
| Save system | `localStorage` key `sovereign_save_v1` (autosave every in-game month; format v2, v1 saves still load). Export/import as `.json` from Settings or the title screen |
| Debug API | Open with `?debug` → `window.__game` exposes state + helpers |

```bash
node build.mjs                 # → dist/index.html
npm run preview                # build + serve on http://localhost:4173
./deploy/deploy.sh user@vps    # rsync dist/ to /var/www/sovereign/dist
```

> ⚠️ Serve over http(s). Opening `dist/index.html` straight from disk also works in Chrome, because Three.js loads from the CDN.

---

## 2. Source layout

All files share **one ES module scope** after concatenation. Order matters for top-level `const`s.
Functions are hoisted, and every cross-file call happens only after `init()` runs.

| File | Responsibility |
|---|---|
| `src/00_shell.html` | `<head>`, all CSS (design tokens in `:root`), static DOM skeleton (HUD containers, modal, title, loading) |
| `src/01_core.js` | Constants, seeded RNG + Perlin noise, formatting (`money`, `fmt`, English units K/M/B/T), SVG icon set `I`, **building catalogue `BT`**, policies `POL`, milestones, AI nation defs, global state `S`, Three.js renderer/scene/lights/sky, terrain generation, heightfield + terrain mesh, water shader, instanced trees, territory overlay |
| `src/02_geometry.js` | `GB`, the procedural geometry builder (boxes/gables/lathes → one merged BufferGeometry with vertex colors; lit windows go to a separate geometry). `GEO.<type>(g, level, variant, nationColor)` for all 37 building types, road/bridge geometry per neighbour mask, rotor, car. **Instancing `Pool`** class |
| `src/03_simulation.js` | Placement rules, buildings, roads, cars, particles (smoke/steam/dust), nations, starter cities, daily simulation (applies `natMods`, land value, congestion), month end, elections, AI behaviour |
| `src/04_ui.js` | Audio blips, toasts, modal system, HUD, toolbar, build drawer, info panel, overlays (ghost/cursor/range ring), input (mouse/touch/keyboard), minimap, dialogs (nations, transfer, diplomacy, policy, stats, settings, found nation) |
| `src/05_progression.js` | **Agenda** (26 missions / 4 chapters), unlock gating, RCI demand meter, data views (heatmaps + building tint), problem marker sprites |
| `src/05b_governance.js` | Difficulty `DIFF` & modes, modal queue (`queueModal`/`decide`), timed effects (`addMod`/`natMods`), public demand, fiscal crisis/IMF, impeachment, game over & secession, victory/term end/score/style title, world ranking, AI personalities & upgrades & AI-initiated diplomacy, `EVENTS` (with follow-ups), monthly/daily drivers `govMonthEnd`/`govDay` |
| `src/05c_city.js` | Zoning (`ZONES`, `zoneDev`, overlay), auto-upgrade, land value, disasters + repair, procedural music, graphics quality `GFX`, save export/import, status chips, approval breakdown |
| `src/05d_realism.js` | Transport buildings (`busterminal`, `metro` added to `BT`/`GEO`), districts, weather & seasons (`WX`, rain streaks, lightning), fireworks, living city (buses, pedestrians, planes, ships, `trafficFactor`), citizens' feed, calendar (New Year, Independence Day, moving Eid holiday), inflation/price level, GDP growth, ministry budgets, drivers `realDay`/`realMonth`/`realTick` |
| `src/06_main.js` | Camera rig, day/night, shadows, clouds, labels, save/load, new game, title screen, runtime thumbnail rendering, main loop, `init()` |

---

## 3. Core systems

### 3.1 World
- `MAP = 160` tiles. Tile types: `DEEP, SHALLOW, SAND, GRASS, FOREST, HILL, MTN`.
- Seeded generation (`S.seed`, editable on the title screen). Uses domain-warped fBm with a radial falloff. Sea, hill and mountain thresholds come from **quantiles**, so every seed gives roughly 54% land.
- Terrain is one indexed mesh on a `(MAP+1)²` heightfield. Land is flat (`y=0`) so it stays buildable. Mountains rise and water slopes down to the seabed. Water is a transparent plane with a shader-perturbed normal.
- Trees and rocks are 3 `InstancedMesh`es. `W.treeAt` maps a tile to its instances so they can be cleared when something is built. Cleared tiles persist in the save.

### 3.2 Rendering
- **Buildings are instanced per key** `type|level|variant|flagColor` (`Pool`). Each pool has a body mesh (vertex colours, casts shadow) and an optional lit mesh (window material whose `emissiveIntensity` follows the night factor).
- Add and remove are O(1): remove swaps the last instance into the gap, copying matrix + instance colour.
- Construction animates the instance Y-scale (`easeOut`). Upgrades re-key the pool.
- Roads use one pool per 4-neighbour mask (16 shapes × land/bridge). Water tiles automatically become bridges with pillars and railings.
- Cars: one `InstancedMesh` (≤520). They follow quadratic Béziers through tile edge midpoints and drive on the left.
- Day/night: a 6-minute cycle that lerps sky shader, fog, sun and hemisphere light, and drives window emissive. The shadow camera follows the view and scales with zoom.
- Thumbnails for the build menu are rendered at startup by an offscreen `WebGLRenderer` and stored as data URLs.

### 3.3 Simulation (per nation, 1 day = 0.8 s at 1×)
- **Active building** = completed AND (road-adjacent, or `road:false` types such as parks, solar, wind).
- Power and water are a nation-wide pool: `ratio = min(1, supply / demand)`.
- **Residential happiness** = 0.40 + coverage(edu/health/safety/fire) + parks + landmarks − pollution − tax penalty − power/water shortage + policy effects.
- Occupancy moves toward `cap × clamp(0.18 + 0.9·happy − 0.7·unemployment)`.
- Workers = 55% of population. Job fill = employed / jobs.
- **Money accrues daily** (monthly rates ÷ 30):
  - tax = Σ occupants × 3.5 × tax% (× `taxm`)
  - business = jobs × fill × rev × tax/10 × power factor
  - plus tourism, trade (ports, airport, trade agreements)
  - minus upkeep (buildings + 25 per road tile), policies and loan instalments
- **Approval** trends toward `happy·64 + (1−unemp)·22 ± treasury + modifiers` (parliament +5, military +2, alliance, events).
- Month end: history snapshot (charts), loans tick, AI expansion, elections every 60 months, random event (30%), autosave.

### 3.4 Progression ("build up your own nation first")
- **Building unlocks** by population (`BT[type].unlock`), e.g. Apartemen 3,000, Mal 6,000, Pencakar Langit 60,000, Menara Ikonik 120,000.
- **Milestone grants** at 2k / 5k / 10k / 25k / 50k / 100k / 250k / 500k / 1M population.
- **Feature gates** (`UNL` in `05_progression.js`): Diplomacy at **5,000** population, founding new nations at **25,000**.
- **Agenda**: 26 missions in 4 chapters, with 3 active at a time. Each mission pays a reward and each chapter pays a bonus. Clicking a mission opens the matching build tool. Player-action counters live in `S.cnt`.

### 3.5 Multi-nation & AI
- 3 AI nations, spawned ≥ 46–58 tiles from the player. They use the same simulation as the player.
- `aiAct` runs every 2 days and builds by need (power, water, jobs vs housing), and sometimes upgrades a building (`aiUpgrade`). `aiRoad` extends a 4-tile grid. `aiExpand` claims land on a personality-dependent cadence and cap.
- Personalities (`PERS`): **Aggressive** (cap 2,200 tiles, relation drifts to 35, makes territorial demands, friction on shared borders), **Mercantile** (offers trade deals), **Peaceful** (relation drifts to 62, offers alliances).
- Diplomacy: trade agreement (income = √(popA·popB)·9 per month), aid (+relation), alliance (relation ≥ 75), buy border land (relation ≥ 50). AI-initiated (`aiDiplomacy`, monthly): tariffs when relation < 30 and trading (business −8%, industry −15%, 12 months), sanctions when < 22 (tourism −25%, trade −15%), territorial demands, aid requests, trade and alliance offers. Military Base or the Conscription policy deters demands. "Peace talks" ($2M) lifts tariffs/sanctions.
- Player nations: up to 5, each with its own treasury, tax, policies, loans and approval. Funds can be transferred between them. The active nation is `S.active`.

### 3.6 Save format (`localStorage['sovereign_save_v1']`, v2)
```
{ v: 2, seed, president, day, active, cycle, owner: RLE[int8], roads:[tileIdx], cleared:[tileIdx],
  diff, mode, over, won, ended, zones: RLE[uint8], evq:[{id,nid,day}], evRecent, st:{months,apprSum,peak,greenM,relSum},
  nations:[{id,name,color,flag2,fstyle,ai,leader,treasury,tax,capital,approval,apprMod,tiles,hist,pol,loans,ms,trades,allied,rel,radius,founded,acc,last,rate,
            popM,dem,debtM,lowM,coalUsed,mods,pers,sanc,imfDay,sec,stake}],
  blds:[[type,x,z,rot,nid,level,variant,occ,prog,happy,dmg]], news, opts, mis, cnt, unl,
  wx:{k,left,temp}, feed:[{d,who,h,dist,text,mood,x,z,bid,nid}], eidUntil }   // nations also store P, infl, bud (v0.4)
```
The terrain is regenerated from `seed`, so only deltas are stored. A typical save is 20–80 KB. v1 saves load as Career · Normal and show a "what's new" dialog once.

### 3.7 Challenge & governance (v0.3)
- **Modes**: Career (win/lose) or Sandbox (no game over). **Difficulty** `DIFF`: Easy / Normal / Hard (start funds, player upkeep, demand rate & cap, impeachment threshold, months to bankruptcy, coalition rescues, disaster frequency, AI aggression, victory population, score multiplier).
- **Public demand** (`n.dem`): grows every month (rate shrinks as the nation approaches the victory population), relieved by growth above the best population so far (1%/month = −3), missions (−3), chapters (−8), landmarks (−6), milestones (−10). It is subtracted from the approval target.
- **Lose**: bankrupt (treasury < 0 for `crisis` consecutive months; IMF bailout offered halfway, once per 5 years), impeachment (approval < `appLo` for 6 months; protest event at 2 months), lost election (coalition rescue: always on easy, once with ≥ 40% on normal, never on hard). A secondary player nation that fails breaks away and becomes AI instead of ending the game.
- **Win**: Superpower = all 26 missions + total player population ≥ `vic` + GDP rank #1 + approval ≥ 55%. **Term end** after 240 months. Both show a legacy screen (style title from `styleOf`, score from `scoreOf`) and continue in sandbox.
- **Timed effects** (`n.mods`): multiplicative on tax/com/ind/tour/trade/upk, additive on hap/appr. Used by events, IMF, tariffs and sanctions. 7 trade-off policies added to `POL` (transit, autoup, bnpb, progtax, privat, fuel, conscript).
- **Events**: 24 entries in `EVENTS`, no repeats within the last 6, follow-ups via `queueEvent` (e.g. investor → waste scandal, protest → escalation, startup → result 6 months later, sports bid → games a year later).

### 3.8 City dynamics (v0.3)
- **Zoning** (tool Z): paint R/C/I zones ($250/tile). Every 3 days private developers build on zoned, road-connected tiles when RCI demand ≥ 0.3; the state pays 50% (`DEV_SHARE`). Industry needs 2×2 zoned blocks. Bulldozing clears zones.
- **Auto-upgrade** (policy *Automatic Urban Renewal*): monthly, up to 6 qualifying buildings (homes ≥ 90% full, happy ≥ 65%, land value ≥ 0.45; business/industry when unemployment ≥ 3%) while keeping a cash reserve.
- **Land value** (`b.lval`, homes): services, parks, landmarks, water view, minus pollution. Tax multiplier 0.7 + 0.5·lval. Data map "Land value".
- **Traffic** (`n.cong` = employed / (roads·220, ×2 with *Public Transit*)): above 100% lowers happiness (up to −15%) and business revenue (up to −30%). HUD stat "Traffic".
- **Disasters** (from month 6, ~5.5%/month × difficulty): fire (fire-station coverage matters), earthquake, coastal flood, storm. Damaged buildings stop working, smoke and turn dark, recover automatically or can be repaired (30% of cost). BNPB policy halves damage and doubles recovery speed.
- **Music**: generative WebAudio ambient, switches to a minor progression during crises. **Graphics**: Tinggi/Sedang/Rendah (pixel ratio, shadow map size/off), auto-defaults lower on phones; stored per device in `localStorage['sovereign_gfx']`.

---

### 3.9 Realism (v0.4)
- **Language**: all UI and content are English. Money uses K/M/B/T and `en-US` numbers (`fmt`, `fmtPop`). Dates read "Jan 5 · Y1" (`dateStr`).
- **Transport**: Bus Terminal (+6,000 commuters, unlock 3k) and Metro Station (+40,000, unlock 30k) in the new Transport category (T). Road capacity = roads·220 (×2 with Public Transit, × infrastructure budget) + station capacity.
- **Living city** (visual only): buses spawn near terminals and metro stations, plus 6 with Public Transit. Up to 500 pedestrians walk sidewalks near the camera when you zoom in (fewer at night). Each airport gets a plane flying a take-off/circuit/landing loop. Each seaport gets a ship sailing out to open sea and back. Car density follows `trafficFactor()` (rush hours, night, Eid, rain, congestion).
- **Weather**: tropical seasons (rainy Nov–Apr, dry May–Oct) drive daily weather (`WX`: clear, cloudy, rain, storm). Solar farm output ×0.3–1, wind turbines ×1.25 in storms, tourism ×0.75–1. Floods and storms are more likely in the wet season, fires in the dry season (`seasonW`). There is a status chip and a weather dialog.
- **Citizens' feed**: every ~4 days a post generated from real conditions (blackouts, missing services, smog, traffic, jobs, taxes, inflation, sanctions, weather, holidays, praise). Each post names a citizen and a district (`districtAt`) and clicks through to the place. Shown in a panel (desktop) and in Statistics → Citizens. "Citizen mood" = share of positive posts.
- **Calendar**: New Year fireworks, Independence Day (Aug 17: approval ±2 depending on happiness), Eid holiday (moves 11 days earlier each year; traffic ×1.7 for a week, business +12% that month).
- **Economy**: player nations have a price level `n.P` that grows with inflation `n.infl`. Inflation rises with deficits and loans and falls with unemployment. Construction, upgrades, repairs, land, roads, upkeep, policies and income all scale with `P`, so hoarded cash loses value. Real GDP growth comes from income history; quarterly reports appear in the news. **Ministry budgets** (education, health, public safety, infrastructure; 50–150%) scale service coverage strength (0.55 + 0.45·budget) and the matching upkeep. Milestone grants are halved compared with v0.3.

### 3.10 Worlds & wallets (v0.4.1)
- **Worlds** (`WORLDS`, `S.world`, saved): `standard` (starter city + 3 AI nations) or `empty` / *Blank Slate*: no AI nations, no starter city, no roads, and trees cleared from the starting territory. Starting money is the same. With no housing at all, residential demand is fixed high (`demand()`) so zoning can start. Diplomacy explains that there are no other nations.
- **Wallets** (`src/05e_wallet.js`): EIP-6963 discovery (fallback `window.ethereum`), several linked wallets stored per device in `localStorage['cityhood_wallets']` (`{list:[{address,rdns,name}], active}`), active wallet, `wallet_switchEthereumChain` with a `wallet_addEthereumChain` fallback (4902) for the chains in `EVM_CHAINS`, native balance via `eth_getBalance`, silent restore with `eth_accounts`. Removing the last address of a wallet tries `wallet_revokePermissions`. On a phone without an injected wallet the dialog offers a MetaMask deep link. It is read-only: nothing is signed or sent. Linking wallets to saves, leaderboards or on-chain rewards would need a backend and signature verification (Phase 3).

## 4. Balance knobs (where to tune)

| What | Where | Current |
|---|---|---|
| Start funds | `newGame()` in `06_main.js` | $25M (player, × difficulty), $22M (AI) |
| Day length | `DAY_SEC` (`01_core.js`) | 0.8 s |
| Building stats (cost, cap, jobs, power, upkeep, unlock…) | `BT` (`01_core.js`) | 37 types |
| Level multipliers | `LVM / LVU / LVC` | cap ×1/1.7/2.6, upkeep ×1/1.5/2.1, upgrade cost 70% / 120% |
| Road / bridge | `ROAD_COST`, `BRIDGE_COST` | $2.5K / $15–30K (× price level) |
| Land price | `landPrice()` (`04_ui.js`) | $9K land, $2.5K water × (1 + tiles/3000) × price level |
| Found nation | `FOUND_COST / FOUND_SEED` | $15M cost, $10M seed |
| Feature gates | `UNL` | diplo 5k, found 25k |
| Missions & rewards | `MISSIONS`, `CH_BONUS` | 26 missions |
| Difficulty | `DIFF` (`05b_governance.js`) | see §3.7 |
| Term length | `TERM_MONTHS` | 240 months |
| AI personalities | `PERS` | tile cap, expansion cadence, relation drift |
| Events | `EVENTS` | 24, 30% chance per month |
| Zoning | `ZONE_FEE`, `DEV_SHARE` | $250/tile, state pays 50% |
| Disasters | `disasterRoll()` | 5.5%/month × `DIFF.dis` × `seasonW` |
| Weather | `WX`, `wxDay()` | season probabilities, solar/tourism factors |
| Transport capacity | `BT.busterminal/metro.tcap` | 6,000 / 40,000 commuters |
| Inflation | `econMonth()` | base 2.5%/yr, deficit & loan pressure |
| Ministry budgets | `BUD`, `budCov` | 50–150%, coverage 0.55 + 0.45·b |

---

## 5. Controls
Left-click: build / select · Right-drag: pan · Middle-drag or Alt+drag: rotate/tilt · Wheel: zoom to cursor · WASD/arrows: pan · Q/E: rotate · R: rotate building · Esc / right-click: cancel tool · Tab: political map · Space: pause · 1–9, T, Z, B, L, V: tool categories (T = transport, Z = zoning). Touch: 1 finger pans or uses the tool, 2 fingers pinch-zoom and rotate.

---

## 6. Known limitations / tech debt
1. **Single module, globals everywhere.** Fine for a prototype. For production, split into TS modules (see roadmap).
2. Saves exist only in `localStorage` (per browser). There are no accounts or cloud saves.
3. Performance targets desktop GPUs. v0.3 adds a graphics setting (shadow map 2048/1024/off, pixel ratio 2/1.5/1) with a lower default on phones, but there is still no LOD, chunking or tree thinning.
4. The simulation runs on the main thread (cheap today: < 2 ms/day). Move it to a Web Worker if maps grow.
5. Construction progresses in real time on the render loop. In background tabs, rAF pauses and so does the game. This is intentional.
6. AI is heuristic (no long-term planning), although it now upgrades buildings and reacts diplomatically.
7. Traffic is a nation-level congestion ratio, not per-road pathfinding. Cars are visual only.
9. Late-game cash can still pile up for a frugal player: a scripted builder that only places cheap buildings had ~$490M in real terms by year 10. Inflation erodes it at ~3.5%/yr, and an overspending bot went bankrupt in month 32. Tune `MILESTONES`, mission rewards or `econMonth` if money should stay tighter.
8. Three.js and fonts come from CDNs. Vendor `three.module.js` locally if the CDN is a concern (change the single import at the top of `01_core.js`).

---

## 7. Production roadmap (aligned with our stack: Next.js 14 · Fastify · Prisma/PostgreSQL · Redis · Hostinger VPS + PM2 + Nginx)

**Phase 1 — ship the prototype (now)**
- Deploy `dist/` as a static site behind Nginx with SSL (`deploy/nginx.conf.example`, `deploy/deploy.sh`).

**Phase 2 — productionise the client**
- Port `src/*` to TypeScript modules inside a Next.js 14 app. Mount the game in a client-only component (`dynamic(() => import(...), { ssr: false })`). Keep Three.js as an npm dependency (`three@0.160.x`).
- Split by the existing file boundaries: `world/`, `render/geometry`, `render/pools`, `sim/`, `ai/`, `ui/`, `progression/`. Replace globals with a `Game` class plus an event bus.
- Rebuild the HUD in React (the DOM/CSS here is the visual spec, design tokens in `:root`). Keep the canvas and input in the engine.

**Phase 3 — backend**
- Fastify + Prisma/PostgreSQL: accounts, cloud saves (store the same JSON schema, versioned), save slots.
- Redis: leaderboards (sorted sets for population, GDP, approval) and session cache.
- Optional: a shared persistent world where other players' nations replace the AI.

---

## 8. QA checklist (verified on the prototype)
- [x] Title → new game → welcome modal → Agenda visible, 3 missions
- [x] Road drag (incl. bridges), building placement (1×1 paint-drag, 2×2+ click), auto-orientation toward the road, rotate with R
- [x] Inspect panel, upgrade, demolish, bulldoze area (25% refund)
- [x] Buy land (must touch own territory), territory borders update
- [x] Diplomacy locked < 5k pop, found-nation locked < 25k; both unlock with a toast
- [x] Data views (7 modes) + legend, problem markers, RCI meter
- [x] Found a 2nd nation, switch nations, transfer funds
- [x] Save → reload → Continue restores nations, buildings, roads and territory
- [x] Day/night lighting, political map, minimap navigation
- [x] Desktop 1280–1920 and phone 390 px (no horizontal scroll)
- [x] v0.3: idle player loses on Sulit at the first election (4/4 runs), drifts to 40–50% approval on Normal, survives on Mudah; a scripted active builder keeps ~70% approval on Normal and Sulit
- [x] v0.3: fiscal crisis → IMF offer → bankruptcy → continue in sandbox; impeachment; secession of a 2nd nation; victory; term end
- [x] v0.3: AI tariffs/sanctions/territorial demands/peace; all 24 events × all choices; follow-up events fire
- [x] v0.3: all 4 disasters, repair all, automatic recovery; zoning builds houses/shops; auto-upgrade; transit halves congestion; land-value view
- [x] v0.3: v1 save loads and re-saves as v2; v2 save round-trips; export → import on a fresh browser; music and graphics toggles
- [x] v0.4: whole UI in English; transport capacity lowers congestion and spawns buses; storm lowers solar output; pedestrians when zoomed in; planes and ships move; citizens' feed and click-through; districts; New Year / Independence Day / Eid; rush-hour factor; inflation from deficits raises prices; budgets change coverage; GDP growth and quarterly reports; realism state survives save/load

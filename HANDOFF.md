# SOVEREIGN — Handoff (v0.2 prototype)

> 3D nation builder. The player is president: starts with land, money and basic facilities, builds roads and buildings, grows a country, then unlocks diplomacy and founds up to 5 nations.
> Status: **playable prototype, approved for deployment.** It is pure client side, with no backend yet.

---

## 1. TL;DR for the developer

| | |
|---|---|
| Output | `dist/index.html`, a single self-contained file (~243 KB) |
| Runtime deps | **Three.js r160** (ESM from `cdn.jsdelivr.net`) + Google Fonts (Unbounded, Manrope). Nothing else. |
| Build | `node build.mjs` (Node ≥ 18, no npm install needed). It concatenates `src/` → `dist/index.html` |
| Deploy now | Static hosting. Nginx on the Hostinger VPS (config in `deploy/`) or Vercel (`vercel.json`) |
| Save system | `localStorage` key `sovereign_save_v1` (autosave every in-game month) |
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
| `src/01_core.js` | Constants, seeded RNG + Perlin noise, formatting (`money`, `fmt`, Indonesian units rb/jt/M/T), SVG icon set `I`, **building catalogue `BT`**, policies `POL`, milestones, AI nation defs, global state `S`, Three.js renderer/scene/lights/sky, terrain generation, heightfield + terrain mesh, water shader, instanced trees, territory overlay |
| `src/02_geometry.js` | `GB`, the procedural geometry builder (boxes/gables/lathes → one merged BufferGeometry with vertex colors; lit windows go to a separate geometry). `GEO.<type>(g, level, variant, nationColor)` for all 37 building types, road/bridge geometry per neighbour mask, rotor, car. **Instancing `Pool`** class |
| `src/03_simulation.js` | Placement rules, buildings, roads, cars, particles (smoke/steam/dust), nations, starter cities, daily simulation, month end, elections, AI behaviour, random events |
| `src/04_ui.js` | Audio blips, toasts, modal system, HUD, toolbar, build drawer, info panel, overlays (ghost/cursor/range ring), input (mouse/touch/keyboard), minimap, dialogs (nations, transfer, diplomacy, policy, stats, settings, found nation) |
| `src/05_progression.js` | **Program Kerja** (26 missions / 4 chapters), unlock gating, RCI demand meter, data views (heatmaps + building tint), problem marker sprites |
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

### 3.4 Progression ("fokus negara sendiri dulu")
- **Building unlocks** by population (`BT[type].unlock`), e.g. Apartemen 3,000, Mal 6,000, Pencakar Langit 60,000, Menara Ikonik 120,000.
- **Milestone grants** at 2k / 5k / 10k / 25k / 50k / 100k / 250k / 500k / 1M population.
- **Feature gates** (`UNL` in `05_progression.js`): Diplomacy at **5,000** population, founding new nations at **25,000**.
- **Program Kerja**: 26 missions in 4 chapters, with 3 active at a time. Each mission pays a reward and each chapter pays a bonus. Clicking a mission opens the matching build tool. Player-action counters live in `S.cnt`.

### 3.5 Multi-nation & AI
- 3 AI nations, spawned ≥ 46–58 tiles from the player. They use the same simulation as the player.
- `aiAct` runs every 2 days and builds by need (power, water, jobs vs housing). `aiRoad` extends a 4-tile grid. `aiExpand` claims land every 3 months (cap 1,600 tiles).
- Diplomacy: trade agreement (income = √(popA·popB)·9 per month), aid (+relation), alliance (relation ≥ 75), buy border land (relation ≥ 50).
- Player nations: up to 5, each with its own treasury, tax, policies, loans and approval. Funds can be transferred between them. The active nation is `S.active`.

### 3.6 Save format (`localStorage['sovereign_save_v1']`)
```
{ v, seed, president, day, active, cycle, owner: RLE[int8], roads:[tileIdx], cleared:[tileIdx],
  nations:[{id,name,color,flag2,fstyle,ai,leader,treasury,tax,capital,approval,apprMod,tiles,hist,pol,loans,ms,trades,allied,rel,radius,founded,acc,last,rate}],
  blds:[[type,x,z,rot,nid,level,variant,occ,prog,happy]], news, opts, mis, cnt, unl }
```
The terrain is regenerated from `seed`, so only deltas are stored. A typical save is 20–80 KB.

---

## 4. Balance knobs (where to tune)

| What | Where | Current |
|---|---|---|
| Start funds | `newGame()` in `06_main.js` | $25 jt (player), $22 jt (AI) |
| Day length | `DAY_SEC` (`01_core.js`) | 0.8 s |
| Building stats (cost, cap, jobs, power, upkeep, unlock…) | `BT` (`01_core.js`) | 37 types |
| Level multipliers | `LVM / LVU / LVC` | cap ×1/1.7/2.6, upkeep ×1/1.5/2.1, upgrade cost 70% / 120% |
| Road / bridge | `ROAD_COST`, `BRIDGE_COST` | $2,5 rb / $15–30 rb |
| Land price | `landPrice()` (`04_ui.js`) | $9 rb land, $2,5 rb water × (1 + tiles/3000) |
| Found nation | `FOUND_COST / FOUND_SEED` | $15 jt cost, $10 jt seed |
| Feature gates | `UNL` | diplo 5k, found 25k |
| Missions & rewards | `MISSIONS`, `CH_BONUS` | 26 missions |

---

## 5. Controls
Left-click: build / select · Right-drag: pan · Middle-drag or Alt+drag: rotate/tilt · Wheel: zoom to cursor · WASD/arrows: pan · Q/E: rotate · R: rotate building · Esc / right-click: cancel tool · Tab: political map · Space: pause · 1–9, B, L, V: tool categories. Touch: 1 finger pans or uses the tool, 2 fingers pinch-zoom and rotate.

---

## 6. Known limitations / tech debt
1. **Single module, globals everywhere.** Fine for a prototype. For production, split into TS modules (see roadmap).
2. Saves exist only in `localStorage` (per browser). There are no accounts or cloud saves.
3. Performance targets desktop GPUs: 2048 shadow map, ~5–8k tree instances, up to a few thousand building instances. There is no LOD or chunking yet. Recommended: lower the shadow map to 1024 and halve the trees on mobile/low-end devices (detect via `renderer.capabilities` or the UA).
4. The simulation runs on the main thread (cheap today: < 2 ms/day). Move it to a Web Worker if maps grow.
5. Construction progresses in real time on the render loop. In background tabs, rAF pauses and so does the game. This is intentional.
6. AI is heuristic (no long-term planning). AI nations do not upgrade buildings.
7. No traffic simulation, disasters, land value or auto-levelling yet.
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
- [x] Title → new game → welcome modal → Program Kerja visible, 3 missions
- [x] Road drag (incl. bridges), building placement (1×1 paint-drag, 2×2+ click), auto-orientation toward the road, rotate with R
- [x] Inspect panel, upgrade, demolish, bulldoze area (25% refund)
- [x] Buy land (must touch own territory), territory borders update
- [x] Diplomacy locked < 5k pop, found-nation locked < 25k; both unlock with a toast
- [x] Data views (7 modes) + legend, problem markers, RCI meter
- [x] Found a 2nd nation, switch nations, transfer funds
- [x] Save → reload → Continue restores nations, buildings, roads and territory
- [x] Day/night lighting, political map, minimap navigation
- [x] Desktop 1280–1920 and phone 390 px (no horizontal scroll)

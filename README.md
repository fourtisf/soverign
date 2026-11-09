# SOVEREIGN — Build Your Nation

A 3D nation-builder that runs in the browser. You are the president: start with land, some capital and basic facilities, then grow your country. Once it is developed, open diplomacy and found up to 5 nations.

**What's in it**
- **Challenge:** Career mode (win and lose) or Sandbox, three difficulty levels, public demand, fiscal crises and IMF bailouts, impeachment, elections you can lose, a Superpower victory and a historical title at the end of your term.
- **A living world:** AI neighbours with personalities (tariffs, sanctions, territorial demands, trade and alliance offers), 24 chained events with lasting effects and 7 trade-off policies.
- **A real city:** zoning (Z) with private developers, automatic upgrades, traffic, land value and disasters.
- **v0.4 realism:**
  - **Movement and weather:** buses, pedestrians, planes taking off and ships sailing to your ports; rush hour; tropical rainy and dry seasons with storms.
  - **Transport and people:** a Bus Terminal and a Metro Station (T); a citizens' feed with district names.
  - **Calendar and economy:** New Year, Independence Day and an Eid holiday that moves every year; inflation, real GDP growth, quarterly reports and ministry budgets.
- **Settings:** background music, graphics quality, and save export/import.

## Play
- **Online (free, no domain or server):** https://fourtisf.github.io/soverign/. GitHub Pages deploys it automatically on every push to the default branch. Enable it once under **Settings → Pages → Source: GitHub Actions**.
- **Offline file:** open `dist/index.html` in Chrome. It needs internet for Three.js and the fonts.
- **Local server:** `npm run preview`, then open http://localhost:4173

## Build & deploy
```bash
node build.mjs                 # src/ → dist/index.html
./deploy/deploy.sh user@vps    # upload to /var/www/sovereign/dist (Nginx)
```
The Nginx config is in `deploy/nginx.conf.example`. For Vercel, `vercel.json` is enough.

## Automatic deploy with GitHub Actions
`.github/workflows/deploy.yml` runs on every push:
1. **Test** (all branches): builds and checks that `dist/` matches the build. It then opens the game in headless Chromium and clicks "Start Governing". The job fails on any console error.
2. **Pages** (default branch only): publishes `dist/` to GitHub Pages and runs the same browser test against the live site.
3. **VPS deploy** (default branch only, optional): uploads `dist/` with `deploy/deploy.sh`.
   - On the first deploy, `deploy/server-setup.sh` installs the Nginx site and SSL (certbot).
   - It then checks the live site (HTTPS 200, `cache-control: no-cache`, HTTP → HTTPS redirect) and runs the browser test.

For the VPS deploy, set these once under **Settings → Secrets and variables → Actions**:

| Name | Type | Value |
|---|---|---|
| `VPS_HOST` | secret | VPS IP or hostname |
| `VPS_USER` | secret | SSH user (root, or a user with passwordless sudo) |
| `VPS_SSH_KEY` | secret | private deploy key (see below) |
| `DOMAIN` | variable | e.g. `sovereign.example.com` (its A record must point to the VPS) |
| `VPS_PORT` | secret, optional | SSH port if not 22 |
| `CERTBOT_EMAIL` | variable, optional | email for Let's Encrypt notices |

Create a deploy key on your computer and register the public key on the VPS:
```bash
ssh-keygen -t ed25519 -N "" -C github-actions-sovereign -f sovereign_deploy
ssh-copy-id -i sovereign_deploy.pub user@host
```
Put the contents of `sovereign_deploy` (the private key) into the `VPS_SSH_KEY` secret. Then open **Actions → Build, test & deploy → Run workflow**, or push any commit.

The setup script never changes other sites. It stops with a clear message in any of these cases:
- Nginx or certbot is missing.
- The domain is already used by another site.
- The existing Nginx config is already broken.

## Docs
- `HANDOFF.md` covers the architecture, the game systems, balance tuning and the production roadmap.
- `CLAUDE_CODE_PROMPT.md` is a ready-to-paste prompt for deploying with Claude Code.

Debug: add `?debug` to the URL to get `window.__game`.

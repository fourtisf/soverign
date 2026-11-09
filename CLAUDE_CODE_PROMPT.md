# Claude Code prompt — deploy SOVEREIGN

Copy everything below the line into Claude Code, run from inside the `sovereign/` folder.

---

You are deploying **SOVEREIGN**, a 3D nation-builder browser game (Three.js r160). The project is already complete and tested. Your job is to put it online on our Hostinger VPS (Ubuntu, Nginx, PM2 already in use for other projects) with HTTPS. Read `HANDOFF.md` first for full context.

**Project facts**
- `src/` holds 7 source parts. `node build.mjs` concatenates them into one self-contained file `dist/index.html`. Node ≥ 18, no npm install needed.
- It is a pure static site with no server code and no env vars. Three.js and fonts load from CDNs.
- The prebuilt `dist/index.html` is included and identical to what the build produces.

**Tasks**
1. Run `node build.mjs` and confirm `dist/index.html` is generated (~243 KB). Do not modify the game code unless a step below requires it.
2. Initialise a git repo (if none) with a sensible `.gitignore`. Commit as "SOVEREIGN v0.2 prototype". If a GitHub remote is provided, create a private repo and push.
3. Ask me for: VPS SSH target (`user@host`) and the domain/subdomain to use (suggestion: `sovereign.<our-domain>`). Wait for my answer before touching the server.
4. On the VPS:
   - Create `/var/www/sovereign/dist`, then upload `dist/` with `./deploy/deploy.sh user@host` (rsync).
   - Install the Nginx site from `deploy/nginx.conf.example` (replace `<DOMAIN>`), enable it, run `nginx -t`, then reload. Do not break or edit other existing sites.
   - Issue SSL with `certbot --nginx -d <DOMAIN>` and confirm HTTP redirects to HTTPS.
   - PM2 is **not** needed (static files only).
5. Verify:
   - `curl -I https://<DOMAIN>` returns 200 with `content-type: text/html` and `cache-control: no-cache` on index.html.
   - The page HTML contains `SOVEREIGN` and the Three.js import from `cdn.jsdelivr.net/npm/three@0.160.0`.
   - If a headless browser is available, load the page, click "Start Governing", and confirm there are no console errors.
6. Report the live URL, the exact redeploy command (`./deploy/deploy.sh user@host`), and any changes made on the server.

**Rules**
- Keep it static and simple. Do not port to Next.js in this task (that is Phase 2 in HANDOFF.md, a separate job).
- Never print or commit secrets or SSH keys.
- If anything on the server looks different from expected (no Nginx, port conflicts, existing site on the same domain), stop and ask.

# SOVEREIGN — Bangun Negaramu

Game nation builder 3D di browser. Kamu jadi presiden: mulai dengan lahan, modal, dan fasilitas dasar, lalu bangun negaramu. Setelah negaramu maju, buka diplomasi dan dirikan hingga 5 negara.

## Mainkan
- **Langsung:** buka `dist/index.html` di Chrome (butuh internet untuk Three.js & font).
- **Lokal:** `npm run preview` → http://localhost:4173

## Build & deploy
```bash
node build.mjs                 # src/ → dist/index.html
./deploy/deploy.sh user@vps    # upload ke /var/www/sovereign/dist (Nginx)
```
Konfigurasi Nginx ada di `deploy/nginx.conf.example`, dan untuk Vercel cukup `vercel.json`.

## Dokumen
- `HANDOFF.md` berisi arsitektur, sistem game, cara tuning balance, dan roadmap produksi.
- `CLAUDE_CODE_PROMPT.md` berisi prompt siap-tempel untuk deploy lewat Claude Code.

Debug: tambahkan `?debug` di URL untuk mengakses `window.__game`.

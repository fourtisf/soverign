# SOVEREIGN — Bangun Negaramu

Game nation builder 3D di browser. Kamu jadi presiden: mulai dengan lahan, modal, dan fasilitas dasar, lalu bangun negaramu. Setelah negaramu maju, buka diplomasi dan dirikan hingga 5 negara.

**Baru di v0.3:** mode Karier (bisa menang & kalah) atau Bebas, 3 tingkat kesulitan, tuntutan rakyat, krisis fiskal & bailout IMF, pemakzulan, pemilu yang bisa kalah, kemenangan Negara Adidaya & gelar sejarah; tetangga AI berkepribadian (tarif, sanksi, tuntutan wilayah); 24 event berantai dengan efek berbulan-bulan; 7 kebijakan baru; zonasi (Z) & peremajaan otomatis; kemacetan, nilai tanah, bencana alam; musik latar; pengaturan grafis; ekspor/impor simpanan.

## Mainkan
- **Online (gratis, tanpa domain/server):** https://fourtisf.github.io/soverign/ — di-deploy otomatis oleh GitHub Pages setiap ada push ke branch default. Aktifkan sekali di **Settings → Pages → Source: GitHub Actions**.
- **Langsung:** buka `dist/index.html` di Chrome (butuh internet untuk Three.js & font).
- **Lokal:** `npm run preview` → http://localhost:4173

## Build & deploy
```bash
node build.mjs                 # src/ → dist/index.html
./deploy/deploy.sh user@vps    # upload ke /var/www/sovereign/dist (Nginx)
```
Konfigurasi Nginx ada di `deploy/nginx.conf.example`, dan untuk Vercel cukup `vercel.json`.

## Deploy otomatis lewat GitHub Actions
`.github/workflows/deploy.yml` berjalan di setiap push:
1. **Test** (semua branch): build, cek `dist/` sama dengan hasil build, lalu buka game di Chromium headless, klik "Mulai Memerintah", dan gagal jika ada error di console.
2. **Pages** (hanya branch default): publikasikan `dist/` ke GitHub Pages, lalu jalankan test browser yang sama ke situs live.
3. **Deploy VPS** (hanya branch default, opsional): upload `dist/` ke VPS dengan `deploy/deploy.sh`. Pada deploy pertama, `deploy/server-setup.sh` memasang site Nginx dan SSL (certbot). Setelah itu, workflow memeriksa situs live (HTTPS 200, `cache-control: no-cache`, redirect HTTP → HTTPS) dan menjalankan test browser yang sama.

Untuk deploy VPS, isi sekali di **Settings → Secrets and variables → Actions**:

| Nama | Jenis | Isi |
|---|---|---|
| `VPS_HOST` | secret | IP atau hostname VPS |
| `VPS_USER` | secret | user SSH (root, atau user dengan sudo tanpa password) |
| `VPS_SSH_KEY` | secret | isi private key untuk deploy (lihat di bawah) |
| `DOMAIN` | variable | mis. `sovereign.domainmu.com` (A record harus mengarah ke VPS) |
| `VPS_PORT` | secret, opsional | port SSH jika bukan 22 |
| `CERTBOT_EMAIL` | variable, opsional | email untuk notifikasi Let's Encrypt |

Buat key khusus deploy di komputermu, lalu daftarkan public key-nya ke VPS:
```bash
ssh-keygen -t ed25519 -N "" -C github-actions-sovereign -f sovereign_deploy
ssh-copy-id -i sovereign_deploy.pub user@host
```
Isi file `sovereign_deploy` (private key) ke secret `VPS_SSH_KEY`. Setelah itu buka tab **Actions → Build, test & deploy → Run workflow**, atau push commit apa saja.

Script setup tidak mengubah site lain. Ia berhenti dengan pesan jelas jika Nginx/certbot tidak ada, domain sudah dipakai site lain, atau config Nginx yang ada sudah error.

## Dokumen
- `HANDOFF.md` berisi arsitektur, sistem game, cara tuning balance, dan roadmap produksi.
- `CLAUDE_CODE_PROMPT.md` berisi prompt siap-tempel untuk deploy lewat Claude Code.

Debug: tambahkan `?debug` di URL untuk mengakses `window.__game`.

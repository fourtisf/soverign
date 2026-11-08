#!/usr/bin/env bash
# Build locally and upload dist/ to the VPS.  Usage: ./deploy/deploy.sh user@host
set -euo pipefail
HOST="${1:?usage: deploy.sh user@host}"
cd "$(dirname "$0")/.."
node build.mjs
ssh "$HOST" "sudo mkdir -p /var/www/sovereign/dist && sudo chown -R \$USER /var/www/sovereign"
rsync -avz --delete dist/ "$HOST:/var/www/sovereign/dist/"
echo "Deployed. Reload nginx if this is the first deploy: sudo nginx -t && sudo systemctl reload nginx"

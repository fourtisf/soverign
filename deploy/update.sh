#!/usr/bin/env bash
# Run on the VPS to publish the latest build from GitHub:
#   bash /opt/cityhood/deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
SITE_ROOT=/var/www/sovereign/dist
mkdir -p "$SITE_ROOT"
cp -r dist/. "$SITE_ROOT/"
echo "Published $(git log -1 --format='%h · %s') to $SITE_ROOT"

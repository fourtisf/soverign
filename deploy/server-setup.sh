#!/usr/bin/env bash
# One-time server setup for SOVEREIGN on an Ubuntu + Nginx VPS:
# installs the Nginx site for <domain> from nginx.conf.example and issues HTTPS
# with certbot. You can run it again: once the site and certificate exist it
# changes nothing. It never edits other sites, and it stops with an explanation
# if the server is not set up as expected.
#
# The GitHub Actions deploy runs this automatically. To run it by hand:
#   rsync -a deploy/server-setup.sh deploy/nginx.conf.example user@host:.sovereign-setup/
#   ssh user@host 'bash .sovereign-setup/server-setup.sh sovereign.example.com [email]'
set -euo pipefail

DOMAIN="${1:?usage: server-setup.sh <domain> [certbot-email]}"
EMAIL="${2:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$HERE/nginx.conf.example"
SITE_ROOT=/var/www/sovereign/dist
AVAIL=/etc/nginx/sites-available/sovereign
ENABLED=/etc/nginx/sites-enabled/sovereign

stop() { echo "STOP: $*" >&2; exit 1; }

[[ "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$ ]] || stop "invalid domain: $DOMAIN"
DOMAIN_RE="${DOMAIN//./\\.}"
SERVES_DOMAIN="^[[:space:]]*server_name[^;]*[[:space:]]${DOMAIN_RE}([[:space:];]|$)"

SUDO=()
if [ "$(id -u)" -ne 0 ]; then
  sudo -n true 2>/dev/null || stop "user $(whoami) needs passwordless sudo, or deploy as root"
  SUDO=(sudo -n)
fi

# --- does the server look as expected? ---------------------------------------
command -v nginx >/dev/null || stop "nginx is not installed"
if [ ! -d /etc/nginx/sites-available ] || [ ! -d /etc/nginx/sites-enabled ]; then
  stop "expected the Ubuntu layout /etc/nginx/sites-available + sites-enabled"
fi
systemctl is-active --quiet nginx || stop "nginx is not running"
[ -f "$SITE_ROOT/index.html" ] || stop "$SITE_ROOT/index.html is missing; upload dist/ first (deploy/deploy.sh)"
[ -f "$TEMPLATE" ] || stop "nginx.conf.example not found next to this script"

others="$("${SUDO[@]}" grep -RlE "$SERVES_DOMAIN" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
  | grep -vxF "$ENABLED" || true)"
[ -z "$others" ] || stop "$DOMAIN is already served by another Nginx site: $others"

# --- Nginx site --------------------------------------------------------------
if [ -f "$AVAIL" ]; then
  "${SUDO[@]}" grep -qE "$SERVES_DOMAIN" "$AVAIL" || stop "$AVAIL already exists for a different domain"
  echo "Nginx site already installed: $AVAIL"
else
  [ ! -e "$ENABLED" ] || stop "$ENABLED exists but $AVAIL does not"
  "${SUDO[@]}" nginx -t 2>/dev/null || stop "the current Nginx config is already invalid (nginx -t); not touching it"
  tmp="$(mktemp)"
  sed "s/<DOMAIN>/$DOMAIN/g" "$TEMPLATE" > "$tmp"
  "${SUDO[@]}" install -m 644 "$tmp" "$AVAIL"
  rm -f "$tmp"
  "${SUDO[@]}" ln -s "$AVAIL" "$ENABLED"
  if ! "${SUDO[@]}" nginx -t; then
    "${SUDO[@]}" rm -f "$ENABLED" "$AVAIL"
    stop "nginx -t failed with the new site, so it was removed again and Nginx was not reloaded"
  fi
  "${SUDO[@]}" systemctl reload nginx
  echo "Installed and enabled Nginx site: $AVAIL"
fi

# --- HTTPS -------------------------------------------------------------------
if "${SUDO[@]}" grep -q ssl_certificate "$AVAIL"; then
  echo "HTTPS already configured for $DOMAIN"
else
  command -v certbot >/dev/null || stop "certbot is not installed (apt install certbot python3-certbot-nginx)"
  if [ -n "$EMAIL" ]; then reg=(-m "$EMAIL"); else reg=(--register-unsafely-without-email); fi
  "${SUDO[@]}" certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${reg[@]}" \
    || stop "certbot failed. Check that the DNS A record for $DOMAIN points to this server ($(hostname -I | awk '{print $1}'))"
  echo "HTTPS issued for $DOMAIN (HTTP now redirects to HTTPS)"
fi

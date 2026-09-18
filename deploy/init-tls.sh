#!/usr/bin/env bash
# Issue the first Let's Encrypt certificate.
#
# Chicken-and-egg: nginx will not start without a certificate, so it cannot
# serve the ACME challenge that produces one. This runs certbot standalone on
# port 80 with nginx down, then the stack can start normally. Renewal afterwards
# is handled by the certbot service in docker-compose.yml over webroot.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "error: .env not found. cp .env.example .env and fill it in first." >&2
    exit 1
fi

set -a; . ./.env; set +a

: "${DOMAIN:?set DOMAIN in .env}"
: "${LETSENCRYPT_EMAIL:?set LETSENCRYPT_EMAIL in .env}"

echo "==> Checking that ${DOMAIN} resolves to this machine"
resolved="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || true)"
public="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
echo "    ${DOMAIN} -> ${resolved:-<unresolved>}"
echo "    this host -> ${public:-<unknown>}"

if [ -z "$resolved" ]; then
    echo "error: ${DOMAIN} does not resolve. Update your DuckDNS record first." >&2
    exit 1
fi
if [ -n "$public" ] && [ "$resolved" != "$public" ]; then
    echo "warning: DNS points elsewhere. Validation will fail unless this is a proxy." >&2
    read -rp "    continue anyway? [y/N] " ok
    [ "$ok" = "y" ] || exit 1
fi

echo "==> Stopping nginx so certbot can bind port 80"
docker compose stop nginx 2>/dev/null || true

echo "==> Requesting certificate for ${DOMAIN}"
docker run --rm -p 80:80 \
    -v eatlify_certbot_conf:/etc/letsencrypt \
    -v eatlify_certbot_www:/var/www/certbot \
    certbot/certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos --no-eff-email --non-interactive

echo "==> Certificate issued. Bringing the stack up"
docker compose up -d

echo
echo "Done. Verify with:"
echo "  curl -sS https://${DOMAIN}/api/health"

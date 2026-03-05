#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/staff-app"
DOMAIN="staff.readingtown.cn"
EMAIL="admin@readingtown.cn"

log() {
  echo "[$(date +'%F %T')] $*"
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  echo "ERROR: docker compose/docker-compose not found" >&2
  exit 1
}

debug_dump() {
  log "[DEBUG] collecting diagnostics"
  ss -lntp | grep -E ':80|:443|:3001|:5432' || true
  compose -f "$APP_DIR/docker-compose.yml" ps || true
  compose -f "$APP_DIR/docker-compose.yml" logs --tail=200 web db || true
  systemctl status staff-app.service --no-pager || true
  systemctl status nginx --no-pager || true
}

trap 'code=$?; log "[ERROR] line:$LINENO exit:$code"; debug_dump; exit $code' ERR

log "Compose detection check"
if docker compose version >/dev/null 2>&1; then
  log "Using: docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  log "Using: docker-compose"
else
  echo "ERROR: docker compose/docker-compose not found" >&2
  exit 1
fi

log "[1/6] Prepare directories"
sudo mkdir -p "$APP_DIR" /data/postgres /data/uploads /data/backups
sudo chown -R "$USER:$USER" "$APP_DIR" /data/uploads
sudo chown -R 999:999 /data/postgres

log "[2/6] Sync source"
rsync -av --delete ./ "$APP_DIR"/
cd "$APP_DIR"

log "[3/6] Environment"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Edit $APP_DIR/.env and rerun this script."
  exit 1
fi

log "[4/6] Docker compose up"
compose -f docker-compose.yml build --no-cache
compose -f docker-compose.yml up -d

log "[5/6] Create systemd unit"
sudo tee /etc/systemd/system/staff-app.service > /dev/null <<'UNIT'
[Unit]
Description=ReadingTown Staff App (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/staff-app
ExecStart=/usr/bin/env bash -lc 'if docker compose version >/dev/null 2>&1; then docker compose -f /opt/staff-app/docker-compose.yml up -d; else docker-compose -f /opt/staff-app/docker-compose.yml up -d; fi'
ExecStop=/usr/bin/env bash -lc 'if docker compose version >/dev/null 2>&1; then docker compose -f /opt/staff-app/docker-compose.yml down; else docker-compose -f /opt/staff-app/docker-compose.yml down; fi'
ExecReload=/usr/bin/env bash -lc 'if docker compose version >/dev/null 2>&1; then docker compose -f /opt/staff-app/docker-compose.yml up -d --build; else docker-compose -f /opt/staff-app/docker-compose.yml up -d --build; fi'
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now staff-app.service

log "[6/6] Optional host Nginx + certbot (only when host nginx is active)"
if systemctl is-active --quiet nginx; then
  sudo cp infra/nginx/staff.readingtown.cn.conf /etc/nginx/sites-available/staff.readingtown.cn.conf
  sudo ln -sf /etc/nginx/sites-available/staff.readingtown.cn.conf /etc/nginx/sites-enabled/staff.readingtown.cn.conf
  sudo nginx -t
  sudo systemctl reload nginx

  if command -v certbot >/dev/null 2>&1; then
    sudo certbot --nginx -d "$DOMAIN" --redirect -m "$EMAIL" --agree-tos --no-eff-email || true
  else
    log "certbot not found. skipping SSL issuance"
  fi
else
  log "Host nginx is not active. Skipping host nginx/certbot steps."
  log "If you use containerized proxy (NPM/Traefik/Caddy), add route: $DOMAIN -> 127.0.0.1:3001"
fi

compose -f docker-compose.yml ps
curl -I http://127.0.0.1:3001/login || true

log "Done."

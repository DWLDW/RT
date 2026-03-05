#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Prepare directories"
sudo mkdir -p /opt/staff-app /data/postgres /data/uploads
sudo chown -R "$USER":"$USER" /opt/staff-app /data/uploads
sudo chown -R 999:999 /data/postgres

echo "[2/6] Sync source"
rsync -av --delete ./ /opt/staff-app/
cd /opt/staff-app

echo "[3/6] Environment"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Edit /opt/staff-app/.env and rerun this script."
  exit 1
fi

echo "[4/6] Docker compose up"
docker compose up -d --build

echo "[5/6] Nginx config install"
sudo cp infra/nginx/staff.readingtown.cn.conf /etc/nginx/sites-available/staff.readingtown.cn.conf
sudo ln -sf /etc/nginx/sites-available/staff.readingtown.cn.conf /etc/nginx/sites-enabled/staff.readingtown.cn.conf
sudo nginx -t
sudo systemctl reload nginx

echo "[6/6] SSL issue (Let's Encrypt)"
sudo certbot --nginx -d staff.readingtown.cn --redirect -m admin@readingtown.cn --agree-tos --no-eff-email

echo "Done. Existing lms.readingtown.cn is untouched because we only add a new site config."

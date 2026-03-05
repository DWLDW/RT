#!/usr/bin/env bash
set -Eeuo pipefail

TARGET_DIR="${TARGET_DIR:-/opt/staff-app}"
REPO_URL="${REPO_URL:-https://github.com/DWLDW/RT.git}"
BRANCH="${BRANCH:-main}"

echo "[1/6] Stop existing containers (if any)"
if [ -f "$TARGET_DIR/docker-compose.yml" ]; then
  cd "$TARGET_DIR"
  if docker compose version >/dev/null 2>&1; then
    docker compose down --remove-orphans || true
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down --remove-orphans || true
  fi
fi

echo "[2/6] Backup existing .env (if any)"
if [ -f "$TARGET_DIR/.env" ]; then
  cp "$TARGET_DIR/.env" "/tmp/staff-app.env.$(date +%F_%H%M%S).bak"
  echo "Backed up .env to /tmp"
fi

echo "[3/6] Remove existing repo directory"
rm -rf "$TARGET_DIR"

echo "[4/6] Fresh clone"
git clone "$REPO_URL" "$TARGET_DIR"
cd "$TARGET_DIR"
git checkout "$BRANCH"

echo "[5/6] Bring up latest code"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example; edit required before first start"
fi

if docker compose version >/dev/null 2>&1; then
  docker compose -f docker-compose.yml build --no-cache
  docker compose -f docker-compose.yml up -d
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f docker-compose.yml build --no-cache
  docker-compose -f docker-compose.yml up -d
else
  echo "ERROR: docker compose/docker-compose not found" >&2
  exit 1
fi

echo "[6/6] Done"
echo "Check: docker compose -f docker-compose.yml ps (or docker-compose ...)"

#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/staff-app}"
BRANCH="${BRANCH:-main}"

log() { echo "[$(date +'%F %T')] $*"; }

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

log "Compose detection check"
if docker compose version >/dev/null 2>&1; then
  log "Using: docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  log "Using: docker-compose"
else
  echo "ERROR: docker compose/docker-compose not found" >&2
  exit 1
fi

cd "$APP_DIR"

log "[1/5] Update code to latest origin/$BRANCH"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

log "[2/5] Verify known build blockers are fixed in checked-out code"
if rg -n 'next/typescript' .eslintrc.json >/dev/null 2>&1; then
  echo "ERROR: .eslintrc.json still contains next/typescript" >&2
  exit 1
fi
if rg -n 'return\s*\{\s*error:' 'app/(auth)/login/page.tsx' >/dev/null 2>&1; then
  echo "ERROR: loginAction still returns error object" >&2
  exit 1
fi

log "[3/5] Build and start containers"
compose -f docker-compose.yml build --no-cache
compose -f docker-compose.yml up -d

log "[4/5] Basic checks"
compose -f docker-compose.yml ps
compose -f docker-compose.yml logs --tail=120 web db || true
curl -I http://127.0.0.1:3001/login || true

log "[5/5] Done"

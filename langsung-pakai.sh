#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-local}"
OPEN_BROWSER="${OPEN_BROWSER:-true}"

STORE_URL="http://localhost:3000/store"
ADMIN_URL="http://localhost:3000/admin"
HEALTH_URL="http://localhost:3000/api/health"

open_url() {
  local url="$1"
  [ "$OPEN_BROWSER" != "true" ] && return 0

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v start >/dev/null 2>&1; then
    start "$url" >/dev/null 2>&1 || true
  fi
}

print_ready() {
  echo ""
  echo "✅ AskasStore sudah jalan"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Customer : $STORE_URL"
  echo "Admin    : $ADMIN_URL"
  echo "Health   : $HEALTH_URL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Tips:"
  echo "- Kalau browser belum kebuka otomatis, copy URL di atas."
  echo "- Stop local server: Ctrl + C"
  echo ""
}

wait_until_ready() {
  local max_try="$1"
  for _ in $(seq 1 "$max_try"); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

case "$MODE" in
  local)
    echo "[INFO] Menjalankan mode local..."
    ./run.sh &
    APP_PID=$!
    trap 'kill "$APP_PID" 2>/dev/null || true' EXIT

    if wait_until_ready 30; then
      print_ready
      open_url "$STORE_URL"
      wait "$APP_PID"
      exit 0
    fi

    echo "[ERROR] Server belum siap setelah 30 detik"
    exit 1
    ;;

  docker)
    if ! command -v docker >/dev/null 2>&1; then
      echo "[ERROR] Docker belum terpasang"
      exit 1
    fi

    echo "[INFO] Menjalankan mode docker compose..."
    docker compose up --build -d

    if wait_until_ready 60; then
      print_ready
      open_url "$STORE_URL"
      echo "[INFO] Stop service docker: docker compose down"
      exit 0
    fi

    echo "[ERROR] Service docker belum siap setelah 60 detik"
    exit 1
    ;;

  *)
    echo "Usage: ./langsung-pakai.sh [local|docker]"
    echo "Optional: OPEN_BROWSER=false ./langsung-pakai.sh local"
    exit 1
    ;;
esac

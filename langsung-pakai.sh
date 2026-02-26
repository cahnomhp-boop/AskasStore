#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-local}"

print_urls() {
  echo ""
  echo "✅ AskasStore siap dipakai"
  echo "- Store : http://localhost:3000/store"
  echo "- Admin : http://localhost:3000/admin"
  echo "- Health: http://localhost:3000/api/health"
}

case "$MODE" in
  local)
    echo "[INFO] Menjalankan mode local..."
    ./run.sh &
    APP_PID=$!
    trap 'kill "$APP_PID" 2>/dev/null || true' EXIT

    for _ in $(seq 1 30); do
      if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
        print_urls
        wait "$APP_PID"
      fi
      sleep 1
    done

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

    for _ in $(seq 1 60); do
      if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
        print_urls
        echo "[INFO] Stop service: docker compose down"
        exit 0
      fi
      sleep 1
    done

    echo "[ERROR] Service docker belum siap setelah 60 detik"
    exit 1
    ;;
  *)
    echo "Usage: ./langsung-pakai.sh [local|docker]"
    exit 1
    ;;
esac

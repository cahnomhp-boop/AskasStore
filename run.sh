#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js belum terpasang. Install Node.js 18+ dulu ya."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm belum tersedia. Pastikan instalasi Node.js lengkap."
  exit 1
fi

cd "$BACKEND_DIR"

if [ ! -f .env ] && [ -f .env.example ]; then
  echo "[INFO] .env tidak ditemukan, membuat dari .env.example"
  cp .env.example .env
fi

if [ ! -d node_modules ]; then
  echo "[INFO] node_modules belum ada, menjalankan npm install..."
  npm install
else
  echo "[INFO] Dependencies sudah ada, skip npm install."
fi

echo "[INFO] Menjalankan AskasStore di http://localhost:3000 ..."
exec npm start

#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/plachet-staging/current"
PM2_CONFIG="$APP_ROOT/deploy/pm2/ecosystem.config.cjs"

echo "[1/5] Installation des dependances..."
cd "$APP_ROOT"
npm ci

echo "[2/5] Build front..."
npm run build:prod

echo "[3/5] Verification types..."
npm run lint

echo "[4/5] Redemarrage PM2..."
pm2 startOrReload "$PM2_CONFIG"
pm2 save

echo "[5/5] Verification service..."
curl -fsS http://127.0.0.1:3000/healthz
echo ""
echo "Deploy staging termine."


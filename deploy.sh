#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de déploiement Astreinte V2
# Usage : ./deploy.sh
# À placer dans ~/Astreinte-V2/ sur le serveur
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Arrêt immédiat en cas d'erreur

APP_DIR="$HOME/Astreinte-V2"
PM2_NAME="astreinte"

echo "────────────────────────────────────────────"
echo "  Déploiement Astreinte V2"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "────────────────────────────────────────────"

cd "$APP_DIR"

# ── 1. Récupérer le nouveau code ─────────────────────────────────────────────
echo ""
echo "▶ 1/7 — Pull du dépôt git…"
git pull origin main

# ── 2. Installer les dépendances ─────────────────────────────────────────────
echo ""
echo "▶ 2/7 — Installation des dépendances npm…"
npm ci --omit=dev

# ── 3. Générer le client Prisma ───────────────────────────────────────────────
echo ""
echo "▶ 3/7 — Génération du client Prisma…"
npx prisma generate

# ── 4. Appliquer les migrations DB ────────────────────────────────────────────
echo ""
echo "▶ 4/7 — Migrations base de données…"
npx prisma migrate deploy

# ── 5. Build Next.js (standalone) ────────────────────────────────────────────
echo ""
echo "▶ 5/7 — Build Next.js…"
npm run build

# ── 6. Copier les assets statiques dans le dossier standalone ────────────────
echo ""
echo "▶ 6/7 — Copie des assets statiques…"
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Copier le .env de production dans le standalone
if [ -f ".env" ]; then
  cp .env .next/standalone/.env
fi

# ── 7. Redémarrer PM2 ────────────────────────────────────────────────────────
echo ""
echo "▶ 7/7 — Redémarrage PM2…"
pm2 restart "$PM2_NAME" || pm2 start ecosystem.config.js

echo ""
echo "────────────────────────────────────────────"
echo "  ✓ Déploiement terminé avec succès"
echo "  Hash : $(git log --oneline -1)"
echo "────────────────────────────────────────────"

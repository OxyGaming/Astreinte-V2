#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de déploiement Astreinte V2
# Usage : ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Arrêt immédiat en cas d'erreur

echo "🚀 Déploiement Astreinte V2 — $(date '+%Y-%m-%d %H:%M:%S')"
cd ~/Astreinte-V2 || exit

# ── 1. Sauvegarde de la base de données live ──────────────────────────────────
echo ""
echo "💾 1/8 — Sauvegarde base de données live..."
# La DB live est dans standalone — on la rapatrie avant le pull
if [ -f ".next/standalone/prisma/dev.db" ]; then
  cp .next/standalone/prisma/dev.db prisma/dev.db
fi
cp prisma/dev.db prisma/dev.db.backup

# ── 2. Pull du nouveau code ───────────────────────────────────────────────────
echo ""
echo "📥 2/8 — Pull Git..."
git pull origin main

# ── 3. Installer les dépendances ─────────────────────────────────────────────
echo ""
echo "📦 3/8 — Installation des dépendances..."
npm install

# ── 4. Générer le client Prisma ───────────────────────────────────────────────
echo ""
echo "⚙️  4/8 — Génération du client Prisma..."
npx prisma generate

# ── 5. Appliquer les migrations DB ────────────────────────────────────────────
echo ""
echo "🗄️  5/8 — Migrations base de données..."
npx prisma migrate deploy

# ── 6. Build Next.js (standalone) ────────────────────────────────────────────
echo ""
echo "🏗️  6/8 — Build..."
npm run build

# ── 7. Sync fichiers standalone ───────────────────────────────────────────────
echo ""
echo "📁 7/8 — Sync fichiers standalone..."

# Assets statiques
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Base de données (on remet la DB live dans standalone)
mkdir -p .next/standalone/prisma
cp prisma/dev.db .next/standalone/prisma/dev.db

# Variables d'environnement
if [ -f ".env" ]; then
  cp .env .next/standalone/.env
fi

# ── 8. Redémarrer PM2 ────────────────────────────────────────────────────────
echo ""
echo "🔄 8/8 — Restart PM2..."
pm2 restart astreinte --update-env || pm2 start ecosystem.config.js
pm2 list

echo ""
echo "✅ Déploiement terminé — $(git log --oneline -1)"

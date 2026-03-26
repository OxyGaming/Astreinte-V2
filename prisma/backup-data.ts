/**
 * backup-data.ts — Sauvegarde horodatée de prisma/data/
 * Usage : npm run db:backup
 *
 * Copie prisma/data/ vers prisma/data-backup/YYYYMMDD-HHMMSS/
 * Les backups sont gitignorés.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const ROOT      = join(__dirname, "..");
const DATA_DIR  = join(ROOT, "prisma", "data");
const BACKUP_ROOT = join(ROOT, "prisma", "data-backup");

if (!existsSync(DATA_DIR) || readdirSync(DATA_DIR).length === 0) {
  console.error("❌ prisma/data/ est vide ou absent. Rien à sauvegarder.");
  process.exit(1);
}

const now    = new Date();
const stamp  = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest   = join(BACKUP_ROOT, stamp);

mkdirSync(dest, { recursive: true });
cpSync(DATA_DIR, dest, { recursive: true });

console.log(`✅ Backup créé : prisma/data-backup/${stamp}/`);

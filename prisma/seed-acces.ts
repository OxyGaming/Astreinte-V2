/**
 * Import initial des points d'accès ferroviaires depuis le fichier KML.
 * Usage : tsx prisma/seed-acces.ts [chemin/vers/fichier.kml]
 *
 * Stratégie : suppression des entrées KML existantes puis batch insert.
 * Les entrées BACKOFFICE (ajoutées manuellement) sont conservées.
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import os from "os";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { parseKmlContent } from "../src/lib/parseKml";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbAbsPath = require("path").isAbsolute(dbPath) ? dbPath : join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url: dbAbsPath });
const prisma = new PrismaClient({ adapter });

const kmlPath =
  process.argv[2] ??
  join(os.homedir(), "Downloads", "Point d'accès Astreinte.kml");

async function main() {
  console.log(`📂 Lecture du fichier KML : ${kmlPath}`);
  const kmlContent = readFileSync(kmlPath, "utf-8");

  console.log("🔍 Parsing KML…");
  const points = parseKmlContent(kmlContent);
  console.log(`   → ${points.length} point(s) extraits`);

  // Supprimer les anciens points KML (pas les BACKOFFICE)
  const deleted = await prisma.accesRail.deleteMany({ where: { source: "KML" } });
  console.log(`🗑️  ${deleted.count} anciens points KML supprimés`);

  // Insertion par batch de 500
  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    await prisma.accesRail.createMany({
      data: batch.map((p) => ({
        ligne: p.ligne,
        pk: p.pk,
        type: p.type ?? null,
        identifiant: p.identifiant ?? null,
        nomAffiche: p.nomAffiche,
        nomComplet: p.nomComplet,
        latitude: p.latitude,
        longitude: p.longitude,
        description: null,
        source: "KML",
      })),
    });
    inserted += batch.length;
    process.stdout.write(`\r✅ Inséré : ${inserted}/${points.length}`);
  }

  console.log(`\n🎉 Import terminé : ${inserted} points d'accès en base`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

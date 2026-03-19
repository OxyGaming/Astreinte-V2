/**
 * Seed des postes depuis prisma/data/postes.json
 * Utilise upsert (slug unique) → idempotent.
 * Usage : npm run db:seed-postes
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

type PosteRow = {
  slug: string; nom: string; typePoste: string; lignes: string;
  adresse: string; horaires: string; electrification: string; systemeBlock: string;
  annuaire: string; circuitsVoie: string; pnSensibles: string; particularites: string;
  proceduresCles: string; dbc: string | null; rex: string | null; secteurId: string | null;
};

async function main() {
  console.log("🌱 Seed postes...");

  const postesData: PosteRow[] = JSON.parse(
    readFileSync(join(__dirname, "data", "postes.json"), "utf-8")
  );

  for (const p of postesData) {
    await prisma.poste.upsert({
      where: { slug: p.slug },
      update: {
        nom: p.nom, typePoste: p.typePoste, lignes: p.lignes,
        adresse: p.adresse, horaires: p.horaires, electrification: p.electrification,
        systemeBlock: p.systemeBlock, secteurId: p.secteurId,
        annuaire: p.annuaire, circuitsVoie: p.circuitsVoie,
        pnSensibles: p.pnSensibles, particularites: p.particularites,
        proceduresCles: p.proceduresCles, dbc: p.dbc, rex: p.rex,
      },
      create: {
        slug: p.slug, nom: p.nom, typePoste: p.typePoste, lignes: p.lignes,
        adresse: p.adresse, horaires: p.horaires, electrification: p.electrification,
        systemeBlock: p.systemeBlock, secteurId: p.secteurId,
        annuaire: p.annuaire, circuitsVoie: p.circuitsVoie,
        pnSensibles: p.pnSensibles, particularites: p.particularites,
        proceduresCles: p.proceduresCles, dbc: p.dbc, rex: p.rex,
      },
    });
    console.log(`  ✓ ${p.nom}`);
  }

  console.log(`\n✅ ${postesData.length} postes seedés avec succès !`);
}

main()
  .catch((e) => { console.error("❌ Erreur:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

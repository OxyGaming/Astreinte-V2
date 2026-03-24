/**
 * Seed des procédures métier depuis prisma/data/procedures/*.json
 * Associe chaque procédure aux postes concernés.
 * Usage : npm run db:seed-procedures
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

// Association procédure → postes (slug du poste)
const PROCEDURE_POSTES: Record<string, string[]> = {
  "cessation-giv": ["givors-ville"],
};

async function main() {
  console.log("🌱 Seed procédures métier...");

  const proceduresDir = join(__dirname, "data", "procedures");
  const files = readdirSync(proceduresDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(proceduresDir, file), "utf-8"));
    const { slug, titre, typeProcedure, description, version, etapes } = data;

    const procedure = await prisma.procedure.upsert({
      where: { slug },
      update: {
        titre,
        typeProcedure,
        description: description ?? null,
        version,
        etapes: JSON.stringify(etapes),
      },
      create: {
        slug,
        titre,
        typeProcedure,
        description: description ?? null,
        version,
        etapes: JSON.stringify(etapes),
      },
    });

    console.log(`  ✓ Procédure : ${titre} (v${version})`);

    // Associer aux postes configurés
    const posteSlugs = PROCEDURE_POSTES[slug] ?? [];
    for (const posteSlug of posteSlugs) {
      const poste = await prisma.poste.findUnique({ where: { slug: posteSlug } });
      if (!poste) {
        console.warn(`    ⚠ Poste '${posteSlug}' introuvable — association ignorée`);
        continue;
      }

      await prisma.posteProcedure.upsert({
        where: { posteId_procedureId: { posteId: poste.id, procedureId: procedure.id } },
        update: {},
        create: { posteId: poste.id, procedureId: procedure.id, ordre: 0 },
      });

      console.log(`    → Associée à : ${posteSlug}`);
    }
  }

  console.log("\n✅ Seed procédures terminé !");
}

main()
  .catch((e) => { console.error("❌ Erreur:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

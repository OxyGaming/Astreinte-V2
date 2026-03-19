/**
 * Exporte toutes les données métier de la DB vers prisma/data/*.json
 * Ces fichiers sont versionnés dans git et relus par les scripts seed.
 *
 * Usage : npm run db:export
 *
 * ⚠️  Les utilisateurs et comptes admin ne sont PAS exportés (sécurité).
 * ⚠️  Les sessions, logs et commentaires ne sont PAS exportés (données opérationnelles).
 * ⚠️  Les points d'accès (AccesRail) ne sont PAS exportés (rechargés depuis le KML).
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const DATA_DIR = join(__dirname, "data");

function write(filename: string, data: unknown) {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log(`📂 Export vers ${DATA_DIR}\n`);

  // Contacts
  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: "asc" } });
  write("contacts.json", contacts.map(({ createdAt, updatedAt, ...c }) => c));
  console.log(`✓ ${contacts.length} contacts`);

  // Secteurs
  const secteurs = await prisma.secteur.findMany({ orderBy: { createdAt: "asc" } });
  write("secteurs.json", secteurs.map(({ createdAt, updatedAt, ...s }) => s));
  console.log(`✓ ${secteurs.length} secteurs`);

  // Fiches + relations contacts
  const fiches = await prisma.fiche.findMany({
    include: { contacts: { select: { contactId: true } } },
    orderBy: { numero: "asc" },
  });
  write("fiches.json", fiches.map(({ createdAt, updatedAt, contacts, ...f }) => ({
    ...f,
    contactIds: contacts.map((c) => c.contactId),
  })));
  console.log(`✓ ${fiches.length} fiches`);

  // Mnémoniques
  const mnemoniques = await prisma.mnemonique.findMany({ orderBy: { createdAt: "asc" } });
  write("mnemoniques.json", mnemoniques.map(({ createdAt, updatedAt, ...m }) => m));
  console.log(`✓ ${mnemoniques.length} mnémoniques`);

  // Abréviations
  const abreviations = await prisma.abreviation.findMany({ orderBy: { sigle: "asc" } });
  write("abreviations.json", abreviations.map(({ createdAt, updatedAt, ...a }) => a));
  console.log(`✓ ${abreviations.length} abréviations`);

  // Postes
  const postes = await prisma.poste.findMany({ orderBy: { createdAt: "asc" } });
  write("postes.json", postes.map(({ createdAt, updatedAt, ...p }) => p));
  console.log(`✓ ${postes.length} postes`);

  console.log("\n🎉 Export terminé — pensez à committer prisma/data/");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

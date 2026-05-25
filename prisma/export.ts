/**
 * Exporte toutes les données métier de la DB vers prisma/data/*.json
 * Ces fichiers sont relus par `prisma/seed.ts` lors d'un reset (`npm run db:reset`).
 *
 * Usage : `tsx prisma/export.ts` (ou créer un script npm si besoin).
 *
 * Exporté :
 *   - contacts, secteurs (+ colonne liens), fiches (+ liens),
 *     mnémoniques, abréviations, postes (+ liens),
 *     procédures (etapes inclut etapes[].liens),
 *     lien-categories, liens (collection centrale),
 *     mains-courantes (uniquement status="validated" — pas de brouillon /
 *     contribution rejetée, pour limiter la fuite de contenu utilisateur).
 *
 * ⚠️  Les utilisateurs et comptes admin ne sont PAS exportés (hashs bcrypt, sécurité).
 * ⚠️  Les sessions de fiche / logs d'actions / commentaires ne sont PAS exportés
 *     (données opérationnelles, sans valeur après reset).
 * ⚠️  Les points d'accès (AccesRail) ne sont PAS exportés (rechargés depuis le KML).
 * ⚠️  Les documents PDF ne sont PAS exportés (binaires stockés hors DB sous /uploads).
 * ⚠️  L'AdminAuditLog n'est PAS exporté (journal d'audit ne doit pas voyager).
 *
 * Note de sécurité : aucun secret n'est hardcodé. DATABASE_URL vient de
 * l'environnement (.env), valeur par défaut `file:./dev.db`. Les .json générés
 * sous prisma/data/ contiennent des données métier — gérés par .gitignore.
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

  // Secteurs — inclut la colonne `liens` (LienRef[] sérialisé)
  const secteurs = await prisma.secteur.findMany({ orderBy: { createdAt: "asc" } });
  write("secteurs.json", secteurs.map(({ createdAt, updatedAt, ...s }) => s));
  console.log(`✓ ${secteurs.length} secteurs`);

  // Fiches + relations contacts/secteurs + colonne `liens`
  const fiches = await prisma.fiche.findMany({
    include: {
      contacts: { select: { contactId: true } },
      secteurs: { select: { secteurId: true } },
    },
    orderBy: { numero: "asc" },
  });
  write(
    "fiches.json",
    fiches.map(({ createdAt, updatedAt, contacts, secteurs, ...f }) => ({
      ...f,
      contactIds: contacts.map((c) => c.contactId),
      secteurIds: secteurs.map((s) => s.secteurId),
    })),
  );
  console.log(`✓ ${fiches.length} fiches`);

  // Mnémoniques
  const mnemoniques = await prisma.mnemonique.findMany({ orderBy: { createdAt: "asc" } });
  write("mnemoniques.json", mnemoniques.map(({ createdAt, updatedAt, ...m }) => m));
  console.log(`✓ ${mnemoniques.length} mnémoniques`);

  // Abréviations
  const abreviations = await prisma.abreviation.findMany({ orderBy: { sigle: "asc" } });
  write("abreviations.json", abreviations.map(({ createdAt, updatedAt, ...a }) => a));
  console.log(`✓ ${abreviations.length} abréviations`);

  // Postes — inclut la colonne `liens`
  const postes = await prisma.poste.findMany({
    include: { secteurs: { select: { secteurId: true } } },
    orderBy: { createdAt: "asc" },
  });
  write(
    "postes.json",
    postes.map(({ createdAt, updatedAt, secteurs, ...p }) => ({
      ...p,
      secteurIds: secteurs.map((s) => s.secteurId),
    })),
  );
  console.log(`✓ ${postes.length} postes`);

  // Procédures + relations postes
  const procedures = await prisma.procedure.findMany({
    include: { postes: { select: { posteId: true, ordre: true } } },
    orderBy: { createdAt: "asc" },
  });
  write(
    "procedures.json",
    procedures.map(({ createdAt, updatedAt, postes, ...p }) => ({
      ...p,
      postes: postes.map((pp) => ({ posteId: pp.posteId, ordre: pp.ordre })),
    })),
  );
  console.log(`✓ ${procedures.length} procédures`);

  // Thématiques de liens utiles
  const lienCategories = await prisma.lienCategorie.findMany({ orderBy: { ordre: "asc" } });
  write("lien-categories.json", lienCategories.map(({ createdAt, updatedAt, ...c }) => c));
  console.log(`✓ ${lienCategories.length} thématiques de liens`);

  // Collection de liens utiles
  const liens = await prisma.lien.findMany({ orderBy: [{ categorieId: "asc" }, { ordre: "asc" }] });
  write("liens.json", liens.map(({ createdAt, updatedAt, ...l }) => l));
  console.log(`✓ ${liens.length} liens utiles`);

  // Mains courantes (uniquement entrées validées — pas de brouillons / rejetées)
  // L'auteur est exporté par username (pas par id) : le seed devra re-résoudre.
  const mainCourantes = await prisma.mainCourante.findMany({
    where: { status: "validated" },
    include: {
      auteur:      { select: { username: true } },
      validatedBy: { select: { username: true } },
    },
    orderBy: { validatedAt: "asc" },
  });
  write(
    "mains-courantes.json",
    mainCourantes.map(({ createdAt, updatedAt, validatedAt, auteur, validatedBy, auteurId, validatedByUserId, clientOpId, ...mc }) => ({
      ...mc,
      auteurUsername:      auteur?.username ?? null,
      validatedByUsername: validatedBy?.username ?? null,
      validatedAt:         validatedAt ? validatedAt.toISOString() : null,
    })),
  );
  console.log(`✓ ${mainCourantes.length} mains courantes (validées)`);

  console.log("\n🎉 Export terminé — pensez à committer prisma/data/");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

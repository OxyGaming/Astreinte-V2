import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(__dirname, "data", filename), "utf-8")) as T;
}

type ContactRow   = { id: string; nom: string; role: string; categorie: string; telephone: string; telephoneAlt?: string | null; note?: string | null; disponibilite?: string | null };
type SecteurRow   = { id: string; slug: string; nom: string; ligne: string; trajet: string; description: string; pointsAcces: string; procedures: string; pn?: string | null };
type FicheRow     = { id: string; slug: string; numero: number; titre: string; categorie: string; priorite: string; mnemonique?: string | null; resume: string; etapes: string; references?: string | null; avisObligatoires?: string | null; contactIds: string[] };
type MnomoniqueRow = { id: string; acronyme: string; titre: string; description: string; lettres: string; contexte?: string | null; couleur?: string | null };
type AbreviationRow = { id: string; sigle: string; definition: string };

// ─── Seed principal ──────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Démarrage du seed...");

  // Vider les tables dans l'ordre pour respecter les contraintes FK
  await prisma.ficheContact.deleteMany();
  await prisma.ficheActionLog.deleteMany();
  await prisma.ficheCommentLog.deleteMany();
  await prisma.ficheSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ficheSecteur.deleteMany();
  await prisma.fiche.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.secteur.deleteMany();
  await prisma.mnemonique.deleteMany();
  await prisma.abreviation.deleteMany();
  await prisma.adminUser.deleteMany();
  console.log("  ✓ Tables vidées");

  // Contacts
  const contactsData = loadJson<ContactRow[]>("contacts.json");
  for (const c of contactsData) {
    await prisma.contact.create({
      data: { id: c.id, nom: c.nom, role: c.role, categorie: c.categorie, telephone: c.telephone, telephoneAlt: c.telephoneAlt ?? null, note: c.note ?? null, disponibilite: c.disponibilite ?? null },
    });
  }
  console.log(`  ✓ ${contactsData.length} contacts insérés`);

  // Secteurs
  const secteursData = loadJson<SecteurRow[]>("secteurs.json");
  for (const s of secteursData) {
    await prisma.secteur.create({
      data: { id: s.id, slug: s.slug, nom: s.nom, ligne: s.ligne, trajet: s.trajet, description: s.description, pointsAcces: s.pointsAcces, procedures: s.procedures, pn: s.pn ?? null },
    });
  }
  console.log(`  ✓ ${secteursData.length} secteurs insérés`);

  // Fiches + relations contacts
  const fichesData = loadJson<FicheRow[]>("fiches.json");
  for (const f of fichesData) {
    await prisma.fiche.create({
      data: {
        id: f.id, slug: f.slug, numero: f.numero, titre: f.titre, categorie: f.categorie,
        priorite: f.priorite, mnemonique: f.mnemonique ?? null, resume: f.resume,
        etapes: f.etapes, references: f.references ?? null, avisObligatoires: f.avisObligatoires ?? null,
      },
    });
    for (const contactId of (f.contactIds ?? [])) {
      await prisma.ficheContact.create({ data: { ficheId: f.id, contactId } });
    }
  }
  console.log(`  ✓ ${fichesData.length} fiches insérées`);

  // Mnémoniques
  const mnemoniquesData = loadJson<MnomoniqueRow[]>("mnemoniques.json");
  for (const m of mnemoniquesData) {
    await prisma.mnemonique.create({
      data: { id: m.id, acronyme: m.acronyme, titre: m.titre, description: m.description, lettres: m.lettres, contexte: m.contexte ?? null, couleur: m.couleur ?? null },
    });
  }
  console.log(`  ✓ ${mnemoniquesData.length} mnémoniques insérés`);

  // Abréviations
  const abreviationsData = loadJson<AbreviationRow[]>("abreviations.json");
  for (const a of abreviationsData) {
    await prisma.abreviation.create({ data: { id: a.id, sigle: a.sigle, definition: a.definition } });
  }
  console.log(`  ✓ ${abreviationsData.length} abréviations insérées`);

  // Compte admin back-office (hardcodé — ne pas exporter)
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2025";
  const hash = await bcrypt.hash(adminPassword, 12);
  await prisma.adminUser.create({ data: { username: "admin", password: hash } });
  console.log("  ✓ Compte admin créé (user: admin, pass: variable ADMIN_PASSWORD ou 'admin2025')");

  // Utilisateurs front-office (hardcodés — ne pas exporter)
  const usersData = [
    { username: "admin.system", password: process.env.ADMIN_PASSWORD || "admin2025", nom: "Système", prenom: "Admin", role: "ADMIN" },
    { username: "jessie.achille", password: "astreinte2025", nom: "Achille", prenom: "Jessie", role: "USER" },
    { username: "editeur", password: "editeur2025", nom: "Éditeur", prenom: "Compte", role: "EDITOR" },
  ];
  for (const u of usersData) {
    const h = await bcrypt.hash(u.password, 12);
    await prisma.user.create({ data: { username: u.username, password: h, nom: u.nom, prenom: u.prenom, role: u.role } });
  }
  console.log(`  ✓ ${usersData.length} utilisateurs front-office créés`);
  console.log("    → admin.system / admin2025 (ADMIN)");
  console.log("    → jessie.achille / astreinte2025 (USER)");
  console.log("    → editeur / editeur2025 (EDITOR)");

  console.log("\n✅ Seed terminé avec succès !");
}

main()
  .catch((e) => { console.error("❌ Erreur seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
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

const DATA_DIR = join(__dirname, "data");

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8")) as T;
}

/** Charge un fichier de données optionnel — retourne [] si absent. */
function loadJsonOptional<T>(filename: string): T[] {
  const fullPath = join(DATA_DIR, filename);
  if (!existsSync(fullPath)) return [];
  return loadJson<T[]>(filename);
}

type ContactRow   = { id: string; nom: string; role: string; categorie: string; telephone: string; telephoneAlt?: string | null; note?: string | null; disponibilite?: string | null };
type SecteurRow   = { id: string; slug: string; nom: string; ligne: string; trajet: string; description: string; pointsAcces: string; procedures: string; pn?: string | null; liens?: string | null };
type FicheRow     = { id: string; slug: string; numero: number; titre: string; categorie: string; priorite: string; mnemonique?: string | null; resume: string; etapes: string; references?: string | null; avisObligatoires?: string | null; liens?: string | null; contactIds?: string[]; secteurIds?: string[] };
type MnomoniqueRow = { id: string; acronyme: string; titre: string; description: string; lettres: string; contexte?: string | null; couleur?: string | null };
type AbreviationRow = { id: string; sigle: string; definition: string };
type LienCategorieRow = { id: string; nom: string; icon: string; couleur: string; ordre: number };
type LienRow = { id: string; libelle: string; url: string; ordre: number; categorieId?: string | null };

// ─── Seed principal ──────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Démarrage du seed...");

  // Vider les tables dans l'ordre pour respecter les contraintes FK.
  // - FicheLien/FicheContact/FicheSecteur cascadent depuis Fiche
  // - FicheActionLog/FicheCommentLog cascadent depuis FicheSession
  // - Lien dépend de LienCategorie (catégorie SetNull, mais on vide les deux)
  await prisma.ficheActionLog.deleteMany();
  await prisma.ficheCommentLog.deleteMany();
  await prisma.ficheSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ficheLien.deleteMany();
  await prisma.ficheContact.deleteMany();
  await prisma.ficheSecteur.deleteMany();
  await prisma.fiche.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.secteur.deleteMany();
  await prisma.mnemonique.deleteMany();
  await prisma.abreviation.deleteMany();
  await prisma.lien.deleteMany();
  await prisma.lienCategorie.deleteMany();
  console.log("  ✓ Tables vidées");

  // Contacts
  const contactsData = loadJson<ContactRow[]>("contacts.json");
  for (const c of contactsData) {
    await prisma.contact.create({
      data: {
        id: c.id, nom: c.nom, role: c.role, categorie: c.categorie,
        telephone: c.telephone, telephoneAlt: c.telephoneAlt ?? null,
        note: c.note ?? null, disponibilite: c.disponibilite ?? null,
      },
    });
  }
  console.log(`  ✓ ${contactsData.length} contacts insérés`);

  // Secteurs — colonne `liens` optionnelle (rétro-compat avec anciens dumps)
  const secteursData = loadJson<SecteurRow[]>("secteurs.json");
  for (const s of secteursData) {
    await prisma.secteur.create({
      data: {
        id: s.id, slug: s.slug, nom: s.nom, ligne: s.ligne, trajet: s.trajet,
        description: s.description, pointsAcces: s.pointsAcces, procedures: s.procedures,
        pn: s.pn ?? null,
        liens: s.liens ?? null,
      },
    });
  }
  console.log(`  ✓ ${secteursData.length} secteurs insérés`);

  // Thématiques de liens utiles (AVANT les liens, car Lien.categorieId pointe ici)
  const lienCategoriesData = loadJsonOptional<LienCategorieRow>("lien-categories.json");
  for (const lc of lienCategoriesData) {
    await prisma.lienCategorie.create({
      data: { id: lc.id, nom: lc.nom, icon: lc.icon, couleur: lc.couleur, ordre: lc.ordre },
    });
  }
  if (lienCategoriesData.length > 0) console.log(`  ✓ ${lienCategoriesData.length} thématiques de liens insérées`);

  // Collection de liens utiles
  const liensData = loadJsonOptional<LienRow>("liens.json");
  for (const l of liensData) {
    await prisma.lien.create({
      data: { id: l.id, libelle: l.libelle, url: l.url, ordre: l.ordre, categorieId: l.categorieId ?? null },
    });
  }
  if (liensData.length > 0) console.log(`  ✓ ${liensData.length} liens utiles insérés`);

  // Fiches + relations contacts/secteurs + colonne `liens`
  const fichesData = loadJson<FicheRow[]>("fiches.json");
  for (const f of fichesData) {
    await prisma.fiche.create({
      data: {
        id: f.id, slug: f.slug, numero: f.numero, titre: f.titre, categorie: f.categorie,
        priorite: f.priorite, mnemonique: f.mnemonique ?? null, resume: f.resume,
        etapes: f.etapes,
        references: f.references ?? null,
        avisObligatoires: f.avisObligatoires ?? null,
        liens: f.liens ?? null,
      },
    });
    for (const contactId of (f.contactIds ?? [])) {
      await prisma.ficheContact.create({ data: { ficheId: f.id, contactId } });
    }
    for (const secteurId of (f.secteurIds ?? [])) {
      await prisma.ficheSecteur.create({ data: { ficheId: f.id, secteurId } });
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

  // Utilisateurs (front-office et back-office unifiés)
  const adminPassword   = process.env.SEED_ADMIN_PASSWORD;
  const userPassword    = process.env.SEED_USER_PASSWORD;
  const editorPassword  = process.env.SEED_EDITOR_PASSWORD;
  if (!adminPassword || !userPassword || !editorPassword) {
    throw new Error(
      "Variables manquantes : SEED_ADMIN_PASSWORD, SEED_USER_PASSWORD et SEED_EDITOR_PASSWORD doivent être définies dans .env"
    );
  }
  const usersData = [
    { username: "admin.system",   email: "admin@astreinte.local",    password: adminPassword,  nom: "Système", prenom: "Admin",  role: "ADMIN"  },
    { username: "jessie.achille", email: "jessie.achille@astreinte.local", password: userPassword,   nom: "Achille", prenom: "Jessie", role: "USER"   },
    { username: "editeur",        email: "editeur@astreinte.local",  password: editorPassword, nom: "Éditeur", prenom: "Compte", role: "EDITOR" },
  ];
  for (const u of usersData) {
    const h = await bcrypt.hash(u.password, 12);
    await prisma.user.create({ data: { username: u.username, email: u.email, password: h, nom: u.nom, prenom: u.prenom, role: u.role } });
  }
  console.log(`  ✓ ${usersData.length} utilisateurs front-office créés`);
  console.log("    → admin.system (ADMIN)");
  console.log("    → jessie.achille (USER)");
  console.log("    → editeur (EDITOR)");

  console.log("\n✅ Seed terminé avec succès !");
}

main()
  .catch((e) => { console.error("❌ Erreur seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

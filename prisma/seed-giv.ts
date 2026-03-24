/**
 * Injection des données spécifiques au poste Givors Ville (GIV).
 * Utilise upsert (id unique) → idempotent, ne touche pas aux données existantes.
 * Usage : npm run db:seed-giv
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

type ContactRow = {
  id: string; nom: string; role: string; categorie: string;
  telephone: string; telephoneAlt?: string | null;
  note?: string | null; disponibilite?: string | null;
};

// IDs des contacts spécifiques à injecter pour GIV
const GIV_CONTACT_IDS = [
  // GIV
  "poste-giv", "dpx-giv", "adpx-giv", "cps-giv", "supervision-giv",
  // PAN P2
  "poste-pan", "cps-pan", "giv-portable",
  // SE P2
  "poste-se2", "poste-se1", "cps-se2",
];

async function main() {
  console.log("🌱 Injection données GIV...");

  // Contacts
  const allContacts: ContactRow[] = JSON.parse(
    readFileSync(join(__dirname, "data", "contacts.json"), "utf-8")
  );
  const givContacts = allContacts.filter(c => GIV_CONTACT_IDS.includes(c.id));

  for (const c of givContacts) {
    await prisma.contact.upsert({
      where: { id: c.id },
      update: {
        nom: c.nom, role: c.role, categorie: c.categorie,
        telephone: c.telephone, telephoneAlt: c.telephoneAlt ?? null,
        note: c.note ?? null, disponibilite: c.disponibilite ?? null,
      },
      create: {
        id: c.id, nom: c.nom, role: c.role, categorie: c.categorie,
        telephone: c.telephone, telephoneAlt: c.telephoneAlt ?? null,
        note: c.note ?? null, disponibilite: c.disponibilite ?? null,
      },
    });
    console.log(`  ✓ Contact : ${c.nom}`);
  }

  console.log(`\n✅ Injection GIV terminée — ${givContacts.length} contacts insérés/mis à jour`);
  console.log("   → Lancez ensuite : npm run db:seed-postes  (pour le poste Givors Ville)");
}

main()
  .catch((e) => { console.error("❌ Erreur:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

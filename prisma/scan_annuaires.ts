import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const postes = await prisma.poste.findMany({ select: { slug: true, annuaire: true } });
  let issues = 0;
  for (const p of postes) {
    let sections: any[];
    try { sections = JSON.parse(p.annuaire); } catch { console.log(`PARSE ERROR: ${p.slug}`); continue; }
    for (const s of sections) {
      for (const c of (s.contacts ?? [])) {
        if (c.telephone === undefined || c.telephone === null || c.telephone === "") {
          console.log(`MISSING TEL → poste: ${p.slug} | section: ${s.titre} | contact: ${c.nom}`);
          console.log("  full entry:", JSON.stringify(c));
          issues++;
        }
      }
    }
  }
  if (issues === 0) console.log("✅ Tous les contacts ont un champ telephone non vide.");
  else console.log(`\n⚠️  ${issues} contact(s) sans telephone trouvé(s).`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

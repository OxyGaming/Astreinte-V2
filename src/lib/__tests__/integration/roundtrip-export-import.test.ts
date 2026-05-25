/**
 * Test d'intégration — roundtrip export → réimport sur une vraie SQLite.
 *
 * Objectif : démontrer qu'un export programmatique suivi d'un réimport
 * conserve fidèlement toutes les données enrichies, en particulier :
 *   - Postes.liens
 *   - Secteurs.liens
 *   - Fiches.liens
 *   - Procedures.etapes[].liens
 *   - Lien (collection centrale) + LienCategorie (thématiques)
 *
 * Stratégie : on monte une DB SQLite temporaire (fichier sous os.tmpdir),
 * on rejoue toutes les migrations Prisma pour avoir le vrai schéma, puis
 * on insère un dataset fixture, on exporte (via les helpers de production),
 * on vide les tables, on réimporte, et on compare structurellement.
 *
 * Test à éviter dans le run "rapide" — utilise un disque, rejoue toutes
 * les migrations, et tourne en ~1-2s.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  serializeLiensForExport,
  parseLiensImportField,
  normalizeLiensPayloadSync,
} from "@/lib/liens-server";

// ─── Setup global ────────────────────────────────────────────────────────────

let tmpDir: string;
let dbPath: string;
let prisma: PrismaClient;

/**
 * Crée le schéma de la DB de test en rejouant toutes les migrations Prisma
 * dans l'ordre. On utilise better-sqlite3 direct (sans Prisma) pour appliquer
 * le SQL — c'est plus rapide et évite de dépendre de la CLI Prisma.
 */
function applyAllMigrations(dbFile: string) {
  const migrationsDir = join(process.cwd(), "prisma", "migrations");
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const db = new Database(dbFile);
  db.pragma("foreign_keys = OFF");
  for (const folder of folders) {
    const sqlPath = join(migrationsDir, folder, "migration.sql");
    const sql = readFileSync(sqlPath, "utf-8");
    db.exec(sql);
  }
  db.pragma("foreign_keys = ON");
  db.close();
}

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "astreinte-roundtrip-"));
  dbPath = join(tmpDir, "test.db");
  applyAllMigrations(dbPath);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  prisma = new PrismaClient({ adapter });
}, 30_000);

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
});

// On purge les tables touchées entre chaque test pour partir d'un état propre.
// Ordre : enfants avant parents pour respecter les FK.
beforeEach(async () => {
  await prisma.posteProcedure.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.ficheSecteur.deleteMany();
  await prisma.ficheContact.deleteMany();
  await prisma.ficheLien.deleteMany();
  await prisma.fiche.deleteMany();
  await prisma.posteSecteur.deleteMany();
  await prisma.poste.deleteMany();
  await prisma.secteur.deleteMany();
  await prisma.lien.deleteMany();
  await prisma.lienCategorie.deleteMany();
});

// ─── Fixture représentative ──────────────────────────────────────────────────

async function seedFixture() {
  // Thématique + 2 liens de collection
  const cat = await prisma.lienCategorie.create({
    data: { nom: "Réglementation", icon: "BookOpen", couleur: "blue", ordre: 0 },
  });
  const lienA = await prisma.lien.create({
    data: { libelle: "Réf. IN 1500", url: "https://intranet.sncf/in-1500", categorieId: cat.id, ordre: 0 },
  });
  const lienB = await prisma.lien.create({
    data: { libelle: "Procédure dégradée", url: "https://intranet.sncf/degr", categorieId: cat.id, ordre: 1 },
  });

  // Secteur avec un lien libre + un lien de collection
  const secteur = await prisma.secteur.create({
    data: {
      slug: "givors-canal",
      nom: "Secteur Givors Canal",
      ligne: "750000",
      trajet: "Givors - Chasse-sur-Rhône",
      description: "Secteur de la vallée du Gier",
      pointsAcces: "[]",
      procedures: "[]",
      liens: JSON.stringify([
        { lienId: lienA.id },
        { libelle: "Carte locale", url: "https://maps.local/givors" },
      ]),
    },
  });

  // Poste avec liens mixés
  const poste = await prisma.poste.create({
    data: {
      slug: "givors-canal-pg",
      nom: "Poste de Givors Canal",
      typePoste: "PRG",
      lignes: JSON.stringify(["750000"]),
      adresse: "Rue de la gare",
      horaires: "24/7",
      electrification: "25 kV 50 Hz",
      systemeBlock: "BAL",
      annuaire: "[]",
      circuitsVoie: "[]",
      pnSensibles: "[]",
      particularites: "[]",
      proceduresCles: "[]",
      liens: JSON.stringify([{ lienId: lienB.id, libelle: "Surcharge poste" }]),
    },
  });

  // Fiche avec liens + relations contact/secteur
  const fiche = await prisma.fiche.create({
    data: {
      slug: "rupture-canalisation",
      numero: 42,
      titre: "Rupture de canalisation",
      categorie: "incident",
      priorite: "haute",
      mnemonique: "CAMMI",
      resume: "Cas de rupture d'une canalisation",
      etapes: JSON.stringify([
        { ordre: 1, titre: "Sécuriser", description: "...", critique: true, actions: ["alerter", "isoler"] },
      ]),
      references: "[]",
      avisObligatoires: "[]",
      liens: JSON.stringify([{ lienId: lienA.id }, { lienId: lienB.id }]),
    },
  });
  await prisma.ficheSecteur.create({ data: { ficheId: fiche.id, secteurId: secteur.id } });

  // Procédure avec étapes contenant des liens
  const proc = await prisma.procedure.create({
    data: {
      slug: "cessation-service",
      titre: "Cessation de service — Givors Canal",
      typeProcedure: "cessation",
      description: "Procédure standard",
      version: "1.0",
      etapes: JSON.stringify([
        {
          id: "etape-1",
          ordre: 1,
          titre: "Vérifier annonces",
          actions: [
            { id: "a1", label: "Annonces faites", type: "confirmation", obligatoire: true, verifiable: true, niveau: "informatif" },
          ],
          liens: [{ lienId: lienA.id }],
        },
        {
          id: "etape-2",
          ordre: 2,
          titre: "Couper trains",
          actions: [
            { id: "a2", label: "Voie libre", type: "confirmation", obligatoire: true, verifiable: true, niveau: "informatif" },
          ],
          liens: [{ libelle: "Schéma local", url: "https://intranet.sncf/schema" }],
        },
      ]),
    },
  });
  await prisma.posteProcedure.create({ data: { posteId: poste.id, procedureId: proc.id, ordre: 0 } });

  return { cat, lienA, lienB, secteur, poste, fiche, proc };
}

// ─── Helpers d'export/import (simulent ce que font les routes) ───────────────

/**
 * Sérialise une ligne Poste pour l'export Excel — reproduit la logique de
 * `src/app/api/admin/export/donnees/route.ts`.
 */
function exportPosteRow(p: { slug: string; liens: string | null }) {
  return { slug: p.slug, liens_json: serializeLiensForExport(p.liens) };
}

/**
 * Reproduit la logique d'import : parse `liens_json` contre la collection
 * connue, applique la règle no-overwrite (fallback existing si absent).
 */
function reimportLiens(
  row: { liens_json?: string | undefined },
  existing: string | null,
  knownLienIds: Set<string>,
): { value: string | null; error?: string } {
  const parsed = parseLiensImportField(row.liens_json, knownLienIds);
  if (parsed.error) return { value: existing, error: parsed.error };
  return { value: parsed.value ?? existing };
}

/** Compare deux chaînes JSON après parsing — robuste à l'ordre des clés. */
function expectJsonEqual(actual: string | null, expected: string | null) {
  if (actual === null || expected === null) {
    expect(actual).toBe(expected);
    return;
  }
  expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Roundtrip export → import : conservation fidèle de toutes les entités", () => {
  it("Poste.liens : conservation d'un lienId avec surcharge de libellé", async () => {
    const { poste } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });

    // Export
    const row = exportPosteRow(before);

    // On efface la valeur en base pour simuler "on est parti d'une DB vide
    // et on réimporte tout"
    await prisma.poste.update({ where: { id: poste.id }, data: { liens: null } });

    // Réimport
    const reimported = reimportLiens(row, null, knownIds);
    await prisma.poste.update({ where: { id: poste.id }, data: { liens: reimported.value } });

    const after = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });

    expect(reimported.error).toBeUndefined();
    expectJsonEqual(after.liens, before.liens);
  });

  it("Secteur.liens : mélange collection + lien libre conservé", async () => {
    const { secteur } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.secteur.findUniqueOrThrow({ where: { id: secteur.id } });

    const exported = serializeLiensForExport(before.liens);
    await prisma.secteur.update({ where: { id: secteur.id }, data: { liens: null } });
    const reimported = parseLiensImportField(exported, knownIds);
    await prisma.secteur.update({ where: { id: secteur.id }, data: { liens: reimported.value } });

    const after = await prisma.secteur.findUniqueOrThrow({ where: { id: secteur.id } });
    expectJsonEqual(after.liens, before.liens);
  });

  it("Fiche.liens : plusieurs lienIds conservés", async () => {
    const { fiche } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.fiche.findUniqueOrThrow({ where: { id: fiche.id } });

    const exported = serializeLiensForExport(before.liens);
    await prisma.fiche.update({ where: { id: fiche.id }, data: { liens: null } });
    const reimported = parseLiensImportField(exported, knownIds);
    await prisma.fiche.update({ where: { id: fiche.id }, data: { liens: reimported.value } });

    const after = await prisma.fiche.findUniqueOrThrow({ where: { id: fiche.id } });
    expectJsonEqual(after.liens, before.liens);
  });

  it("Procedure.etapes : les etapes[].liens survivent à un roundtrip JSON", async () => {
    const { proc } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.procedure.findUniqueOrThrow({ where: { id: proc.id } });

    // Pour les procédures, le champ exporté est `etapes_json` (le JSON entier
    // des étapes — chacune avec son éventuel tableau `liens`). Pas de
    // serializeLiensForExport ici : on prend la chaîne brute.
    const etapesJsonExported = before.etapes;

    // Côté import : on valide la structure (validation déjà couverte par les
    // tests unitaires) et on persiste. On simule en parsant + re-sérialisant
    // chaque etapes[].liens via normalizeLiensPayloadSync.
    const etapes = JSON.parse(etapesJsonExported) as Array<Record<string, unknown>>;
    const normalized = etapes.map((e) => {
      if (Array.isArray(e.liens)) {
        const result = normalizeLiensPayloadSync(e.liens, knownIds);
        if (!result.ok) throw new Error(`Lien invalide étape ${e.id}: ${result.error}`);
        return { ...e, liens: JSON.parse(result.json) };
      }
      return e;
    });

    await prisma.procedure.update({ where: { id: proc.id }, data: { etapes: "[]" } });
    await prisma.procedure.update({ where: { id: proc.id }, data: { etapes: JSON.stringify(normalized) } });

    const after = await prisma.procedure.findUniqueOrThrow({ where: { id: proc.id } });
    const beforeEtapes = JSON.parse(before.etapes);
    const afterEtapes = JSON.parse(after.etapes);
    expect(afterEtapes).toEqual(beforeEtapes);

    // Vérification spécifique : les liens sont bien conservés étape par étape
    expect(afterEtapes[0].liens).toEqual([{ lienId: (await prisma.lien.findFirst({ where: { libelle: "Réf. IN 1500" } }))!.id }]);
    expect(afterEtapes[1].liens).toEqual([{ libelle: "Schéma local", url: "https://intranet.sncf/schema" }]);
  });

  it("Lien + LienCategorie : roundtrip complet de la collection", async () => {
    await seedFixture();

    const cats = await prisma.lienCategorie.findMany({ orderBy: { ordre: "asc" } });
    const liens = await prisma.lien.findMany({ orderBy: [{ categorieId: "asc" }, { ordre: "asc" }] });

    // Snapshot avant
    const before = {
      cats: cats.map(({ id, nom, icon, couleur, ordre }) => ({ id, nom, icon, couleur, ordre })),
      liens: liens.map(({ id, libelle, url, ordre, categorieId }) => ({ id, libelle, url, ordre, categorieId })),
    };

    // Vide tout
    await prisma.lien.deleteMany();
    await prisma.lienCategorie.deleteMany();

    // Réimport : catégories d'abord, puis liens (respect des FK)
    for (const c of before.cats) {
      await prisma.lienCategorie.create({ data: c });
    }
    for (const l of before.liens) {
      await prisma.lien.create({ data: l });
    }

    // Snapshot après
    const afterCats = await prisma.lienCategorie.findMany({ orderBy: { ordre: "asc" } });
    const afterLiens = await prisma.lien.findMany({ orderBy: [{ categorieId: "asc" }, { ordre: "asc" }] });

    expect(afterCats.map(({ id, nom, icon, couleur, ordre }) => ({ id, nom, icon, couleur, ordre })))
      .toEqual(before.cats);
    expect(afterLiens.map(({ id, libelle, url, ordre, categorieId }) => ({ id, libelle, url, ordre, categorieId })))
      .toEqual(before.liens);
  });
});

describe("Roundtrip — non-régression no-overwrite", () => {
  it("Colonne liens_json absente du fichier ⇒ la valeur en base n'est PAS écrasée", async () => {
    const { poste } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });

    // Cas réel : l'utilisateur édite le fichier Excel et supprime la colonne
    // liens_json. Le serveur reçoit un payload sans cette clé.
    const rowSansColonne = { slug: poste.slug } as { slug: string; liens_json?: string };
    const reimported = reimportLiens(rowSansColonne, before.liens, knownIds);
    await prisma.poste.update({ where: { id: poste.id }, data: { liens: reimported.value } });

    const after = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });
    expectJsonEqual(after.liens, before.liens);
  });

  it("Cellule liens_json vide ⇒ valeur en base conservée (même contrat)", async () => {
    const { fiche } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.fiche.findUniqueOrThrow({ where: { id: fiche.id } });

    const reimported = reimportLiens({ liens_json: "" }, before.liens, knownIds);
    await prisma.fiche.update({ where: { id: fiche.id }, data: { liens: reimported.value } });

    const after = await prisma.fiche.findUniqueOrThrow({ where: { id: fiche.id } });
    expectJsonEqual(after.liens, before.liens);
  });

  it("Cellule liens_json = \"[]\" ⇒ effacement explicite (différenciation intentionnelle)", async () => {
    const { secteur } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const before = await prisma.secteur.findUniqueOrThrow({ where: { id: secteur.id } });

    expect(before.liens).not.toBeNull(); // pré-condition

    const reimported = reimportLiens({ liens_json: "[]" }, before.liens, knownIds);
    await prisma.secteur.update({ where: { id: secteur.id }, data: { liens: reimported.value } });

    const after = await prisma.secteur.findUniqueOrThrow({ where: { id: secteur.id } });
    expect(after.liens).toBe("[]"); // effacé, pas conservé
  });
});

describe("Roundtrip — stabilité du format", () => {
  it("Un double roundtrip produit exactement la même valeur (idempotence)", async () => {
    const { poste } = await seedFixture();
    const knownIds = new Set((await prisma.lien.findMany({ select: { id: true } })).map((l) => l.id));
    const initial = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });

    // Premier roundtrip
    const exp1 = serializeLiensForExport(initial.liens);
    const reimp1 = parseLiensImportField(exp1, knownIds);
    await prisma.poste.update({ where: { id: poste.id }, data: { liens: reimp1.value } });
    const afterFirst = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });

    // Second roundtrip
    const exp2 = serializeLiensForExport(afterFirst.liens);
    const reimp2 = parseLiensImportField(exp2, knownIds);
    await prisma.poste.update({ where: { id: poste.id }, data: { liens: reimp2.value } });
    const afterSecond = await prisma.poste.findUniqueOrThrow({ where: { id: poste.id } });

    // Les deux exports doivent être strictement égaux (pas de drift)
    expect(exp1).toBe(exp2);
    expectJsonEqual(afterSecond.liens, afterFirst.liens);
    expectJsonEqual(afterSecond.liens, initial.liens);
  });
});

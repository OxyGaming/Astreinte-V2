/**
 * Seed d'un modèle de tournée de DÉMONSTRATION — données entièrement fictives
 * (lieux, coordonnées, contacts). Sert à tester le module Tournée terrain.
 * Idempotent : remplace le modèle de démonstration s'il existe déjà.
 * Usage : npm run db:seed-tournee-demo
 */
import "dotenv/config";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const TITRE = "Tournée de démonstration — Vallée fictive";

const bloc = (type: string, titre: string, texte: string, lieu?: { libelle: string; latitude: number; longitude: number }) => ({
  id: Math.random().toString(36).slice(2, 10),
  type,
  titre,
  texte,
  lieu: lieu ?? null,
});

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", actif: true }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("Aucun administrateur actif");

  await prisma.tourneeModele.deleteMany({ where: { titre: TITRE } });

  const etapes = [
    { type: "DEPART", titre: "Départ de la base", dureeMin: 0, trajetSuivanteMin: 15, latitude: 45.5001, longitude: 4.8001 },
    {
      type: "POINT", titre: "Poste Alpha", description: "Point B", dureeMin: 30, trajetSuivanteMin: 10, latitude: 45.5102, longitude: 4.8203,
      contenu: [
        bloc("SECTION", "Points d'attention", "- Plusieurs contrôles hors service.\n- Aiguilles talonnables en cas de sortie."),
        bloc("SECTION", "Point B", "Situé dans une guérite fermée, le Point B comprend :\n- une liaison téléphonique avec l'AC ;\n- un commutateur « Cv1 » : voyant **rouge** = fermé.", { libelle: "Point B", latitude: 45.5106, longitude: 4.8208 }),
      ],
    },
    { type: "POINT", titre: "Accès viaduc côté Nord", dureeMin: 10, trajetSuivanteMin: 10, latitude: 45.5203, longitude: 4.8301 },
    { type: "POINT", titre: "Bifurcation Bêta P1", dureeMin: 20, trajetSuivanteMin: 5, latitude: 45.5304, longitude: 4.8402 },
    { type: "POINT", titre: "Bifurcation Bêta P2", optionnelle: true, dureeMin: 10, surcoutTrajetMin: 8, latitude: 45.5355, longitude: 4.8455 },
    {
      type: "POINT", titre: "Point A de Gamma", dureeMin: 30, trajetSuivanteMin: 20, latitude: 45.5406, longitude: 4.8503,
      contenu: [
        bloc("SECTION", "Opérations possibles", "- Desserte de la voie 4 — **fiche opérationnelle n°1**\n- Tête-à-queue voie A — **fiche opérationnelle n°2**"),
        bloc("ATTENTION", "Attention", "Si l'engin est manœuvré au-delà du Cv16, il se retrouvera bloqué."),
      ],
    },
    { type: "POINT", titre: "Tunnel Delta côté Sud", optionnelle: true, dureeMin: 10, surcoutTrajetMin: 10, latitude: 45.5507, longitude: 4.8604 },
    { type: "PAUSE", titre: "Pause déjeuner", heureImposee: "12:00", dureeMin: 60, trajetSuivanteMin: 15, latitude: 45.5608, longitude: 4.8705 },
    {
      type: "EXERCICE", titre: "Exercice PN fictif", dureeMin: 30, trajetSuivanteMin: 15, latitude: 45.5709, longitude: 4.8806, localisationMasquee: true,
      contenu: [bloc("EXERCICE", "Exercice", "La localisation du PN n'est volontairement pas communiquée : les participants doivent le trouver avec l'appli Astreinte.")],
    },
    { type: "RESTITUTION", titre: "Restitution", heureImposee: "14:30", dureeMin: 0, latitude: 45.5001, longitude: 4.8001 },
  ];

  const modele = await prisma.tourneeModele.create({
    data: {
      titre: TITRE,
      sousTitre: "Secteur de démonstration",
      objectif: "Découvrir les points d'intervention du secteur et leurs particularités.",
      heureDepart: "08:45",
      statut: "PUBLIE",
      mentionDiffusion: "Document de démonstration — données fictives",
      createdById: admin.id,
      aPropos: JSON.stringify([
        { id: "a1", titre: "Contexte", texte: "Tournée de découverte destinée aux agents d'astreinte nouvellement arrivés." },
        { id: "a2", titre: "Matériel", texte: "- Gilet haute visibilité\n- Clés de guérite\n- Téléphone chargé" },
      ]),
      contacts: JSON.stringify([
        { id: "c1", fonction: "Responsable de la tournée", nom: "Alex RESPONSABLE", telephone: "06 00 00 00 01" },
        { id: "c2", fonction: "Gardien du temps", nom: "Camille HORAIRE", telephone: "06 00 00 00 02" },
        { id: "c3", fonction: "Agent circulation Poste Alpha", nom: "Dominique ALPHA", telephone: "04 00 00 00 03" },
      ]),
      etapes: {
        create: etapes.map((e, i) => ({
          ordre: i,
          type: e.type,
          titre: e.titre,
          description: e.description ?? null,
          optionnelle: e.optionnelle ?? false,
          heureImposee: e.heureImposee ?? null,
          dureeMin: e.dureeMin,
          trajetSuivanteMin: e.trajetSuivanteMin ?? 0,
          surcoutTrajetMin: e.surcoutTrajetMin ?? null,
          latitude: e.latitude,
          longitude: e.longitude,
          localisationMasquee: e.localisationMasquee ?? false,
          contenu: JSON.stringify(e.contenu ?? []),
          liens: JSON.stringify([{ libelle: "Référentiel fictif", url: "https://example.org/referentiel" }].slice(0, e.contenu ? 1 : 0)),
        })),
      },
    },
  });
  console.log(`✅ Modèle de démonstration créé : ${modele.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

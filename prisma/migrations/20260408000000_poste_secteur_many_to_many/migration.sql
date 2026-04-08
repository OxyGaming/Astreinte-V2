-- Disable FK checks for table recreation (SQLite requirement)
PRAGMA foreign_keys = OFF;

-- CreateTable PosteSecteur (many-to-many Poste ↔ Secteur)
CREATE TABLE "PosteSecteur" (
    "posteId" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    PRIMARY KEY ("posteId", "secteurId"),
    CONSTRAINT "PosteSecteur_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PosteSecteur_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- MigrateData: copy existing one-to-one relations into the join table
INSERT INTO "PosteSecteur" ("posteId", "secteurId")
SELECT "id", "secteurId" FROM "Poste" WHERE "secteurId" IS NOT NULL;

-- AlterTable Poste: drop secteurId column (SQLite requires table recreation)
CREATE TABLE "new_Poste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typePoste" TEXT NOT NULL,
    "lignes" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "horaires" TEXT NOT NULL,
    "electrification" TEXT NOT NULL,
    "systemeBlock" TEXT NOT NULL,
    "annuaire" TEXT NOT NULL,
    "circuitsVoie" TEXT NOT NULL,
    "pnSensibles" TEXT NOT NULL,
    "particularites" TEXT NOT NULL,
    "proceduresCles" TEXT NOT NULL,
    "dbc" TEXT,
    "rex" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Poste" ("id", "slug", "nom", "typePoste", "lignes", "adresse", "horaires", "electrification", "systemeBlock", "annuaire", "circuitsVoie", "pnSensibles", "particularites", "proceduresCles", "dbc", "rex", "createdAt", "updatedAt")
SELECT "id", "slug", "nom", "typePoste", "lignes", "adresse", "horaires", "electrification", "systemeBlock", "annuaire", "circuitsVoie", "pnSensibles", "particularites", "proceduresCles", "dbc", "rex", "createdAt", "updatedAt"
FROM "Poste";

DROP TABLE "Poste";
ALTER TABLE "new_Poste" RENAME TO "Poste";

-- RecreateIndex
CREATE UNIQUE INDEX "Poste_slug_key" ON "Poste"("slug");

-- Re-enable FK checks
PRAGMA foreign_keys = ON;

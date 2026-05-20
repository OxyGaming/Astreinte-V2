-- AlterTable
ALTER TABLE "Fiche" ADD COLUMN "liens" TEXT;

-- AlterTable
ALTER TABLE "Poste" ADD COLUMN "liens" TEXT;

-- AlterTable
ALTER TABLE "Secteur" ADD COLUMN "liens" TEXT;

-- CreateTable
CREATE TABLE "Lien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "telephoneAlt" TEXT,
    "note" TEXT,
    "disponibilite" TEXT,
    "secteurId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("categorie", "createdAt", "disponibilite", "id", "nom", "note", "role", "secteurId", "telephone", "telephoneAlt", "updatedAt") SELECT "categorie", "createdAt", "disponibilite", "id", "nom", "note", "role", "secteurId", "telephone", "telephoneAlt", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

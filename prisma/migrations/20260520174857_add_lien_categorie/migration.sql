-- CreateTable
CREATE TABLE "LienCategorie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Link2',
    "couleur" TEXT NOT NULL DEFAULT 'blue',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "categorieId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lien_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "LienCategorie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lien" ("createdAt", "id", "libelle", "ordre", "updatedAt", "url") SELECT "createdAt", "id", "libelle", "ordre", "updatedAt", "url" FROM "Lien";
DROP TABLE "Lien";
ALTER TABLE "new_Lien" RENAME TO "Lien";
CREATE INDEX "Lien_categorieId_idx" ON "Lien"("categorieId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

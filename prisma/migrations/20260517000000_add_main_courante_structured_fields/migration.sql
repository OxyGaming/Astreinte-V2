-- Add structured fields (nature, libelle, solution, avis*) and make titre nullable
-- SQLite can't alter columns to make NOT NULL → NULL, so we recreate the table.

PRAGMA foreign_keys=OFF;

-- New table with updated schema
CREATE TABLE "new_MainCourante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT,
    "nature" TEXT,
    "libelle" TEXT,
    "description" TEXT NOT NULL,
    "solution" TEXT,
    "avisSecurite" TEXT,
    "avisProduction" TEXT,
    "ficheSlug" TEXT,
    "auteurId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "editedDescription" TEXT,
    "rejetMotif" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "validatedAt" DATETIME,
    "validatedByUserId" TEXT,
    CONSTRAINT "MainCourante_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MainCourante_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy existing rows (new fields stay NULL by default).
INSERT INTO "new_MainCourante" (
    "id", "titre", "description", "ficheSlug", "auteurId", "status",
    "editedDescription", "rejetMotif", "createdAt", "updatedAt", "validatedAt", "validatedByUserId"
)
SELECT
    "id", "titre", "description", "ficheSlug", "auteurId", "status",
    "editedDescription", "rejetMotif", "createdAt", "updatedAt", "validatedAt", "validatedByUserId"
FROM "MainCourante";

DROP TABLE "MainCourante";
ALTER TABLE "new_MainCourante" RENAME TO "MainCourante";

CREATE INDEX "MainCourante_status_idx" ON "MainCourante"("status");
CREATE INDEX "MainCourante_auteurId_idx" ON "MainCourante"("auteurId");
CREATE INDEX "MainCourante_createdAt_idx" ON "MainCourante"("createdAt");
CREATE INDEX "MainCourante_nature_idx" ON "MainCourante"("nature");

PRAGMA foreign_keys=ON;

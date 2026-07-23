-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CilIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reference" TEXT,
    "type" TEXT NOT NULL,
    "typeLibre" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "lieu" TEXT NOT NULL,
    "poste" TEXT,
    "voie" TEXT,
    "observations" TEXT,
    "gareMode" TEXT,
    "gareUnique" TEXT,
    "gareA" TEXT,
    "gareB" TEXT,
    "voies" TEXT,
    "km" TEXT,
    "acLabel" TEXT,
    "motif" TEXT,
    "cilNom" TEXT,
    "cilPrenom" TEXT,
    "cilEtablissement" TEXT,
    "designatedAt" DATETIME,
    "arrivedOnSiteAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "CilIncident_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CilIncident_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FicheSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CilIncident" ("acLabel", "arrivedOnSiteAt", "authorId", "cilEtablissement", "cilNom", "cilPrenom", "closedAt", "createdAt", "designatedAt", "gareA", "gareB", "gareMode", "gareUnique", "id", "km", "lieu", "motif", "observations", "occurredAt", "poste", "reference", "status", "teamId", "type", "typeLibre", "updatedAt", "voie", "voies") SELECT "acLabel", "arrivedOnSiteAt", "authorId", "cilEtablissement", "cilNom", "cilPrenom", "closedAt", "createdAt", "designatedAt", "gareA", "gareB", "gareMode", "gareUnique", "id", "km", "lieu", "motif", "observations", "occurredAt", "poste", "reference", "status", "teamId", "type", "typeLibre", "updatedAt", "voie", "voies" FROM "CilIncident";
DROP TABLE "CilIncident";
ALTER TABLE "new_CilIncident" RENAME TO "CilIncident";
CREATE INDEX "CilIncident_teamId_status_idx" ON "CilIncident"("teamId", "status");
CREATE INDEX "CilIncident_authorId_idx" ON "CilIncident"("authorId");
CREATE INDEX "CilIncident_sessionId_idx" ON "CilIncident"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

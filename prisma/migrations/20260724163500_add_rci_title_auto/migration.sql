-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Rci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dossierNumber" TEXT,
    "eventAt" DATETIME,
    "title" TEXT,
    "titleAuto" BOOLEAN NOT NULL DEFAULT false,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "cilIncidentId" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rci_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rci_cilIncidentId_fkey" FOREIGN KEY ("cilIncidentId") REFERENCES "CilIncident" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rci_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FicheSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rci" ("authorId", "cilIncidentId", "createdAt", "dossierNumber", "eventAt", "id", "payload", "sessionId", "status", "teamId", "title", "updatedAt") SELECT "authorId", "cilIncidentId", "createdAt", "dossierNumber", "eventAt", "id", "payload", "sessionId", "status", "teamId", "title", "updatedAt" FROM "Rci";
DROP TABLE "Rci";
ALTER TABLE "new_Rci" RENAME TO "Rci";
CREATE INDEX "Rci_teamId_status_idx" ON "Rci"("teamId", "status");
CREATE INDEX "Rci_authorId_idx" ON "Rci"("authorId");
CREATE INDEX "Rci_updatedAt_idx" ON "Rci"("updatedAt");
CREATE INDEX "Rci_cilIncidentId_idx" ON "Rci"("cilIncidentId");
CREATE INDEX "Rci_sessionId_idx" ON "Rci"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

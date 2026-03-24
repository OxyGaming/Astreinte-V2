-- CreateTable
CREATE TABLE "SessionProcedureEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "etapeId" TEXT,
    "actionId" TEXT,
    "valeur" TEXT,
    "payload" TEXT NOT NULL,
    "actorNom" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionProcedureEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionProcedure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionProcedureEventArchive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "etapeId" TEXT,
    "actionId" TEXT,
    "valeur" TEXT,
    "payload" TEXT NOT NULL,
    "actorNom" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SessionProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procedureId" TEXT NOT NULL,
    "procedureVersion" TEXT NOT NULL,
    "procedureSnapshot" TEXT NOT NULL,
    "posteId" TEXT NOT NULL,
    "posteSlug" TEXT NOT NULL,
    "agentNom" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "etapeIndex" INTEGER NOT NULL DEFAULT 0,
    "etat" TEXT NOT NULL DEFAULT '{"etapes":{}}',
    "synthese" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "eventsArchived" BOOLEAN NOT NULL DEFAULT false,
    "eventsArchivedAt" DATETIME,
    CONSTRAINT "SessionProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SessionProcedure_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SessionProcedure" ("agentNom", "completedAt", "etapeIndex", "etat", "id", "posteId", "posteSlug", "procedureId", "procedureSnapshot", "procedureVersion", "startedAt", "statut", "synthese") SELECT "agentNom", "completedAt", "etapeIndex", "etat", "id", "posteId", "posteSlug", "procedureId", "procedureSnapshot", "procedureVersion", "startedAt", "statut", "synthese" FROM "SessionProcedure";
DROP TABLE "SessionProcedure";
ALTER TABLE "new_SessionProcedure" RENAME TO "SessionProcedure";
CREATE INDEX "SessionProcedure_posteSlug_idx" ON "SessionProcedure"("posteSlug");
CREATE INDEX "SessionProcedure_statut_idx" ON "SessionProcedure"("statut");
CREATE INDEX "SessionProcedure_eventsArchived_statut_completedAt_idx" ON "SessionProcedure"("eventsArchived", "statut", "completedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SessionProcedureEvent_sessionId_occurredAt_idx" ON "SessionProcedureEvent"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "SessionProcedureEvent_type_occurredAt_idx" ON "SessionProcedureEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "SessionProcedureEvent_actionId_idx" ON "SessionProcedureEvent"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionProcedureEvent_sessionId_sequence_key" ON "SessionProcedureEvent"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "SessionProcedureEventArchive_sessionId_idx" ON "SessionProcedureEventArchive"("sessionId");

-- CreateIndex
CREATE INDEX "SessionProcedureEventArchive_occurredAt_idx" ON "SessionProcedureEventArchive"("occurredAt");

-- CreateIndex
CREATE INDEX "SessionProcedureEventArchive_actionId_idx" ON "SessionProcedureEventArchive"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionProcedureEventArchive_sessionId_sequence_key" ON "SessionProcedureEventArchive"("sessionId", "sequence");

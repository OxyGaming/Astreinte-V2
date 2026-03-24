-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "typeProcedure" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "etapes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PosteProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "posteId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PosteProcedure_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PosteProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionProcedure" (
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
    CONSTRAINT "SessionProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SessionProcedure_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_slug_key" ON "Procedure"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PosteProcedure_posteId_procedureId_key" ON "PosteProcedure"("posteId", "procedureId");

-- CreateIndex
CREATE INDEX "SessionProcedure_posteSlug_idx" ON "SessionProcedure"("posteSlug");

-- CreateIndex
CREATE INDEX "SessionProcedure_statut_idx" ON "SessionProcedure"("statut");

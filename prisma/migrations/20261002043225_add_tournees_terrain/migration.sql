-- CreateTable
CREATE TABLE "TourneeModele" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "sousTitre" TEXT,
    "description" TEXT,
    "objectif" TEXT,
    "aPropos" TEXT NOT NULL DEFAULT '[]',
    "heureDepart" TEXT NOT NULL DEFAULT '08:00',
    "seuils" TEXT,
    "contacts" TEXT NOT NULL DEFAULT '[]',
    "liens" TEXT,
    "mentionDiffusion" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourneeModele_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourneeEtape" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modeleId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'POINT',
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "optionnelle" BOOLEAN NOT NULL DEFAULT false,
    "heureImposee" TEXT,
    "dureeMin" INTEGER NOT NULL DEFAULT 0,
    "trajetSuivanteMin" INTEGER NOT NULL DEFAULT 0,
    "surcoutTrajetMin" INTEGER,
    "adresse" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "localisationMasquee" BOOLEAN NOT NULL DEFAULT false,
    "liens" TEXT,
    "contenu" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourneeEtape_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "TourneeModele" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourneeRealisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modeleId" TEXT,
    "modeleVersion" INTEGER NOT NULL DEFAULT 1,
    "planSnapshot" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "heureDepart" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PREPARATION',
    "codePartage" TEXT,
    "createdById" TEXT NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "clientOpId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourneeRealisation_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "TourneeModele" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TourneeRealisation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourneeParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "realisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARTICIPANT',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "etapeCouranteKey" TEXT,
    "etapeCouranteDepuis" DATETIME,
    CONSTRAINT "TourneeParticipant_realisationId_fkey" FOREIGN KEY ("realisationId") REFERENCES "TourneeRealisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TourneeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourneeEvenement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "realisationId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "etapeKey" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientOpId" TEXT,
    CONSTRAINT "TourneeEvenement_realisationId_fkey" FOREIGN KEY ("realisationId") REFERENCES "TourneeRealisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TourneeEvenement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TourneeParticipant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourneeContribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "realisationId" TEXT,
    "modeleId" TEXT,
    "etapeKey" TEXT,
    "etapeTitre" TEXT,
    "auteurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "assigneeId" TEXT,
    "traiteLe" DATETIME,
    "clientOpId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourneeContribution_realisationId_fkey" FOREIGN KEY ("realisationId") REFERENCES "TourneeRealisation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TourneeContribution_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "TourneeModele" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TourneeContribution_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TourneeContribution_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourneeContributionHistorique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contributionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "message" TEXT,
    "actorId" TEXT,
    "actorNom" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TourneeContributionHistorique_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "TourneeContribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "ficheId" TEXT,
    "posteId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'DOCUMENT',
    "caption" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "tourneeEtapeId" TEXT,
    "tourneeContributionId" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "Fiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_tourneeEtapeId_fkey" FOREIGN KEY ("tourneeEtapeId") REFERENCES "TourneeEtape" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_tourneeContributionId_fkey" FOREIGN KEY ("tourneeContributionId") REFERENCES "TourneeContribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "ficheId", "filename", "id", "mimeType", "originalName", "posteId", "size", "uploadedByUserId") SELECT "createdAt", "ficheId", "filename", "id", "mimeType", "originalName", "posteId", "size", "uploadedByUserId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_ficheId_idx" ON "Document"("ficheId");
CREATE INDEX "Document_posteId_idx" ON "Document"("posteId");
CREATE INDEX "Document_tourneeEtapeId_idx" ON "Document"("tourneeEtapeId");
CREATE INDEX "Document_tourneeContributionId_idx" ON "Document"("tourneeContributionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TourneeModele_statut_idx" ON "TourneeModele"("statut");

-- CreateIndex
CREATE INDEX "TourneeEtape_modeleId_ordre_idx" ON "TourneeEtape"("modeleId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "TourneeRealisation_codePartage_key" ON "TourneeRealisation"("codePartage");

-- CreateIndex
CREATE UNIQUE INDEX "TourneeRealisation_clientOpId_key" ON "TourneeRealisation"("clientOpId");

-- CreateIndex
CREATE INDEX "TourneeRealisation_statut_mode_idx" ON "TourneeRealisation"("statut", "mode");

-- CreateIndex
CREATE INDEX "TourneeRealisation_createdById_idx" ON "TourneeRealisation"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "TourneeParticipant_realisationId_userId_key" ON "TourneeParticipant"("realisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TourneeEvenement_clientOpId_key" ON "TourneeEvenement"("clientOpId");

-- CreateIndex
CREATE INDEX "TourneeEvenement_participantId_occurredAt_idx" ON "TourneeEvenement"("participantId", "occurredAt");

-- CreateIndex
CREATE INDEX "TourneeEvenement_realisationId_idx" ON "TourneeEvenement"("realisationId");

-- CreateIndex
CREATE UNIQUE INDEX "TourneeContribution_clientOpId_key" ON "TourneeContribution"("clientOpId");

-- CreateIndex
CREATE INDEX "TourneeContribution_statut_idx" ON "TourneeContribution"("statut");

-- CreateIndex
CREATE INDEX "TourneeContribution_auteurId_idx" ON "TourneeContribution"("auteurId");

-- CreateIndex
CREATE INDEX "TourneeContribution_modeleId_idx" ON "TourneeContribution"("modeleId");

-- CreateIndex
CREATE INDEX "TourneeContribution_createdAt_idx" ON "TourneeContribution"("createdAt");

-- CreateIndex
CREATE INDEX "TourneeContributionHistorique_contributionId_createdAt_idx" ON "TourneeContributionHistorique"("contributionId", "createdAt");

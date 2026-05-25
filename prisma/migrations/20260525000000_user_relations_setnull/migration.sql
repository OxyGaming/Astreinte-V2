-- Migration : passe les FK historiques vers User en NULLABLE + ON DELETE SET NULL.
--
-- Objectif : durcir le soft-delete utilisateur. Si quelqu'un contourne l'API
-- HTTP et fait un `DELETE FROM "User"` direct (SQL, Prisma Studio, script),
-- les contraintes FK ne brisent plus l'application :
--   - FicheActionLog.userId    : NOT NULL → NULLABLE, SET NULL
--   - FicheCommentLog.userId   : NOT NULL → NULLABLE, SET NULL
--   - Document.uploadedByUserId: NOT NULL → NULLABLE, SET NULL
--   - MainCourante.validatedByUserId : déjà NULLABLE → ajoute SET NULL
--
-- Restent NOT NULL volontairement (cf. commentaires schema.prisma) :
--   - FicheSession.createdByUserId — identité du créateur d'opération
--   - MainCourante.auteurId        — identité du contributeur
--
-- SQLite ne supporte pas ALTER COLUMN pour changer une contrainte FK. La
-- procédure standard est : rename old → create new → copy → drop old →
-- recreate indexes. Toutes les opérations sont enveloppées dans une
-- transaction implicite par Prisma.

PRAGMA foreign_keys = OFF;

-- ─── FicheActionLog ─────────────────────────────────────────────────────────
ALTER TABLE "FicheActionLog" RENAME TO "FicheActionLog_old";

CREATE TABLE "FicheActionLog" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "sessionId"   TEXT NOT NULL,
    "ficheSlug"   TEXT NOT NULL,
    "etapeOrdre"  INTEGER NOT NULL,
    "actionIndex" INTEGER NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "userId"      TEXT,
    "timestamp"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type"        TEXT NOT NULL,
    "clientOpId"  TEXT,
    CONSTRAINT "FicheActionLog_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"         ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FicheActionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FicheSession" ("id") ON DELETE CASCADE  ON UPDATE CASCADE
);

INSERT INTO "FicheActionLog" ("id","sessionId","ficheSlug","etapeOrdre","actionIndex","actionLabel","userId","timestamp","type","clientOpId")
SELECT "id","sessionId","ficheSlug","etapeOrdre","actionIndex","actionLabel","userId","timestamp","type","clientOpId"
FROM "FicheActionLog_old";

DROP TABLE "FicheActionLog_old";

CREATE UNIQUE INDEX "FicheActionLog_clientOpId_key" ON "FicheActionLog"("clientOpId");

-- ─── FicheCommentLog ────────────────────────────────────────────────────────
ALTER TABLE "FicheCommentLog" RENAME TO "FicheCommentLog_old";

CREATE TABLE "FicheCommentLog" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "sessionId"  TEXT NOT NULL,
    "ficheSlug"  TEXT NOT NULL,
    "userId"     TEXT,
    "timestamp"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message"    TEXT NOT NULL,
    "clientOpId" TEXT,
    CONSTRAINT "FicheCommentLog_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"         ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FicheCommentLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FicheSession" ("id") ON DELETE CASCADE  ON UPDATE CASCADE
);

INSERT INTO "FicheCommentLog" ("id","sessionId","ficheSlug","userId","timestamp","message","clientOpId")
SELECT "id","sessionId","ficheSlug","userId","timestamp","message","clientOpId"
FROM "FicheCommentLog_old";

DROP TABLE "FicheCommentLog_old";

CREATE UNIQUE INDEX "FicheCommentLog_clientOpId_key" ON "FicheCommentLog"("clientOpId");

-- ─── Document ───────────────────────────────────────────────────────────────
ALTER TABLE "Document" RENAME TO "Document_old";

CREATE TABLE "Document" (
    "id"               TEXT NOT NULL PRIMARY KEY,
    "filename"         TEXT NOT NULL,
    "originalName"     TEXT NOT NULL,
    "mimeType"         TEXT NOT NULL,
    "size"             INTEGER NOT NULL,
    "ficheId"          TEXT,
    "posteId"          TEXT,
    "uploadedByUserId" TEXT,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_ficheId_fkey"          FOREIGN KEY ("ficheId")          REFERENCES "Fiche" ("id") ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT "Document_posteId_fkey"          FOREIGN KEY ("posteId")          REFERENCES "Poste" ("id") ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"  ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "Document" ("id","filename","originalName","mimeType","size","ficheId","posteId","uploadedByUserId","createdAt")
SELECT "id","filename","originalName","mimeType","size","ficheId","posteId","uploadedByUserId","createdAt"
FROM "Document_old";

DROP TABLE "Document_old";

CREATE INDEX "Document_ficheId_idx" ON "Document"("ficheId");
CREATE INDEX "Document_posteId_idx" ON "Document"("posteId");

-- ─── MainCourante ───────────────────────────────────────────────────────────
-- Seul `validatedByUserId` change (déjà NULLABLE, on ajoute SET NULL).
-- `auteurId` reste NOT NULL volontairement.
ALTER TABLE "MainCourante" RENAME TO "MainCourante_old";

CREATE TABLE "MainCourante" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "titre"               TEXT,
    "nature"              TEXT,
    "libelle"             TEXT,
    "description"         TEXT NOT NULL,
    "solution"            TEXT,
    "avisSecurite"        TEXT,
    "avisProduction"      TEXT,
    "ficheSlug"           TEXT,
    "auteurId"            TEXT NOT NULL,
    "status"              TEXT NOT NULL DEFAULT 'pending',
    "editedDescription"   TEXT,
    "rejetMotif"          TEXT,
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           DATETIME NOT NULL,
    "validatedAt"         DATETIME,
    "validatedByUserId"   TEXT,
    "clientOpId"          TEXT,
    CONSTRAINT "MainCourante_auteurId_fkey"            FOREIGN KEY ("auteurId")          REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MainCourante_validatedByUserId_fkey"   FOREIGN KEY ("validatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "MainCourante" ("id","titre","nature","libelle","description","solution","avisSecurite","avisProduction","ficheSlug","auteurId","status","editedDescription","rejetMotif","createdAt","updatedAt","validatedAt","validatedByUserId","clientOpId")
SELECT "id","titre","nature","libelle","description","solution","avisSecurite","avisProduction","ficheSlug","auteurId","status","editedDescription","rejetMotif","createdAt","updatedAt","validatedAt","validatedByUserId","clientOpId"
FROM "MainCourante_old";

DROP TABLE "MainCourante_old";

CREATE UNIQUE INDEX "MainCourante_clientOpId_key" ON "MainCourante"("clientOpId");
CREATE INDEX "MainCourante_status_idx"            ON "MainCourante"("status");
CREATE INDEX "MainCourante_auteurId_idx"          ON "MainCourante"("auteurId");
CREATE INDEX "MainCourante_createdAt_idx"         ON "MainCourante"("createdAt");
CREATE INDEX "MainCourante_nature_idx"            ON "MainCourante"("nature");

PRAGMA foreign_keys = ON;

-- Idempotency keys for offline-online drain.
-- Permet au serveur de détecter et ignorer un POST déjà appliqué (ex: replay
-- réseau, drain double, retry navigateur). SQLite autorise plusieurs NULLs
-- dans un index UNIQUE — les anciennes lignes sans clientOpId restent valides.

-- AlterTable
ALTER TABLE "FicheSession" ADD COLUMN "clientOpId" TEXT;
ALTER TABLE "FicheActionLog" ADD COLUMN "clientOpId" TEXT;
ALTER TABLE "FicheCommentLog" ADD COLUMN "clientOpId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FicheSession_clientOpId_key" ON "FicheSession"("clientOpId");
CREATE UNIQUE INDEX "FicheActionLog_clientOpId_key" ON "FicheActionLog"("clientOpId");
CREATE UNIQUE INDEX "FicheCommentLog_clientOpId_key" ON "FicheCommentLog"("clientOpId");

-- Idempotency keys for offline-online drain of procedure sessions and main courante.
-- Permet au serveur d'ignorer une création déjà appliquée (replay réseau, drain
-- double). SQLite autorise plusieurs NULLs dans un index UNIQUE — les lignes
-- existantes sans clientOpId restent valides.

-- AlterTable
ALTER TABLE "SessionProcedure" ADD COLUMN "clientOpId" TEXT;
ALTER TABLE "MainCourante" ADD COLUMN "clientOpId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SessionProcedure_clientOpId_key" ON "SessionProcedure"("clientOpId");
CREATE UNIQUE INDEX "MainCourante_clientOpId_key" ON "MainCourante"("clientOpId");

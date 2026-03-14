-- CreateTable
CREATE TABLE "AccesRail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ligne" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "type" TEXT,
    "identifiant" TEXT,
    "nomAffiche" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'KML',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AccesRail_ligne_idx" ON "AccesRail"("ligne");

-- CreateIndex
CREATE INDEX "AccesRail_pk_idx" ON "AccesRail"("pk");

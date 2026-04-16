-- CreateTable
CREATE TABLE "MainCourante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "MainCourante_status_idx" ON "MainCourante"("status");

-- CreateIndex
CREATE INDEX "MainCourante_auteurId_idx" ON "MainCourante"("auteurId");

-- CreateIndex
CREATE INDEX "MainCourante_createdAt_idx" ON "MainCourante"("createdAt");

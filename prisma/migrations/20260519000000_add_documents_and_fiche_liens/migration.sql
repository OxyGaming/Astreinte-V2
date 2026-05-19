-- CreateTable: FicheLien (lien symétrique entre fiches)
CREATE TABLE "FicheLien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ficheSourceId" TEXT NOT NULL,
    "ficheCibleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FicheLien_ficheSourceId_fkey" FOREIGN KEY ("ficheSourceId") REFERENCES "Fiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FicheLien_ficheCibleId_fkey" FOREIGN KEY ("ficheCibleId") REFERENCES "Fiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FicheLien_ficheSourceId_ficheCibleId_key" ON "FicheLien"("ficheSourceId", "ficheCibleId");
CREATE INDEX "FicheLien_ficheSourceId_idx" ON "FicheLien"("ficheSourceId");
CREATE INDEX "FicheLien_ficheCibleId_idx" ON "FicheLien"("ficheCibleId");

-- CreateTable: Document (PDF attaché à fiche OU poste)
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "ficheId" TEXT,
    "posteId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "Fiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Document_ficheId_idx" ON "Document"("ficheId");
CREATE INDEX "Document_posteId_idx" ON "Document"("posteId");

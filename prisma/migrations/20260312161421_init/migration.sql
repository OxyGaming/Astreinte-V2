-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "telephoneAlt" TEXT,
    "note" TEXT,
    "disponibilite" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Secteur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ligne" TEXT NOT NULL,
    "trajet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pointsAcces" TEXT NOT NULL,
    "procedures" TEXT NOT NULL,
    "pn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Fiche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "priorite" TEXT NOT NULL,
    "mnemonique" TEXT,
    "resume" TEXT NOT NULL,
    "etapes" TEXT NOT NULL,
    "references" TEXT,
    "avisObligatoires" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FicheContact" (
    "ficheId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,

    PRIMARY KEY ("ficheId", "contactId"),
    CONSTRAINT "FicheContact_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "Fiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FicheContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FicheSecteur" (
    "ficheId" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    PRIMARY KEY ("ficheId", "secteurId"),
    CONSTRAINT "FicheSecteur_ficheId_fkey" FOREIGN KEY ("ficheId") REFERENCES "Fiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FicheSecteur_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mnemonique" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acronyme" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lettres" TEXT NOT NULL,
    "contexte" TEXT,
    "couleur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Abreviation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sigle" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Poste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typePoste" TEXT NOT NULL,
    "lignes" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "horaires" TEXT NOT NULL,
    "electrification" TEXT NOT NULL,
    "systemeBlock" TEXT NOT NULL,
    "annuaire" TEXT NOT NULL,
    "circuitsVoie" TEXT NOT NULL,
    "pnSensibles" TEXT NOT NULL,
    "particularites" TEXT NOT NULL,
    "proceduresCles" TEXT NOT NULL,
    "dbc" TEXT,
    "rex" TEXT,
    "secteurId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Poste_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Secteur_slug_key" ON "Secteur"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Fiche_slug_key" ON "Fiche"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Fiche_numero_key" ON "Fiche"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Abreviation_sigle_key" ON "Abreviation"("sigle");

-- CreateIndex
CREATE UNIQUE INDEX "Poste_slug_key" ON "Poste"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

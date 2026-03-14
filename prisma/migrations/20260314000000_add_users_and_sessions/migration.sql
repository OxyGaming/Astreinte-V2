-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: FicheSession
CREATE TABLE "FicheSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ficheSlug" TEXT NOT NULL,
    "ficheTitre" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "FicheSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: FicheActionLog
CREATE TABLE "FicheActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "ficheSlug" TEXT NOT NULL,
    "etapeOrdre" INTEGER NOT NULL,
    "actionIndex" INTEGER NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    CONSTRAINT "FicheActionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FicheSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FicheActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: FicheCommentLog
CREATE TABLE "FicheCommentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "ficheSlug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    CONSTRAINT "FicheCommentLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FicheSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FicheCommentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "FicheSession_ficheSlug_idx" ON "FicheSession"("ficheSlug");

-- CreateIndex
CREATE INDEX "FicheSession_status_idx" ON "FicheSession"("status");

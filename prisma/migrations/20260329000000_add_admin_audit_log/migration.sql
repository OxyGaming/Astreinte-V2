-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "userId"     TEXT NOT NULL,
    "userNom"    TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "resource"   TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "detail"     TEXT,
    "timestamp"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_resource_resourceId_idx" ON "AdminAuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");

-- Migration: Add registration fields to User
-- status: pending | approved | rejected (default approved for existing admin-created accounts)
-- email, poste, motif: optional fields for self-registration form

ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "User" ADD COLUMN "poste" TEXT;
ALTER TABLE "User" ADD COLUMN "motif" TEXT;

-- Unique index on email (NULL values are ignored in SQLite unique constraints)
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

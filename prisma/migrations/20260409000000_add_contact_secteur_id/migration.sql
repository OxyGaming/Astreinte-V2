-- Migration: add optional secteurId to Contact
-- Permet de rattacher un contact de référence à un secteur (relation optionnelle)
-- Ne casse pas l'existant : champ nullable, aucune donnée migrée

ALTER TABLE "Contact" ADD COLUMN "secteurId" TEXT REFERENCES "Secteur"("id") ON DELETE SET NULL;

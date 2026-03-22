-- Migration: remove AdminUser table (unified auth via User table with role=ADMIN)
DROP TABLE IF EXISTS "AdminUser";

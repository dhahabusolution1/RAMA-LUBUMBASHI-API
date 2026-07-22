-- AlterTable
ALTER TABLE "InscriptionSession" ADD COLUMN "matriculeExpireAt" TIMESTAMP;

-- If needed, set a default expiry for existing matricules (optional)
-- UPDATE "InscriptionSession" SET "matriculeExpireAt" = now() + INTERVAL '1 year' WHERE "matricule" IS NOT NULL AND "matriculeExpireAt" IS NULL;

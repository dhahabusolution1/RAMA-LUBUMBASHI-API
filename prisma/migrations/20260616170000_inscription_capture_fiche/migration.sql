-- Capture fiche identification membre
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "captureFicheUrl" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "captureFichePublicId" TEXT;

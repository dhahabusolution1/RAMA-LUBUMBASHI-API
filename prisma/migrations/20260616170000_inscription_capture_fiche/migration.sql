-- Capture fiche identification membre (photo / scan du formulaire papier)
ALTER TABLE "InscriptionSession" ADD COLUMN "captureFicheUrl" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "captureFichePublicId" TEXT;

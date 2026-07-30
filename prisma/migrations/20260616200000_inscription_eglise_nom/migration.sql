-- Église / antenne en texte libre (identification membre)
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "egliseNom" TEXT;

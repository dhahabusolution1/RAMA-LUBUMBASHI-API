-- Église d'appartenance en texte libre (renouvellement d'engagement)
ALTER TABLE "Requete" ADD COLUMN IF NOT EXISTS "egliseNom" TEXT;

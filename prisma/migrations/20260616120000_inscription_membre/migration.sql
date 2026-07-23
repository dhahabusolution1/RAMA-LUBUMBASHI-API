-- Identification membre : champs et départements
-- Idempotent : safe si un précédent essai a partiellement appliqué la migration

DO $$ BEGIN
  CREATE TYPE "Sexe" AS ENUM ('MASCULIN', 'FEMININ');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EtatCivil" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "matricule" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "numeroCarteMembre" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "telephone2" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "sexe" "Sexe";
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "dateNaissance" DATE;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "lieuNaissance" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "etatCivil" "EtatCivil";
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "dateBapteme" DATE;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "lieuBapteme" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "dateAdhesion" DATE;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "niveauEtudes" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "profession" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "adressePhysique" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "ville" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "commune" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "quartier" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "formationEglise" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "autresSavoirFaire" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "nomConjoint" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN IF NOT EXISTS "nombreEnfants" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "InscriptionSession_matricule_key" ON "InscriptionSession"("matricule");
CREATE UNIQUE INDEX IF NOT EXISTS "InscriptionSession_numeroCarteMembre_key" ON "InscriptionSession"("numeroCarteMembre");
CREATE INDEX IF NOT EXISTS "InscriptionSession_matricule_idx" ON "InscriptionSession"("matricule");

CREATE TABLE IF NOT EXISTS "InscriptionDepartement" (
    "id" TEXT NOT NULL,
    "inscriptionSessionId" TEXT NOT NULL,
    "departementId" TEXT,
    "fonction" TEXT NOT NULL,
    "depuis" DATE NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InscriptionDepartement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InscriptionDepartement_inscriptionSessionId_idx" ON "InscriptionDepartement"("inscriptionSessionId");

DO $$ BEGIN
  ALTER TABLE "InscriptionDepartement" ADD CONSTRAINT "InscriptionDepartement_inscriptionSessionId_fkey"
    FOREIGN KEY ("inscriptionSessionId") REFERENCES "InscriptionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InscriptionDepartement" ADD CONSTRAINT "InscriptionDepartement_departementId_fkey"
    FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

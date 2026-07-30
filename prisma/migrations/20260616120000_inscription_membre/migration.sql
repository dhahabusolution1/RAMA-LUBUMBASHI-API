-- Sessions + identification membre
-- Sur une DB neuve, InscriptionSession n'existe PAS dans init (créée historiquement via db push).
-- Cette migration crée le stack si absent, puis ajoute les colonnes membre de façon idempotente.

-- ── Enums ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TypeSession" AS ENUM ('BAPTEME', 'ENREGISTREMENT_MEMBRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatutInscription" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Sexe" AS ENUM ('MASCULIN', 'FEMININ');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EtatCivil" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── SessionFormulaire ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SessionFormulaire" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeSession" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionFormulaire_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionFormulaire_type_idx" ON "SessionFormulaire"("type");
CREATE INDEX IF NOT EXISTS "SessionFormulaire_dateDebut_dateFin_idx" ON "SessionFormulaire"("dateDebut", "dateFin");

-- ── InscriptionSession (base + champs membre) ────────────────
CREATE TABLE IF NOT EXISTS "InscriptionSession" (
    "id" TEXT NOT NULL,
    "sessionFormulaireId" TEXT NOT NULL,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "postnom" TEXT,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "adresse" TEXT,
    "egliseId" TEXT,
    "statut" "StatutInscription" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscriptionSession_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "InscriptionSession" ADD CONSTRAINT "InscriptionSession_sessionFormulaireId_fkey"
    FOREIGN KEY ("sessionFormulaireId") REFERENCES "SessionFormulaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InscriptionSession" ADD CONSTRAINT "InscriptionSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InscriptionSession" ADD CONSTRAINT "InscriptionSession_egliseId_fkey"
    FOREIGN KEY ("egliseId") REFERENCES "Eglise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "InscriptionSession_sessionFormulaireId_idx" ON "InscriptionSession"("sessionFormulaireId");
CREATE INDEX IF NOT EXISTS "InscriptionSession_statut_idx" ON "InscriptionSession"("statut");

-- Colonnes identification membre (idempotent si table déjà présente)
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

-- ── InscriptionDepartement ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "InscriptionDepartement" (
    "id" TEXT NOT NULL,
    "inscriptionSessionId" TEXT NOT NULL,
    "departementId" TEXT,
    "fonction" TEXT,
    "depuis" DATE,
    "ordre" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InscriptionDepartement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InscriptionDepartement_inscriptionSessionId_idx" ON "InscriptionDepartement"("inscriptionSessionId");

DO $$ BEGIN
  ALTER TABLE "InscriptionDepartement" ADD CONSTRAINT "InscriptionDepartement_inscriptionSessionId_fkey"
    FOREIGN KEY ("inscriptionSessionId") REFERENCES "InscriptionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InscriptionDepartement" ADD CONSTRAINT "InscriptionDepartement_departementId_fkey"
    FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

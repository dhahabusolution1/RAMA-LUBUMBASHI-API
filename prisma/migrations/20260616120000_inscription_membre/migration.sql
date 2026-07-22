-- Identification membre : champs et départements

CREATE TYPE "Sexe" AS ENUM ('MASCULIN', 'FEMININ');
CREATE TYPE "EtatCivil" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF');

ALTER TABLE "InscriptionSession" ADD COLUMN "matricule" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "numeroCarteMembre" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "telephone2" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "email" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "sexe" "Sexe";
ALTER TABLE "InscriptionSession" ADD COLUMN "dateNaissance" DATE;
ALTER TABLE "InscriptionSession" ADD COLUMN "lieuNaissance" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "etatCivil" "EtatCivil";
ALTER TABLE "InscriptionSession" ADD COLUMN "dateBapteme" DATE;
ALTER TABLE "InscriptionSession" ADD COLUMN "lieuBapteme" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "dateAdhesion" DATE;
ALTER TABLE "InscriptionSession" ADD COLUMN "niveauEtudes" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "profession" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "adressePhysique" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "ville" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "commune" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "quartier" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "formationEglise" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "autresSavoirFaire" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "nomConjoint" TEXT;
ALTER TABLE "InscriptionSession" ADD COLUMN "nombreEnfants" INTEGER;

CREATE UNIQUE INDEX "InscriptionSession_matricule_key" ON "InscriptionSession"("matricule");
CREATE UNIQUE INDEX "InscriptionSession_numeroCarteMembre_key" ON "InscriptionSession"("numeroCarteMembre");
CREATE INDEX "InscriptionSession_matricule_idx" ON "InscriptionSession"("matricule");

CREATE TABLE "InscriptionDepartement" (
    "id" TEXT NOT NULL,
    "inscriptionSessionId" TEXT NOT NULL,
    "departementId" TEXT,
    "fonction" TEXT NOT NULL,
    "depuis" DATE NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "InscriptionDepartement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InscriptionDepartement_inscriptionSessionId_idx" ON "InscriptionDepartement"("inscriptionSessionId");

ALTER TABLE "InscriptionDepartement" ADD CONSTRAINT "InscriptionDepartement_inscriptionSessionId_fkey" FOREIGN KEY ("inscriptionSessionId") REFERENCES "InscriptionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InscriptionDepartement" ADD CONSTRAINT "InscriptionDepartement_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

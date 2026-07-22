-- Creation de la structure initiale pour Parole Eternelle v2

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FIDELE');

-- CreateEnum
CREATE TYPE "TypeEvenement" AS ENUM ('EVENEMENT', 'PROGRAMME_CULTE');

-- CreateEnum
CREATE TYPE "StatutEvenement" AS ENUM ('BROUILLON', 'PUBLIE', 'ANNULE', 'TERMINE');

-- CreateEnum
CREATE TYPE "TypeEmission" AS ENUM ('EMISSION_TV', 'EMISSION_RADIO');

-- CreateEnum
CREATE TYPE "TypeCulte" AS ENUM ('MERCREDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE', 'SEMINAIRE', 'CONCERT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutCulte" AS ENUM ('PLANIFIE', 'EN_DIRECT', 'REDIFFUSION');

-- CreateEnum
CREATE TYPE "TypeRequete" AS ENUM ('PRIERE', 'PRIERE_SALUT', 'RENOUVELLEMENT', 'INTEGRATION', 'DEMANDE_INFO', 'BAPTEME');

-- CreateEnum
CREATE TYPE "StatutRequete" AS ENUM ('EN_ATTENTE', 'LU', 'REPONDU', 'EN_PRIERE', 'TERMINE', 'CONTACTE', 'INTEGRE', 'ABANDONNE', 'CONFIRME', 'REALISE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeDemandePriere" AS ENUM ('MOI', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutRendezVous" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'EFFECTUE', 'ANNULE');

-- CreateEnum
CREATE TYPE "StatutMessage" AS ENUM ('ENVOYE', 'LU');

-- CreateEnum
CREATE TYPE "StatutConversation" AS ENUM ('OUVERTE', 'FERMEE');

-- CreateEnum
CREATE TYPE "Plateforme" AS ENUM ('IOS', 'ANDROID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "postnom" TEXT,
    "prenom" TEXT,
    "email" TEXT,
    "numeroWhatsapp" TEXT,
    "motDePasseHash" TEXT,
    "photoUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'FIDELE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "plateforme" "Plateforme" NOT NULL,
    "userId" TEXT,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersetJour" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "meditation" TEXT,
    "versionBiblique" TEXT NOT NULL DEFAULT 'LSG',
    "datePublication" TIMESTAMP(3) NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersetJour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" TEXT NOT NULL,
    "type" "TypeEvenement" NOT NULL DEFAULT 'EVENEMENT',
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT,
    "lieu" TEXT,
    "imageUrl" TEXT,
    "imageExterneUrl" TEXT,
    "organisateur" TEXT,
    "lienYoutube" TEXT,
    "statut" "StatutEvenement" NOT NULL DEFAULT 'BROUILLON',

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistSermon" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT,
    "imageUrl" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistSermon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sermon" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "predicateur" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "lienYoutube" TEXT NOT NULL,
    "miniatureUrl" TEXT,
    "playlistId" TEXT,
    "ordreInPlaylist" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sermon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emission" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "lienYoutube" TEXT NOT NULL,
    "miniatureUrl" TEXT,
    "type" "TypeEmission" NOT NULL,

    CONSTRAINT "Emission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortVideo" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "miniatureUrl" TEXT,
    "cloudinaryPublicId" TEXT NOT NULL,
    "datePublication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Culte" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeCulte" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lienYoutube" TEXT,
    "miniatureUrl" TEXT,
    "statut" "StatutCulte" NOT NULL DEFAULT 'PLANIFIE',

    CONSTRAINT "Culte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "texte" TEXT,
    "auteur" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eglise" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "photoUrl" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "ville" TEXT,
    "pasteurNom" TEXT,
    "pasteurPhotoUrl" TEXT,
    "pasteurUserId" TEXT,

    CONSTRAINT "Eglise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cellule" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "quartiersCouvertes" TEXT,
    "adresseReunion" TEXT,
    "lieuReunion" TEXT,
    "telephone1" TEXT,
    "telephone2" TEXT,
    "egliseId" TEXT,

    CONSTRAINT "Cellule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "responsable" TEXT,
    "mission" TEXT,
    "historique" TEXT,

    CONSTRAINT "Departement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requete" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "type" "TypeRequete" NOT NULL,
    "userId" TEXT,
    "nomVisiteur" TEXT,
    "prenomVisiteur" TEXT,
    "whatsappVisiteur" TEXT,
    "emailVisiteur" TEXT,
    "egliseId" TEXT,
    "message" TEXT,
    "typePriere" "TypeDemandePriere",
    "estMembre" BOOLEAN,
    "statut" "StatutRequete" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RendezVous" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "heure" TEXT NOT NULL,
    "motif" TEXT,
    "statut" "StatutRendezVous" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "fideleId" TEXT NOT NULL,
    "adminId" TEXT,
    "statut" "StatutConversation" NOT NULL DEFAULT 'OUVERTE',

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "conversationId" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "statut" "StatutMessage" NOT NULL DEFAULT 'ENVOYE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livre" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "auteur" TEXT,
    "prix" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "couvertureUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "numeroWhatsappAchat" TEXT,
    "estDisponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Livre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationApp" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL_CONFIG',
    "programmeHebdomadaire" TEXT,
    "numeroWhatsappContact" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigurationApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAccueil" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "estActif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MessageAccueil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordonneesDon" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "detail" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CoordonneesDon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "acteurId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_numeroWhatsapp_key" ON "User"("numeroWhatsapp");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex("User_deletedAt_idx")
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");

-- CreateIndex
CREATE INDEX "FcmToken_userId_idx" ON "FcmToken"("userId");

-- CreateIndex
CREATE INDEX "VersetJour_estActif_idx" ON "VersetJour"("estActif");

-- CreateIndex
CREATE INDEX "VersetJour_datePublication_idx" ON "VersetJour"("datePublication");

-- CreateIndex
CREATE INDEX "Evenement_type_statut_idx" ON "Evenement"("type", "statut");

-- CreateIndex
CREATE INDEX "Evenement_date_idx" ON "Evenement"("date");

-- CreateIndex
CREATE INDEX "Sermon_playlistId_idx" ON "Sermon"("playlistId");

-- CreateIndex
CREATE INDEX "Sermon_createdAt_idx" ON "Sermon"("createdAt");

-- CreateIndex
CREATE INDEX "Emission_type_idx" ON "Emission"("type");

-- CreateIndex
CREATE INDEX "Emission_date_idx" ON "Emission"("date");

-- CreateIndex
CREATE INDEX "ShortVideo_datePublication_idx" ON "ShortVideo"("datePublication");

-- CreateIndex
CREATE INDEX "Culte_statut_idx" ON "Culte"("statut");

-- CreateIndex
CREATE INDEX "Culte_date_idx" ON "Culte"("date");

-- CreateIndex
CREATE INDEX "Citation_createdAt_idx" ON "Citation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Eglise_nom_key" ON "Eglise"("nom");

-- CreateIndex
CREATE INDEX "Cellule_egliseId_idx" ON "Cellule"("egliseId");

-- CreateIndex
CREATE INDEX "Requete_type_idx" ON "Requete"("type");

-- CreateIndex
CREATE INDEX "Requete_userId_idx" ON "Requete"("userId");

-- CreateIndex
CREATE INDEX "Requete_statut_idx" ON "Requete"("statut");

-- CreateIndex
CREATE INDEX "Requete_egliseId_idx" ON "Requete"("egliseId");

-- CreateIndex
CREATE INDEX "Requete_createdAt_idx" ON "Requete"("createdAt");

-- CreateIndex
CREATE INDEX "RendezVous_date_idx" ON "RendezVous"("date");

-- CreateIndex
CREATE INDEX "RendezVous_userId_idx" ON "RendezVous"("userId");

-- CreateIndex
CREATE INDEX "RendezVous_statut_idx" ON "RendezVous"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "RendezVous_unique_slot" ON "RendezVous"("date", "heure");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_fideleId_key" ON "Conversation"("fideleId");

-- CreateIndex
CREATE INDEX "Conversation_statut_idx" ON "Conversation"("statut");

-- CreateIndex
CREATE INDEX "Conversation_adminId_idx" ON "Conversation"("adminId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_statut_idx" ON "Message"("statut");

-- CreateIndex
CREATE INDEX "Livre_estDisponible_idx" ON "Livre"("estDisponible");

-- CreateIndex
CREATE INDEX "MessageAccueil_configId_ordre_idx" ON "MessageAccueil"("configId", "ordre");

-- CreateIndex
CREATE INDEX "CoordonneesDon_configId_ordre_idx" ON "CoordonneesDon"("configId", "ordre");

-- CreateIndex
CREATE INDEX "AuditLog_acteurId_idx" ON "AuditLog"("acteurId");

-- CreateIndex
CREATE INDEX "AuditLog_entite_entiteId_idx" ON "AuditLog"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermon" ADD CONSTRAINT "Sermon_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "PlaylistSermon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eglise" ADD CONSTRAINT "Eglise_pasteurUserId_fkey" FOREIGN KEY ("pasteurUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cellule" ADD CONSTRAINT "Cellule_egliseId_fkey" FOREIGN KEY ("egliseId") REFERENCES "Eglise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_egliseId_fkey" FOREIGN KEY ("egliseId") REFERENCES "Eglise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_fideleId_fkey" FOREIGN KEY ("fideleId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAccueil" ADD CONSTRAINT "MessageAccueil_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ConfigurationApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordonneesDon" ADD CONSTRAINT "CoordonneesDon_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ConfigurationApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

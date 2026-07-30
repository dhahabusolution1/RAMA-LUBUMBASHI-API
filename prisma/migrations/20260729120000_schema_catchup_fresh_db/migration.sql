-- Catch-up schema pour DB neuves (tables ajoutées hors migrations historiques)

-- ── Enums bookshop / dons ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CategorieArticle" AS ENUM ('EGLISE', 'PARTENAIRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TypeArticle" AS ENUM ('LIVRE', 'VETEMENT', 'ACCESSOIRE', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Devise" AS ENUM ('USD', 'CDF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatutDon" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'REUSSI', 'ECHEC', 'ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Livre → ArticleBookshop ──────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Livre'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ArticleBookshop'
  ) THEN
    ALTER TABLE "Livre" RENAME TO "ArticleBookshop";
    ALTER INDEX IF EXISTS "Livre_pkey" RENAME TO "ArticleBookshop_pkey";
    ALTER INDEX IF EXISTS "Livre_estDisponible_idx" RENAME TO "ArticleBookshop_estDisponible_idx";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ArticleBookshop" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "auteur" TEXT,
    "prix" DECIMAL(10,2) NOT NULL,
    "devise" "Devise" NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "couvertureUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "numeroWhatsappAchat" TEXT,
    "estDisponible" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "ventes" INTEGER NOT NULL DEFAULT 0,
    "categorie" "CategorieArticle" NOT NULL DEFAULT 'EGLISE',
    "typeArticle" "TypeArticle" NOT NULL DEFAULT 'LIVRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleBookshop_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "devise" "Devise" NOT NULL DEFAULT 'USD';
ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "ventes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "categorie" "CategorieArticle" NOT NULL DEFAULT 'EGLISE';
ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "typeArticle" "TypeArticle" NOT NULL DEFAULT 'LIVRE';
ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ArticleBookshop" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ArticleBookshop_estDisponible_idx" ON "ArticleBookshop"("estDisponible");
CREATE INDEX IF NOT EXISTS "ArticleBookshop_categorie_typeArticle_idx" ON "ArticleBookshop"("categorie", "typeArticle");

-- ── ImageAccueil (MessageAccueil de l'init a un schéma différent — on crée à part)
CREATE TABLE IF NOT EXISTS "ImageAccueil" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "estActif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ImageAccueil_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ImageAccueil_configId_ordre_idx" ON "ImageAccueil"("configId", "ordre");

DO $$ BEGIN
  ALTER TABLE "ImageAccueil" ADD CONSTRAINT "ImageAccueil_configId_fkey"
    FOREIGN KEY ("configId") REFERENCES "ConfigurationApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── DonTransaction ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DonTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "montant" DECIMAL(12,2) NOT NULL,
    "devise" "Devise" NOT NULL DEFAULT 'CDF',
    "montantMaxicash" INTEGER NOT NULL,
    "currencyMaxicash" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "logId" TEXT,
    "maxicashTransactionId" TEXT,
    "statut" "StatutDon" NOT NULL DEFAULT 'EN_ATTENTE',
    "message" TEXT,
    "telephonePayeur" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DonTransaction_reference_key" ON "DonTransaction"("reference");
CREATE INDEX IF NOT EXISTS "DonTransaction_userId_idx" ON "DonTransaction"("userId");
CREATE INDEX IF NOT EXISTS "DonTransaction_statut_idx" ON "DonTransaction"("statut");
CREATE INDEX IF NOT EXISTS "DonTransaction_logId_idx" ON "DonTransaction"("logId");

DO $$ BEGIN
  ALTER TABLE "DonTransaction" ADD CONSTRAINT "DonTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Notification ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "telephoneDest" TEXT,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "metaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

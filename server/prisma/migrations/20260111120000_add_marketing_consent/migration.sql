-- AlterTable
ALTER TABLE "users" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "marketingConsentAt" TIMESTAMP(3);

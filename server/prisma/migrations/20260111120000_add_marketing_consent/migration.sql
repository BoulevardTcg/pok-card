-- AlterTable: Add GDPR consent and deletion fields
ALTER TABLE "users" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "marketingConsentAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "analyticsConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "analyticsConsentAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "privacyPolicyVersion" TEXT;
ALTER TABLE "users" ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deletionScheduledAt" TIMESTAMP(3);

-- Add new user preference fields
ALTER TABLE "User" ADD COLUMN "pronouns" TEXT;
ALTER TABLE "User" ADD COLUMN "therapyType" TEXT;
ALTER TABLE "User" ADD COLUMN "currentConcerns" JSONB;
ALTER TABLE "User" ADD COLUMN "emergencyContact" TEXT;
ALTER TABLE "User" ADD COLUMN "sessionPreference" TEXT;
ALTER TABLE "User" ADD COLUMN "communicationStyle" TEXT;
ALTER TABLE "User" ADD COLUMN "additionalNotes" TEXT;
-- Add family member fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "familyMember1" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "familyMember2" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "familyMember3" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "familyMember4" TEXT;
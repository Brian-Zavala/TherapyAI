-- Add therapyType column to the ProgressTracking table if it doesn't exist
ALTER TABLE "ProgressTracking" ADD COLUMN IF NOT EXISTS "therapyType" TEXT NOT NULL DEFAULT 'couple';

-- Add notes column to the ProgressTracking table if it doesn't exist
ALTER TABLE "ProgressTracking" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Add sessionId column to the ProgressTracking table if it doesn't exist
ALTER TABLE "ProgressTracking" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

-- Create index for therapyType
CREATE INDEX IF NOT EXISTS "ProgressTracking_therapyType_idx" ON "ProgressTracking"("therapyType");
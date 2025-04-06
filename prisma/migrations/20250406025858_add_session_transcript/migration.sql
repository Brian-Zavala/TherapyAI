-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transcript" TEXT,
ALTER COLUMN "theme" SET DEFAULT 'AI Therapy Session',
ALTER COLUMN "notes" SET DEFAULT '';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assistantId" TEXT;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

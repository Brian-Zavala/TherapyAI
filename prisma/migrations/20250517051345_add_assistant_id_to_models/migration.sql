-- AlterTable
ALTER TABLE "CommunicationMetrics" ADD COLUMN     "assistantId" TEXT;

-- AlterTable
ALTER TABLE "ProgressTracking" ADD COLUMN     "assistantId" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "assistantId" TEXT;

-- AlterTable
ALTER TABLE "TranscriptEntry" ADD COLUMN     "assistantId" TEXT;

-- CreateIndex
CREATE INDEX "CommunicationMetrics_assistantId_idx" ON "CommunicationMetrics"("assistantId");

-- CreateIndex
CREATE INDEX "ProgressTracking_assistantId_idx" ON "ProgressTracking"("assistantId");

-- CreateIndex
CREATE INDEX "Session_assistantId_idx" ON "Session"("assistantId");

-- CreateIndex
CREATE INDEX "TranscriptEntry_assistantId_idx" ON "TranscriptEntry"("assistantId");

-- Add performance indexes for transcript queries

-- Index for finding transcript entries by session
CREATE INDEX IF NOT EXISTS "TranscriptEntry_sessionId_timestamp_idx" ON "TranscriptEntry"("sessionId", "timestamp");

-- Index for finding sessions by user and status
CREATE INDEX IF NOT EXISTS "Session_userId_status_date_idx" ON "Session"("userId", "status", "date" DESC);

-- Index for counting transcript entries
CREATE INDEX IF NOT EXISTS "TranscriptEntry_sessionId_count_idx" ON "TranscriptEntry"("sessionId");
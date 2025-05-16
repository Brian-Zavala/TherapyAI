-- Add notification preferences to User table
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "notificationPrefs" TEXT DEFAULT 'email';

-- Add notification tracking to Session table
ALTER TABLE "Session" ADD COLUMN "notificationPrefs" TEXT DEFAULT 'email';
ALTER TABLE "Session" ADD COLUMN "smsReminderSent" BOOLEAN DEFAULT false;
ALTER TABLE "Session" ADD COLUMN "emailReminderSent" BOOLEAN DEFAULT false;

-- Add notification tracking to TherapySession table
ALTER TABLE "TherapySession" ADD COLUMN "notificationPrefs" TEXT DEFAULT 'email';
ALTER TABLE "TherapySession" ADD COLUMN "smsReminderSent" BOOLEAN DEFAULT false;
ALTER TABLE "TherapySession" ADD COLUMN "emailReminderSent" BOOLEAN DEFAULT false;
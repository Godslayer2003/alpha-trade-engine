-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "dailyReportChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyReportTime" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "dailyReportTimezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "lastDailyReportSentAt" TIMESTAMP(3),
ADD COLUMN     "notificationEmail" TEXT,
ADD COLUMN     "profilePictureUrl" TEXT;

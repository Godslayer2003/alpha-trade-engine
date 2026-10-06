CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
-- Operator identity explicitly approved by the repository owner on 2026-10-06.
-- This promotes only an account already present when the migration runs.
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'ethan10038@gmail.com';
CREATE TABLE "AuthSession" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3),
 CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "SecurityQuota" ("id" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SecurityQuota_pkey" PRIMARY KEY ("id"));
CREATE INDEX "SecurityQuota_expiresAt_idx" ON "SecurityQuota"("expiresAt");

ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT,
 ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "mfaLastStep" INTEGER NOT NULL DEFAULT -1,
 ADD COLUMN "mfaRecoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AuthSession" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE TABLE "AccountToken" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AccountToken_userId_purpose_idx" ON "AccountToken"("userId", "purpose");
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

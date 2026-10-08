ALTER TABLE "User" ADD COLUMN "aiCountry" TEXT, ADD COLUMN "aiAdultConfirmedAt" TIMESTAMP(3);
CREATE TABLE "ContactRequest" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactRequest_resolvedAt_createdAt_idx" ON "ContactRequest"("resolvedAt", "createdAt");

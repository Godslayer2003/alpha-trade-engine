-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chatAccessPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePaymentIntentId" TEXT;

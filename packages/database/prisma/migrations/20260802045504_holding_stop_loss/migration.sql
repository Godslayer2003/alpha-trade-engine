-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "stopLossPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "triggeredByStopLoss" BOOLEAN NOT NULL DEFAULT false;

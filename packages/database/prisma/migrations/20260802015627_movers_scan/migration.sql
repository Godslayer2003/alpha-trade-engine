-- CreateTable
CREATE TABLE "MoverScan" (
    "id" TEXT NOT NULL,
    "scanDate" TEXT NOT NULL,
    "movers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoverScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoverScan_scanDate_key" ON "MoverScan"("scanDate");

-- AlterTable
ALTER TABLE "PayComponent" ADD COLUMN     "isProgressiveTax" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PayslipLine" ADD COLUMN     "isAdjustment" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION NOT NULL,
    "maxAmount" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxBracket_minAmount_key" ON "TaxBracket"("minAmount");

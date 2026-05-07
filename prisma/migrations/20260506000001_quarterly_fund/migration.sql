-- Add quarterly fund contribution column to RegionMonthlyResult
ALTER TABLE "RegionMonthlyResult" ADD COLUMN "quarterlyFundContributionCents" INTEGER NOT NULL DEFAULT 0;

-- Create QuarterlyFundDistribution table
CREATE TABLE "QuarterlyFundDistribution" (
  "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
  "regionMonthlyResultId"   UUID NOT NULL,
  "regionId"                UUID NOT NULL,
  "investorId"              UUID NOT NULL,
  "quarter"                 INTEGER NOT NULL,
  "year"                    INTEGER NOT NULL,
  "quotaCount"              INTEGER NOT NULL DEFAULT 1,
  "valuePerQuotaCents"      INTEGER NOT NULL DEFAULT 0,
  "totalDistributionCents"  INTEGER NOT NULL DEFAULT 0,
  "quarterlyFundTotalCents" INTEGER NOT NULL DEFAULT 0,
  "payoutPhase"             TEXT NOT NULL,
  "paidAt"                  TIMESTAMP(3),
  "status"                  TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuarterlyFundDistribution_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one distribution per investor per quarter per year per region
CREATE UNIQUE INDEX "QuarterlyFundDistribution_regionId_investorId_quarter_year_key"
  ON "QuarterlyFundDistribution"("regionId", "investorId", "quarter", "year");

-- Foreign keys
ALTER TABLE "QuarterlyFundDistribution"
  ADD CONSTRAINT "QuarterlyFundDistribution_regionMonthlyResultId_fkey"
    FOREIGN KEY ("regionMonthlyResultId") REFERENCES "RegionMonthlyResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuarterlyFundDistribution"
  ADD CONSTRAINT "QuarterlyFundDistribution_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuarterlyFundDistribution"
  ADD CONSTRAINT "QuarterlyFundDistribution_investorId_fkey"
    FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

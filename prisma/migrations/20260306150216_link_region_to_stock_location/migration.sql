-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "stockLocationId" UUID;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "StockLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

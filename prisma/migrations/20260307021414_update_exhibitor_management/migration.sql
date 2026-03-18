/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Exhibitor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[exhibitorId,productId]` on the table `ExhibitorInitialItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExhibitorStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DAMAGED', 'REMOVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExhibitorMaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'CLEANING', 'REPLACEMENT', 'COLLECTION', 'REINSTALLATION');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SALE', 'EXHIBITOR_INITIAL_STOCK');

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Exhibitor" ADD COLUMN     "code" TEXT,
ADD COLUMN     "lastMaintenanceAt" TIMESTAMP(3),
ADD COLUMN     "model" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ExhibitorStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "ExhibitorInitialItem" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "financialMovement" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'SALE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "exhibitorId" UUID,
ADD COLUMN     "orderId" UUID;

-- CreateTable
CREATE TABLE "ExhibitorMaintenance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exhibitorId" UUID NOT NULL,
    "userId" UUID,
    "type" "ExhibitorMaintenanceType" NOT NULL,
    "description" TEXT,
    "solution" TEXT,
    "notes" TEXT,
    "costCents" INTEGER,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExhibitorMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exhibitor_code_key" ON "Exhibitor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExhibitorInitialItem_exhibitorId_productId_key" ON "ExhibitorInitialItem"("exhibitorId", "productId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorMaintenance" ADD CONSTRAINT "ExhibitorMaintenance_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorMaintenance" ADD CONSTRAINT "ExhibitorMaintenance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

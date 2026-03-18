/*
  Warnings:

  - You are about to drop the column `address` on the `Client` table. All the data in the column will be lost.
  - The `type` column on the `Exhibitor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `updatedAt` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cpf]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cnpj]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Investor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[number]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShareOwnerType" AS ENUM ('COMPANY', 'INVESTOR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'BOLETO', 'CARD_DEBIT', 'CARD_CREDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentReceiver" AS ENUM ('REGION', 'MATRIX');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceScope" AS ENUM ('MATRIX', 'REGION');

-- CreateEnum
CREATE TYPE "FinanceCategoryType" AS ENUM ('SALES', 'INVESTMENT', 'STOCK_PURCHASE', 'LOGISTICS', 'COMMISSION', 'TAX', 'ADMINISTRATIVE', 'PAYROLL', 'RENT', 'EXHIBITOR', 'UNIFORM', 'MARKETING', 'ACCOUNTING', 'INVESTOR_DISTRIBUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestorPayoutPhase" AS ENUM ('PAYBACK', 'RECURRING');

-- CreateEnum
CREATE TYPE "RepresentativeSettlementStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID_BY_MATRIX', 'TRANSFERRED_TO_MATRIX', 'SETTLED');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "ReceiptLocation" AS ENUM ('REGION', 'MATRIX');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'TRANSFERRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ExhibitorType" AS ENUM ('FLOOR', 'ACRYLIC_CLOSED', 'ACRYLIC_OPEN', 'ACRYLIC_OPEN_SMALL');

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Share" DROP CONSTRAINT "Share_investorId_fkey";

-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "address",
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "municipalRegistration" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "personType" TEXT,
ADD COLUMN     "publicAgency" BOOLEAN,
ADD COLUMN     "registrationCode" TEXT,
ADD COLUMN     "roleCarrier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roleClient" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roleSupplier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "simpleTaxOption" BOOLEAN,
ADD COLUMN     "stateRegistration" TEXT,
ADD COLUMN     "stateRegistrationIndicator" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "suframaRegistration" TEXT,
ADD COLUMN     "tradeName" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ALTER COLUMN "regionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Exhibitor" DROP COLUMN "type",
ADD COLUMN     "type" "ExhibitorType";

-- AlterTable
ALTER TABLE "Investor" ADD COLUMN     "document" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "commissionTotalCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "paymentReceiver" "PaymentReceiver" NOT NULL DEFAULT 'REGION',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "updatedAt",
ADD COLUMN     "extraCostCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freightCostCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "packagingCostCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "purchaseCostCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxCostCents" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "priceCents" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "investmentTargetCents" INTEGER NOT NULL DEFAULT 20000000,
ADD COLUMN     "maxQuotaCount" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "quotaValueCents" INTEGER NOT NULL DEFAULT 2000000,
ALTER COLUMN "targetClients" SET DEFAULT 400;

-- AlterTable
ALTER TABLE "Share" ADD COLUMN     "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "ownerType" "ShareOwnerType" NOT NULL DEFAULT 'INVESTOR',
ALTER COLUMN "investorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "stockLocationId" UUID;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "hadSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maintenanceDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "negotiationDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextVisitDate" TIMESTAMP(3),
ADD COLUMN     "stockChecked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClientOtherContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOtherContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "stockLocationId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" "FinanceScope" NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "status" "FinanceStatus" NOT NULL DEFAULT 'PENDING',
    "category" "FinanceCategoryType" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus",
    "paymentReceiver" "PaymentReceiver",
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "regionId" UUID,
    "orderId" UUID,
    "investorId" UUID,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "competenceMonth" INTEGER,
    "competenceYear" INTEGER,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionMonthlyResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regionId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "grossRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "cmvCents" INTEGER NOT NULL DEFAULT 0,
    "logisticsCents" INTEGER NOT NULL DEFAULT 0,
    "commissionCents" INTEGER NOT NULL DEFAULT 0,
    "taxesCents" INTEGER NOT NULL DEFAULT 0,
    "administrativeCents" INTEGER NOT NULL DEFAULT 0,
    "reserveCents" INTEGER NOT NULL DEFAULT 0,
    "ebitdaCents" INTEGER NOT NULL DEFAULT 0,
    "activePdvs" INTEGER NOT NULL DEFAULT 0,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionMonthlyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorDistribution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regionMonthlyResultId" UUID NOT NULL,
    "investorId" UUID NOT NULL,
    "regionId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "quotaCount" INTEGER NOT NULL DEFAULT 1,
    "valuePerQuotaCents" INTEGER NOT NULL DEFAULT 0,
    "totalDistributionCents" INTEGER NOT NULL DEFAULT 0,
    "payoutPhase" "InvestorPayoutPhase" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "FinanceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentativeCommission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regionId" UUID NOT NULL,
    "representativeId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "grossRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "commissionCents" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "status" "FinanceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepresentativeCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentativeSettlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regionId" UUID NOT NULL,
    "representativeId" UUID,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "totalSalesPaidCents" INTEGER NOT NULL DEFAULT 0,
    "totalCommissionGeneratedCents" INTEGER NOT NULL DEFAULT 0,
    "matrixOwesRepresentativeCents" INTEGER NOT NULL DEFAULT 0,
    "representativeOwesMatrixCents" INTEGER NOT NULL DEFAULT 0,
    "netSettlementCents" INTEGER NOT NULL DEFAULT 0,
    "status" "RepresentativeSettlementStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepresentativeSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsReceivable" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "sellerId" UUID,
    "regionId" UUID,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "receivedCents" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountsReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountsReceivableId" UUID NOT NULL,
    "orderId" UUID,
    "regionId" UUID,
    "receivedById" UUID,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" "ReceiptLocation" NOT NULL,
    "externalReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransfer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiptId" UUID NOT NULL,
    "regionId" UUID,
    "transferredById" UUID,
    "amountCents" INTEGER NOT NULL,
    "transferredAt" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsReceivableInstallment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountsReceivableId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "receivedCents" INTEGER NOT NULL DEFAULT 0,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountsReceivableInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_productId_stockLocationId_key" ON "StockBalance"("productId", "stockLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionMonthlyResult_regionId_month_year_key" ON "RegionMonthlyResult"("regionId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorDistribution_regionId_investorId_month_year_key" ON "InvestorDistribution"("regionId", "investorId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RepresentativeCommission_regionId_representativeId_month_ye_key" ON "RepresentativeCommission"("regionId", "representativeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RepresentativeSettlement_regionId_weekStart_weekEnd_key" ON "RepresentativeSettlement"("regionId", "weekStart", "weekEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivableInstallment_accountsReceivableId_installm_key" ON "AccountsReceivableInstallment"("accountsReceivableId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cpf_key" ON "Client"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cnpj_key" ON "Client"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_userId_key" ON "Investor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "StockLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOtherContact" ADD CONSTRAINT "ClientOtherContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionMonthlyResult" ADD CONSTRAINT "RegionMonthlyResult_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDistribution" ADD CONSTRAINT "InvestorDistribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDistribution" ADD CONSTRAINT "InvestorDistribution_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDistribution" ADD CONSTRAINT "InvestorDistribution_regionMonthlyResultId_fkey" FOREIGN KEY ("regionMonthlyResultId") REFERENCES "RegionMonthlyResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentativeCommission" ADD CONSTRAINT "RepresentativeCommission_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentativeCommission" ADD CONSTRAINT "RepresentativeCommission_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentativeSettlement" ADD CONSTRAINT "RepresentativeSettlement_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentativeSettlement" ADD CONSTRAINT "RepresentativeSettlement_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_accountsReceivableId_fkey" FOREIGN KEY ("accountsReceivableId") REFERENCES "AccountsReceivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransfer" ADD CONSTRAINT "CashTransfer_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransfer" ADD CONSTRAINT "CashTransfer_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransfer" ADD CONSTRAINT "CashTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivableInstallment" ADD CONSTRAINT "AccountsReceivableInstallment_accountsReceivableId_fkey" FOREIGN KEY ("accountsReceivableId") REFERENCES "AccountsReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

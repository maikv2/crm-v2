CREATE TYPE "PaymentProvider" AS ENUM ('EFI');

CREATE TYPE "ExternalPaymentType" AS ENUM (
    'BOLETO',
    'BOLIX',
    'PAYMENT_LINK',
    'PIX_COBV',
    'PIX_AUTOMATIC'
);

CREATE TYPE "ExternalPaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIAL',
    'OVERDUE',
    'CANCELED',
    'EXPIRED',
    'FAILED'
);

CREATE TABLE "ExternalPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "PaymentProvider" NOT NULL DEFAULT 'EFI',
    "type" "ExternalPaymentType" NOT NULL,
    "status" "ExternalPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "orderId" UUID NOT NULL,
    "accountsReceivableId" UUID,
    "installmentId" UUID,
    "providerChargeId" TEXT,
    "txid" TEXT,
    "customId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "boletoLink" TEXT,
    "boletoPdfUrl" TEXT,
    "barcode" TEXT,
    "pixCopyPaste" TEXT,
    "pixQrCodeImage" TEXT,
    "paymentUrl" TEXT,
    "rawResponse" JSONB,
    "rawNotification" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "PaymentProvider" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'charges',
    "eventKey" TEXT NOT NULL,
    "token" TEXT,
    "type" TEXT,
    "externalPaymentId" UUID,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalPayment_provider_providerChargeId_key" ON "ExternalPayment"("provider", "providerChargeId");
CREATE INDEX "ExternalPayment_provider_customId_idx" ON "ExternalPayment"("provider", "customId");
CREATE INDEX "ExternalPayment_orderId_idx" ON "ExternalPayment"("orderId");
CREATE INDEX "ExternalPayment_accountsReceivableId_idx" ON "ExternalPayment"("accountsReceivableId");
CREATE INDEX "ExternalPayment_installmentId_idx" ON "ExternalPayment"("installmentId");
CREATE INDEX "ExternalPayment_provider_status_idx" ON "ExternalPayment"("provider", "status");

CREATE UNIQUE INDEX "PaymentWebhookEvent_eventKey_key" ON "PaymentWebhookEvent"("eventKey");
CREATE INDEX "PaymentWebhookEvent_provider_token_idx" ON "PaymentWebhookEvent"("provider", "token");
CREATE INDEX "PaymentWebhookEvent_externalPaymentId_idx" ON "PaymentWebhookEvent"("externalPaymentId");

ALTER TABLE "ExternalPayment" ADD CONSTRAINT "ExternalPayment_accountsReceivableId_fkey" FOREIGN KEY ("accountsReceivableId") REFERENCES "AccountsReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPayment" ADD CONSTRAINT "ExternalPayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "AccountsReceivableInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPayment" ADD CONSTRAINT "ExternalPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_externalPaymentId_fkey" FOREIGN KEY ("externalPaymentId") REFERENCES "ExternalPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommissionPaymentConfirmation" (
    "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    "representativeId"     UUID         NOT NULL,
    "regionId"             UUID,
    "weekStart"            TIMESTAMP(3) NOT NULL,
    "weekEnd"              TIMESTAMP(3) NOT NULL,
    "amountCents"          INTEGER      NOT NULL DEFAULT 0,
    "pendingCents"         INTEGER      NOT NULL DEFAULT 0,
    "ordersCount"          INTEGER      NOT NULL DEFAULT 0,
    "tokenHash"            TEXT         NOT NULL,
    "tokenExpiresAt"       TIMESTAMP(3) NOT NULL,
    "status"               TEXT         NOT NULL DEFAULT 'PENDING',
    "description"          TEXT         NOT NULL DEFAULT '',
    "metadata"             JSONB,
    "confirmedAt"          TIMESTAMP(3),
    "financeTransactionId" UUID,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPaymentConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionPaymentConfirmation_representativeId_weekStart_weekEnd_key"
    ON "CommissionPaymentConfirmation"("representativeId", "weekStart", "weekEnd");

-- AddForeignKey
ALTER TABLE "CommissionPaymentConfirmation"
    ADD CONSTRAINT "CommissionPaymentConfirmation_representativeId_fkey"
    FOREIGN KEY ("representativeId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPaymentConfirmation"
    ADD CONSTRAINT "CommissionPaymentConfirmation_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "Region"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPaymentConfirmation"
    ADD CONSTRAINT "CommissionPaymentConfirmation_financeTransactionId_fkey"
    FOREIGN KEY ("financeTransactionId") REFERENCES "FinanceTransaction"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

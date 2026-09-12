-- Integração ecommerce (site v2-storefront) -> CRM.
-- Só ADICIONA colunas novas em PortalOrderRequest, todas opcionais ou com
-- DEFAULT — nenhuma coluna existente é alterada/removida, nenhuma linha é
-- apagada. Seguro rodar em cima dos dados que já existem.

ALTER TABLE "PortalOrderRequest"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'portal',
  ADD COLUMN "requestedPaymentMethod" "PaymentMethod",
  ADD COLUMN "requestedInstallments" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "isCashOnDelivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customPlanRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "convertedOrderId" UUID;

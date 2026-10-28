-- Solicitacoes de expositor novo (acrilico ou ferro; chao, balcao ou parede)
-- feitas pelo vendedor, com data prevista para levar ao cliente.
-- Apenas cria uma tabela nova: nenhum dado existente e alterado ou apagado.

-- CreateTable
CREATE TABLE "ExhibitorRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" SERIAL NOT NULL,
    "clientId" UUID NOT NULL,
    "regionId" UUID,
    "requestedById" UUID,
    "material" TEXT NOT NULL,
    "mounting" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expectedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "whatsappSentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExhibitorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExhibitorRequest_number_key" ON "ExhibitorRequest"("number");

-- CreateIndex
CREATE INDEX "ExhibitorRequest_status_expectedAt_idx" ON "ExhibitorRequest"("status", "expectedAt");

-- CreateIndex
CREATE INDEX "ExhibitorRequest_clientId_idx" ON "ExhibitorRequest"("clientId");

-- CreateIndex
CREATE INDEX "ExhibitorRequest_regionId_idx" ON "ExhibitorRequest"("regionId");

-- AddForeignKey
ALTER TABLE "ExhibitorRequest" ADD CONSTRAINT "ExhibitorRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorRequest" ADD CONSTRAINT "ExhibitorRequest_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorRequest" ADD CONSTRAINT "ExhibitorRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


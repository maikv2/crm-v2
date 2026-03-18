-- CreateTable
CREATE TABLE "ExhibitorInitialItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exhibitorId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExhibitorInitialItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExhibitorInitialItem" ADD CONSTRAINT "ExhibitorInitialItem_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitorInitialItem" ADD CONSTRAINT "ExhibitorInitialItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

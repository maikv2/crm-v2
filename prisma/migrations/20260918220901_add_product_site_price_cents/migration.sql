-- Preco de atacado da loja online (v2distribuidora.com), separado do
-- priceCents usado em pedidos normais/consignacao com expositores.
-- Coluna nova, opcional (nullable) - nao altera nem apaga nada existente.

ALTER TABLE "Product"
  ADD COLUMN "sitePriceCents" INTEGER;

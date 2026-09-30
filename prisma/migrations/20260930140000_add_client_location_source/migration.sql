-- De onde veio a localizacao do cliente no mapa: MANUAL (marcada por uma
-- pessoa), ADDRESS (achada pelo endereco com precisao de rua) ou
-- APPROXIMATE (so bairro/cidade/CEP - aparece em "Clientes para ajustar").
-- Coluna nova e opcional: clientes existentes ficam sem valor, nada e
-- alterado ou apagado.

ALTER TABLE "Client"
  ADD COLUMN "locationSource" TEXT;

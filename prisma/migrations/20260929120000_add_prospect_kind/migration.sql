-- Tipo do ponto no mapa comercial: PROSPECT (prospecto, amarelo) ou
-- EXHIBITOR ("levar expositor", verde). Coluna nova com valor padrao -
-- todos os prospectos existentes ficam como PROSPECT, nada e alterado ou
-- apagado.

ALTER TABLE "Prospect"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PROSPECT';

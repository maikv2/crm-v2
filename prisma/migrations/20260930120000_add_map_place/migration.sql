-- Estabelecimentos para prospeccao no mapa comercial, importados da base
-- aberta Overture Maps (scripts/import-map-places.py). Tabela nova, so
-- cache de dados publicos - nao altera nem apaga nada existente.

CREATE TABLE "MapPlace" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "phone" TEXT,
  "street" TEXT,
  "city" TEXT,
  "state" TEXT,
  "cep" TEXT,
  "source" TEXT NOT NULL DEFAULT 'overture',
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MapPlace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MapPlace_latitude_longitude_idx" ON "MapPlace"("latitude", "longitude");
CREATE INDEX "MapPlace_state_idx" ON "MapPlace"("state");

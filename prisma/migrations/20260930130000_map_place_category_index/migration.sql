-- Busca do mapa sempre filtra por tipo + area: indice por tipo e coordenada
-- (so indice novo, nao altera dados).

CREATE INDEX "MapPlace_category_latitude_longitude_idx" ON "MapPlace"("category", "latitude", "longitude");

"""
Importa estabelecimentos da base aberta e gratuita Overture Maps
(https://overturemaps.org - dados da Meta, Microsoft, OpenStreetMap e outros,
licenca CDLA Permissive 2.0) para a tabela "MapPlace" do CRM. Sao os
pontinhos vermelhos do mapa comercial.

So grava na tabela MapPlace (cache de dados publicos). Nao mexe em clientes,
prospectos nem em nenhuma outra tabela.

Requisitos: Python 3 com duckdb  ->  python -m pip install duckdb

Uso (na pasta do CRM):
  python scripts/import-map-places.py              # Brasil inteiro
  python scripts/import-map-places.py SC PR RS     # so esses estados
  python scripts/import-map-places.py --dry-run SC # so conta, nao grava

Rodar de novo atualiza: insere os novos, atualiza os existentes e remove os
que sairam da base (fecharam) nos estados importados.
"""

import os
import re
import sys
import time
import urllib.request

import duckdb

BRAZIL_BBOX = (-74.1, -33.8, -34.7, 5.3)  # oeste, sul, leste, norte

UFS = {
    "AC": "acre", "AL": "alagoas", "AP": "amapa", "AM": "amazonas", "BA": "bahia",
    "CE": "ceara", "DF": "distrito federal", "ES": "espirito santo", "GO": "goias",
    "MA": "maranhao", "MT": "mato grosso", "MS": "mato grosso do sul",
    "MG": "minas gerais", "PA": "para", "PB": "paraiba", "PR": "parana",
    "PE": "pernambuco", "PI": "piaui", "RJ": "rio de janeiro",
    "RN": "rio grande do norte", "RS": "rio grande do sul", "RO": "rondonia",
    "RR": "roraima", "SC": "santa catarina", "SP": "sao paulo", "SE": "sergipe",
    "TO": "tocantins",
}

# Tipos do Overture que interessam (restaurantes entram pela hierarquia).
SOURCE_CATEGORIES = [
    "pharmacy", "drugstore", "gas_station", "bakery", "mobile_phone_store",
    "computer_store", "electronics_store", "bookstore", "book_store",
    "liquor_store", "beer_wine_and_spirits", "beverage_store", "grocery_store",
    "supermarket", "convenience_store", "farmers_market",
]


def read_database_url():
    url = os.environ.get("DATABASE_URL")
    if not url and os.path.exists(".env"):
        for line in open(".env", encoding="utf-8"):
            m = re.match(r'^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?', line)
            if m:
                url = m.group(1).strip()
    if not url:
        sys.exit("DATABASE_URL nao encontrado (.env). Rode o script na pasta do CRM.")
    # O driver do DuckDB nao entende parametros extras do Prisma.
    return re.sub(r"[?&](pgbouncer|connection_limit|schema)=[^&]*", "", url)


def latest_release():
    listing = urllib.request.urlopen(
        "https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/",
        timeout=30,
    ).read().decode()
    releases = re.findall(r"<Prefix>release/([^<]+)/</Prefix>", listing)
    if not releases:
        sys.exit("Nao consegui descobrir a versao mais recente do Overture.")
    return sorted(releases)[-1]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry_run = "--dry-run" in sys.argv
    states = [a.upper() for a in args]
    invalid = [s for s in states if s not in UFS]
    if invalid:
        sys.exit(f"UF invalida: {', '.join(invalid)}")

    release = latest_release()
    print(f"Overture {release} | estados: {', '.join(states) if states else 'Brasil inteiro'}")

    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")

    west, south, east, north = BRAZIL_BBOX
    state_case = "CASE " + " ".join(
        f"WHEN upper(r) = '{uf}' OR r_norm = '{name}' THEN '{uf}'" for uf, name in UFS.items()
    ) + " END"
    cats = ", ".join(f"'{c}'" for c in SOURCE_CATEGORIES)

    started = time.time()
    con.execute(f"""
      CREATE TABLE raw AS
      SELECT id,
             names.primary AS name,
             taxonomy.primary AS cat,
             taxonomy.hierarchy AS hier,
             bbox.ymin AS latitude,
             bbox.xmin AS longitude,
             phones[1] AS phone,
             addresses[1].freeform AS street,
             addresses[1].locality AS city,
             addresses[1].region AS r,
             strip_accents(lower(coalesce(addresses[1].region, ''))) AS r_norm,
             addresses[1].postcode AS cep
      FROM read_parquet('s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*', hive_partitioning=1)
      WHERE bbox.xmin BETWEEN {west} AND {east}
        AND bbox.ymin BETWEEN {south} AND {north}
        AND addresses[1].country = 'BR'
        AND coalesce(operating_status, 'open') <> 'permanently_closed'
        AND (taxonomy.primary IN ({cats})
             OR list_contains(taxonomy.hierarchy, 'restaurant')
             OR taxonomy.primary LIKE '%restaurant%')
    """)

    # Classifica nos tipos do CRM (mesma logica do OpenStreetMap: nome pesa -
    # "Mercado X" cadastrado como supermercado, tele bier como bebidas etc).
    con.execute(f"""
      CREATE TABLE places AS
      WITH n AS (
        SELECT *, strip_accents(lower(coalesce(name, ''))) AS nm,
               cat IN ('grocery_store', 'supermarket', 'farmers_market', 'convenience_store') AS food
        FROM raw
      )
      SELECT id,
        CASE
          WHEN cat IN ('pharmacy', 'drugstore') THEN 'PHARMACY'
          WHEN cat = 'gas_station' THEN 'FUEL'
          WHEN cat = 'bakery' THEN 'BAKERY'
          WHEN cat = 'mobile_phone_store' THEN 'PHONE'
          WHEN cat IN ('computer_store', 'electronics_store') THEN 'COMPUTER'
          WHEN cat IN ('bookstore', 'book_store') THEN 'BOOKS'
          WHEN regexp_matches(nm, 'tele\\s*-?\\s*(bier|beer|bebida|cerveja|gelada)|disk\\s*-?\\s*(bebida|cerveja)|distribuidora? de bebida')
               OR cat IN ('liquor_store', 'beer_wine_and_spirits', 'beverage_store') THEN 'TELEBIER'
          WHEN food AND nm LIKE '%armazem%' THEN 'WAREHOUSE'
          WHEN food AND regexp_matches(nm, 'supermercad|hipermercad|\\bsuper\\b|atacad') THEN 'SUPERMARKET'
          WHEN food AND regexp_matches(nm, 'mercad|mercearia|fruteira|hortifruti') THEN 'MARKET'
          WHEN cat = 'supermarket' THEN 'SUPERMARKET'
          WHEN cat = 'convenience_store' THEN 'CONVENIENCE'
          WHEN food THEN 'MARKET'
          WHEN list_contains(hier, 'restaurant') OR cat LIKE '%restaurant%' THEN 'RESTAURANT'
        END AS category,
        nullif(trim(name), '') AS name,
        latitude, longitude,
        -- Telefone sem o +55 (mesmo padrao dos cadastros do CRM)
        CASE
          WHEN regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = '' THEN NULL
          WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '55%' AND length(regexp_replace(phone, '\\D', '', 'g')) IN (12, 13)
            THEN substr(regexp_replace(phone, '\\D', '', 'g'), 3)
          ELSE regexp_replace(phone, '\\D', '', 'g')
        END AS phone,
        nullif(trim(street), '') AS street,
        nullif(trim(city), '') AS city,
        {state_case} AS state,
        nullif(regexp_replace(coalesce(cep, ''), '\\D', '', 'g'), '') AS cep
      FROM n
    """)
    con.execute("DELETE FROM places WHERE category IS NULL")
    if states:
        con.execute(f"DELETE FROM places WHERE state IS NULL OR state NOT IN ({', '.join(repr(s) for s in states)})")

    total = con.execute("SELECT count(*) FROM places").fetchone()[0]
    print(f"Extraidos {total} estabelecimentos em {time.time() - started:.0f}s")
    for cat, n in con.execute("SELECT category, count(*) FROM places GROUP BY 1 ORDER BY 2 DESC").fetchall():
        print(f"  {cat:12} {n}")

    if dry_run:
        print("--dry-run: nada foi gravado.")
        return

    print("Gravando no banco do CRM...")
    con.execute("INSTALL postgres; LOAD postgres;")
    con.execute(f"ATTACH '{read_database_url()}' AS pg (TYPE postgres)")

    con.execute("CALL postgres_execute('pg', 'DROP TABLE IF EXISTS \"MapPlaceImport\"')")
    con.execute("""
      CALL postgres_execute('pg', 'CREATE TABLE "MapPlaceImport" (
        id TEXT, category TEXT, name TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
        phone TEXT, street TEXT, city TEXT, state TEXT, cep TEXT)')
    """)
    con.execute("INSERT INTO pg.public.\"MapPlaceImport\" SELECT * FROM places")

    con.execute("""
      CALL postgres_execute('pg', '
        INSERT INTO "MapPlace" (id, category, name, latitude, longitude, phone, street, city, state, cep, source, "importedAt")
        SELECT DISTINCT ON (id) id, category, name, latitude, longitude, phone, street, city, state, cep, ''overture'', now()
        FROM "MapPlaceImport"
        ON CONFLICT (id) DO UPDATE SET
          category = EXCLUDED.category, name = EXCLUDED.name,
          latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
          phone = EXCLUDED.phone, street = EXCLUDED.street, city = EXCLUDED.city,
          state = EXCLUDED.state, cep = EXCLUDED.cep, source = EXCLUDED.source,
          "importedAt" = EXCLUDED."importedAt"')
    """)

    # Remove os que sairam da base (fecharam) - so nos estados importados.
    # Todos os gravados agora ficaram com o mesmo "importedAt" (now() do
    # banco numa unica instrucao), entao o que for mais antigo saiu da base.
    scope = (
        "state IN (" + ", ".join(f"''{s}''" for s in states) + ")" if states else "TRUE"
    )
    con.execute(
        f"CALL postgres_execute('pg', 'DELETE FROM \"MapPlace\" WHERE source = ''overture'' "
        f"AND \"importedAt\" < (SELECT max(\"importedAt\") FROM \"MapPlace\" WHERE source = ''overture'') "
        f"AND {scope}')"
    )
    con.execute("CALL postgres_execute('pg', 'DROP TABLE IF EXISTS \"MapPlaceImport\"')")

    count = con.execute('SELECT count(*) FROM pg.public."MapPlace"').fetchone()[0]
    print(f"Pronto em {time.time() - started:.0f}s. Total na tabela MapPlace: {count}")


if __name__ == "__main__":
    main()

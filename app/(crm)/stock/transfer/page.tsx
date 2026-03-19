"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type ThemeShape = ReturnType<typeof getThemeColors>;

type ProductItem = {
  id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  active?: boolean;
};

type LocationItem = {
  id: string;
  name: string;
};

type RegionItem = {
  id: string;
  name: string;
  stockLocationId?: string | null;
};

type StockProductRow = {
  id: string;
  name: string;
  stock?: Record<string, number>;
  total?: number;
};

type StockResponse = {
  locations?: LocationItem[];
  regions?: RegionItem[];
  matrixLocationId?: string | null;
  matrixLocationName?: string | null;
  products?: StockProductRow[];
};

type TransferItem = {
  productId: string;
  quantity: number;
};

function readJsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function ActionButton({
  label,
  theme,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : theme.primary
    : hover
      ? theme.primary
      : theme.cardBg;

  const color = hover || primary ? "#ffffff" : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 38,
        padding: "0 14px",
        borderRadius: 10,
        border: primary ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
        background,
        color,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Card({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
      </div>

      {children}
    </div>
  );
}

export default function StockTransferPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [matrixLocationId, setMatrixLocationId] = useState<string | null>(null);
  const [stockProducts, setStockProducts] = useState<StockProductRow[]>([]);

  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<TransferItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [productsRes, stockRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/stock", { cache: "no-store" }),
        ]);

        const productsText = await productsRes.text();
        const stockText = await stockRes.text();

        const productsData = readJsonSafe(productsText);
        const stockData = (readJsonSafe(stockText) ?? {}) as StockResponse;

        if (!productsRes.ok) {
          throw new Error(
            (productsData as { error?: string } | null)?.error ||
              "Erro ao carregar produtos."
          );
        }

        if (!stockRes.ok) {
          throw new Error(
            (stockData as { error?: string } | null)?.error ||
              "Erro ao carregar estoque."
          );
        }

        setProducts(Array.isArray(productsData) ? productsData : []);
        setLocations(Array.isArray(stockData.locations) ? stockData.locations : []);
        setRegions(Array.isArray(stockData.regions) ? stockData.regions : []);
        setMatrixLocationId(stockData.matrixLocationId ?? null);
        setStockProducts(Array.isArray(stockData.products) ? stockData.products : []);
      } catch (error: any) {
        alert(error?.message || "Erro ao carregar dados da transferência.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const selectedFromLocation = useMemo(
    () => locations.find((location) => location.id === fromLocationId) ?? null,
    [locations, fromLocationId]
  );

  const selectedToLocation = useMemo(
    () => locations.find((location) => location.id === toLocationId) ?? null,
    [locations, toLocationId]
  );

  const stockByProductId = useMemo(() => {
    const map = new Map<string, StockProductRow>();
    for (const item of stockProducts) {
      map.set(item.id, item);
    }
    return map;
  }, [stockProducts]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [items]);

  const locationStockKeyMap = useMemo(() => {
    const map = new Map<string, string>();

    if (matrixLocationId) {
      map.set(matrixLocationId, `matrix:${matrixLocationId}`);
    }

    for (const region of regions) {
      if (region.stockLocationId) {
        map.set(region.stockLocationId, `region:${region.id}`);
      }
    }

    return map;
  }, [matrixLocationId, regions]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      if (product.active === false) return false;

      if (!q) return true;

      const haystack = [product.name ?? "", product.sku ?? "", product.category ?? ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [products, search]);

  function getAvailableStock(productId: string) {
    if (!fromLocationId) return 0;

    const stockKey = locationStockKeyMap.get(fromLocationId);
    if (!stockKey) return 0;

    return stockByProductId.get(productId)?.stock?.[stockKey] ?? 0;
  }

  function addProduct(productId: string) {
    const available = getAvailableStock(productId);

    if (available <= 0) {
      alert("Esse produto não possui saldo disponível na origem selecionada.");
      return;
    }

    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);

      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(item.quantity + 1, available) }
            : item
        );
      }

      return [...current, { productId, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    const available = getAvailableStock(productId);
    const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, available));

    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: safeQuantity } : item
      )
    );
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  async function save() {
    if (!fromLocationId || !toLocationId) {
      alert("Selecione a origem e o destino.");
      return;
    }

    if (fromLocationId === toLocationId) {
      alert("Origem e destino não podem ser iguais.");
      return;
    }

    if (!items.length) {
      alert("Adicione pelo menos um produto à transferência.");
      return;
    }

    for (const item of items) {
      const available = getAvailableStock(item.productId);

      if (item.quantity <= 0) {
        alert("Existe item com quantidade inválida.");
        return;
      }

      if (item.quantity > available) {
        const productName =
          products.find((product) => product.id === item.productId)?.name || "Produto";
        alert(
          `Saldo insuficiente para ${productName}. Disponível na origem: ${available}.`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const res = await fetch("/api/stock-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromLocationId,
          toLocationId,
          note,
          items,
        }),
      });

      const text = await res.text();
      const data = readJsonSafe(text) as
        | { error?: string; details?: string }
        | null;

      if (!res.ok) {
        alert(
          `Erro ao transferir estoque: ${
            data?.error || data?.details || text || "Erro desconhecido."
          }`
        );
        return;
      }

      router.push("/stock");
    } catch (error: any) {
      alert(error?.message || "Erro ao transferir estoque.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 28,
          color: theme.text,
          background: theme.pageBg,
          minHeight: "100%",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 28,
        color: theme.text,
        background: theme.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Estoque / Transferência
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Transferência de Estoque
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Transfira vários produtos da origem para o destino em uma única operação.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton
            label="Cancelar"
            theme={theme}
            onClick={() => router.back()}
            disabled={saving}
          />
          <ActionButton
            label={saving ? "Transferindo..." : "Salvar transferência"}
            theme={theme}
            onClick={save}
            disabled={saving}
            primary
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 18,
          maxWidth: 1200,
        }}
      >
        <Card title="Origem e destino" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <label style={label(theme)}>Origem</label>
              <select
                value={fromLocationId}
                onChange={(e) => {
                  setFromLocationId(e.target.value);
                  setItems([]);
                }}
                style={input(theme, inputBg)}
              >
                <option value="">Selecione a origem</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label(theme)}>Destino</label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                style={input(theme, inputBg)}
              >
                <option value="">Selecione o destino</option>
                {locations
                  .filter((location) => location.id !== fromLocationId)
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={label(theme)}>Observação geral</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={textarea(theme, inputBg)}
              placeholder="Descreva a transferência"
            />
          </div>
        </Card>

        <Card title="Catálogo de produtos" theme={theme}>
          <div style={{ marginBottom: 14 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU ou categoria"
              style={input(theme, inputBg)}
            />
          </div>

          {!fromLocationId ? (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: subtleCard,
                color: theme.subtext,
                fontWeight: 700,
              }}
            >
              Selecione a origem para ver e adicionar os produtos disponíveis.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {filteredProducts.map((product) => {
                const available = getAvailableStock(product.id);
                const addedQty = itemsMap.get(product.id) ?? 0;

                return (
                  <div
                    key={product.id}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      padding: 14,
                      background: subtleCard,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        height: 140,
                        borderRadius: 12,
                        border: `1px solid ${theme.border}`,
                        background: theme.cardBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: theme.subtext,
                            fontWeight: 700,
                          }}
                        >
                          Sem imagem
                        </div>
                      )}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {product.name}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: theme.subtext,
                        }}
                      >
                        {product.sku || "-"} {product.category ? `• ${product.category}` : ""}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: available > 0 ? "#16a34a" : "#ef4444",
                      }}
                    >
                      Saldo na origem: {available}
                    </div>

                    {addedQty > 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: theme.primary,
                        }}
                      >
                        Adicionado: {addedQty}
                      </div>
                    ) : null}

                    <ActionButton
                      label={available > 0 ? "Adicionar" : "Sem saldo"}
                      theme={theme}
                      onClick={() => addProduct(product.id)}
                      disabled={available <= 0}
                      primary={available > 0}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Itens da transferência" theme={theme}>
          {!items.length ? (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: subtleCard,
                color: theme.subtext,
                fontWeight: 700,
              }}
            >
              Nenhum produto adicionado ainda.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                const available = getAvailableStock(item.productId);

                return (
                  <div
                    key={item.productId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 120px 120px",
                      gap: 12,
                      alignItems: "center",
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      padding: 14,
                      background: subtleCard,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {product?.name || "Produto"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: theme.subtext,
                        }}
                      >
                        Saldo disponível na origem: {available}
                      </div>
                    </div>

                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, available)}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, Number(e.target.value))
                      }
                      style={input(theme, inputBg)}
                    />

                    <ActionButton
                      label="Remover"
                      theme={theme}
                      onClick={() => removeItem(item.productId)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: subtleCard,
              color: theme.text,
              fontWeight: 700,
            }}
          >
            Origem: {selectedFromLocation?.name || "-"}
            <br />
            Destino: {selectedToLocation?.name || "-"}
            <br />
            Total de itens: {items.length}
          </div>
        </Card>
      </div>
    </div>
  );
}

function label(theme: ThemeShape): React.CSSProperties {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    color: theme.text,
    fontSize: 14,
  };
}

function input(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };
}

function textarea(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };
}
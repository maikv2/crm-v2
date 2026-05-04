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

type StockResponse = {
  locations?: LocationItem[];
  regions?: RegionItem[];
  matrixLocationId?: string | null;
  matrixLocationName?: string | null;
};

type EntryItem = {
  productId: string;
  quantity: number;
};

function readJsonSafe(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}

function findMatrixLocation(stockData: StockResponse) {
  const locations = Array.isArray(stockData?.locations) ? stockData.locations : [];
  const regions = Array.isArray(stockData?.regions) ? stockData.regions : [];

  if (stockData?.matrixLocationId) {
    const byId = locations.find((l) => l.id === stockData.matrixLocationId);
    if (byId) return byId;
  }

  if (stockData?.matrixLocationName) {
    const norm = String(stockData.matrixLocationName).trim().toLowerCase();
    const byName = locations.find((l) => String(l?.name ?? "").trim().toLowerCase() === norm);
    if (byName) return byName;
  }

  const regionStockIds = new Set(
    regions.map((r) => r.stockLocationId).filter((v): v is string => Boolean(v))
  );
  const nonRegional = locations.find((l) => !regionStockIds.has(l.id));
  if (nonRegional) return nonRegional;

  const normalized = locations.map((l) => ({ ...l, _name: String(l?.name ?? "").trim().toLowerCase() }));
  return (
    normalized.find((l) => l._name === "matriz") ||
    normalized.find((l) => l._name.includes("matriz")) ||
    null
  );
}

function ActionButton({ label, theme, onClick, disabled, primary = false }: {
  label: string; theme: ThemeShape; onClick?: () => void; disabled?: boolean; primary?: boolean;
}) {
  const [hover, setHover] = useState(false);
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
        background: primary ? (hover ? "#1d4ed8" : theme.primary) : (hover ? theme.primary : theme.cardBg),
        color: hover || primary ? "#ffffff" : theme.text,
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

function Card({ title, children, theme }: { title: string; children: React.ReactNode; theme: ThemeShape }) {
  return (
    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 18, padding: 22, boxShadow: theme.isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: theme.text, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function inputStyle(theme: ThemeShape): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.isDark ? "#0f172a" : "#ffffff",
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };
}

function textareaStyle(theme: ThemeShape): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.isDark ? "#0f172a" : "#ffffff",
    color: theme.text,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };
}

function labelStyle(theme: ThemeShape): React.CSSProperties {
  return { display: "block", marginBottom: 8, fontWeight: 700, color: theme.text, fontSize: 14 };
}

export default function NewStockEntryPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [matrixLocation, setMatrixLocation] = useState<LocationItem | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<EntryItem[]>([]);
  const [inputQtys, setInputQtys] = useState<Record<string, number>>({});
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

        if (!productsRes.ok) throw new Error((productsData as any)?.error ?? "Erro ao carregar produtos.");
        if (!stockRes.ok) throw new Error((stockData as any)?.error ?? "Erro ao carregar estoque.");

        const matrix = findMatrixLocation(stockData);
        if (!matrix) throw new Error("Não foi possível identificar o estoque central da Matriz.");

        const productList: ProductItem[] = Array.isArray((productsData as any)?.items)
          ? (productsData as any).items
          : Array.isArray(productsData) ? productsData : [];

        setProducts(productList.filter((p) => p.active !== false));
        setMatrixLocation(matrix);
      } catch (e: any) {
        alert(e?.message || "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const itemsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.productId, item.quantity);
    return map;
  }, [items]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name ?? "", p.sku ?? "", p.category ?? ""].join(" ").toLowerCase().includes(q)
    );
  }, [products, search]);

  function addProduct(productId: string) {
    const qty = Math.max(1, Math.floor(Number(inputQtys[productId] ?? 1)));
    setItems((curr) => {
      const existing = curr.find((i) => i.productId === productId);
      if (existing) {
        return curr.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...curr, { productId, quantity: qty }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    const safe = Math.max(1, Math.floor(Number(quantity) || 1));
    setItems((curr) => curr.map((i) => i.productId === productId ? { ...i, quantity: safe } : i));
  }

  function removeItem(productId: string) {
    setItems((curr) => curr.filter((i) => i.productId !== productId));
  }

  async function save() {
    if (!matrixLocation?.id) {
      alert("Não foi possível identificar o estoque central da Matriz.");
      return;
    }
    if (!items.length) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/stock-entry-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockLocationId: matrixLocation.id, note, items }),
      });

      const text = await res.text();
      const data = readJsonSafe(text) as { error?: string; details?: string } | null;

      if (!res.ok) {
        alert(`Erro: ${data?.details || data?.error || "Erro desconhecido."}`);
        return;
      }

      router.push("/stock");
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar entrada.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 28, color: theme.text, background: theme.pageBg, minHeight: "100%" }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ padding: 28, color: theme.text, background: theme.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.subtext, marginBottom: 10 }}>
            🏠 / Estoque / Nova entrada
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Entrada de Estoque</div>
          <div style={{ marginTop: 6, fontSize: 13, color: theme.subtext }}>
            Destino automático: <strong>{matrixLocation?.name ?? "Matriz"}</strong>. Adicione vários produtos de uma vez.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton label="Cancelar" theme={theme} onClick={() => router.back()} disabled={saving} />
          <ActionButton label={saving ? "Salvando..." : `Salvar entrada (${items.length})`} theme={theme} onClick={save} disabled={saving || !items.length} primary />
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 1200 }}>
        {/* Observação */}
        <Card title="Observação geral" theme={theme}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={textareaStyle(theme)}
            placeholder="Descreva a entrada de estoque (opcional)"
          />
        </Card>

        {/* Catálogo */}
        <Card title="Catálogo de produtos" theme={theme}>
          <div style={{ marginBottom: 14 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU ou categoria"
              style={inputStyle(theme)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {filteredProducts.map((product) => {
              const addedQty = itemsMap.get(product.id) ?? 0;
              const typedQty = inputQtys[product.id] ?? 1;

              return (
                <div
                  key={product.id}
                  style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, background: subtleCard, display: "grid", gap: 10 }}
                >
                  {/* Image */}
                  <div style={{ height: 140, borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ fontSize: 12, color: theme.subtext, fontWeight: 700 }}>Sem imagem</div>
                    )}
                  </div>

                  {/* Name + SKU */}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>{product.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: theme.subtext }}>
                      {product.sku || "-"}{product.category ? ` • ${product.category}` : ""}
                    </div>
                  </div>

                  {/* Added badge */}
                  {addedQty > 0 && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.primary }}>
                      ✓ Adicionado: {addedQty} un
                    </div>
                  )}

                  {/* Qty + button */}
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={typedQty}
                      onChange={(e) => {
                        const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        setInputQtys((curr) => ({ ...curr, [product.id]: v }));
                      }}
                      style={{ ...inputStyle(theme), height: 38, padding: "0 10px", fontSize: 13 }}
                    />
                    <ActionButton
                      label="Adicionar"
                      theme={theme}
                      onClick={() => addProduct(product.id)}
                      primary
                    />
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", color: theme.subtext, fontWeight: 700 }}>
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        </Card>

        {/* Items list */}
        <Card title={`Itens da entrada (${items.length})`} theme={theme}>
          {!items.length ? (
            <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${theme.border}`, background: subtleCard, color: theme.subtext, fontWeight: 700 }}>
              Nenhum produto adicionado ainda. Use o catálogo acima.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    style={{ display: "grid", gridTemplateColumns: "2fr 120px 120px", gap: 12, alignItems: "center", border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, background: subtleCard }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>
                      {product?.name || "Produto"}
                    </div>

                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                      style={inputStyle(theme)}
                    />

                    <ActionButton label="Remover" theme={theme} onClick={() => removeItem(item.productId)} />
                  </div>
                );
              })}

              <div style={{ marginTop: 4, padding: 14, borderRadius: 12, border: `1px solid ${theme.border}`, background: subtleCard, color: theme.text, fontWeight: 700 }}>
                Destino: {matrixLocation?.name ?? "Matriz"} &nbsp;·&nbsp;
                Total de produtos: {items.length} &nbsp;·&nbsp;
                Total de unidades: {items.reduce((s, i) => s + i.quantity, 0)}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

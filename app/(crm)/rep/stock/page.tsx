"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId?: string | null;
  stockLocationId?: string | null;
};

type StockLocationItem = {
  id: string;
  name: string;
  active?: boolean;
};

type RegionItem = {
  id: string;
  name: string;
  stockLocationId?: string | null;
};

type StockProductItem = {
  id: string;
  name: string;
  stock: Record<string, number>;
  total: number;
};

type StockResponse = {
  locations?: StockLocationItem[];
  regions?: RegionItem[];
  products?: StockProductItem[];
};

function getRepresentativeLocationId(
  user: LoggedUser | null,
  regions: RegionItem[],
  locations: StockLocationItem[]
) {
  if (user?.stockLocationId) {
    return user.stockLocationId;
  }

  if (user?.regionId) {
    const region = regions.find((item) => item.id === user.regionId);
    if (region?.stockLocationId) {
      return region.stockLocationId;
    }
  }

  const matriz =
    locations.find((item) => item.name?.trim().toLowerCase() === "matriz") ??
    null;

  return matriz?.id ?? null;
}

export default function RepStockPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [user, setUser] = useState<LoggedUser | null>(null);
  const [regionName, setRegionName] = useState<string>("");
  const [stockLocationName, setStockLocationName] = useState<string>("");

  const [products, setProducts] = useState<StockProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [authRes, stockRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/stock", { cache: "no-store" }),
      ]);

      const authJson = await authRes.json().catch(() => null);
      const stockJson = await stockRes.json().catch(() => null);

      if (!authRes.ok) {
        throw new Error(authJson?.error || "Erro ao carregar usuário.");
      }

      if (!stockRes.ok) {
        throw new Error(stockJson?.error || "Erro ao carregar estoque.");
      }

      const currentUser = authJson?.user as LoggedUser | null;
      const stockData = stockJson as StockResponse;

      const regions = Array.isArray(stockData?.regions) ? stockData.regions : [];
      const locations = Array.isArray(stockData?.locations)
        ? stockData.locations
        : [];
      const allProducts = Array.isArray(stockData?.products)
        ? stockData.products
        : [];

      setUser(currentUser);

      const representativeLocationId = getRepresentativeLocationId(
        currentUser,
        regions,
        locations
      );

      const representativeLocation = locations.find(
        (item) => item.id === representativeLocationId
      );

      const currentRegion = regions.find(
        (item) => item.id === currentUser?.regionId
      );

      setRegionName(currentRegion?.name || "Sem região vinculada");
      setStockLocationName(
        representativeLocation?.name || "Sem estoque vinculado"
      );

      if (!representativeLocationId) {
        setProducts([]);
        return;
      }

      const filteredProducts = allProducts.map((product) => ({
        id: product.id,
        name: product.name,
        total: Number(product.stock?.[`region:${currentUser?.regionId}`] ?? product.stock?.[`matrix:${representativeLocationId}`] ?? product.stock?.[`location:${representativeLocationId}`] ?? product.stock?.[representativeLocationId] ?? 0),
        stock: product.stock ?? {},
      }));

      const resolvedProducts = filteredProducts.map((product) => {
        let qty = 0;

        if (currentUser?.regionId) {
          qty = Number(product.stock?.[`region:${currentUser.regionId}`] ?? 0);
        }

        if (!qty) {
          qty = Number(product.stock?.[`matrix:${representativeLocationId}`] ?? 0);
        }

        if (!qty) {
          qty = Number(product.stock?.[`location:${representativeLocationId}`] ?? 0);
        }

        if (!qty) {
          qty = Number(product.stock?.[representativeLocationId] ?? 0);
        }

        return {
          ...product,
          total: qty,
        };
      });

      setProducts(resolvedProducts);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar estoque.");
      setProducts([]);
      setRegionName("");
      setStockLocationName("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return products
      .filter((item) => {
        if (!normalized) return true;
        return String(item.name ?? "").toLowerCase().includes(normalized);
      })
      .sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR")
      );
  }, [products, search]);

  const totalQty = useMemo(() => {
    return filteredProducts.reduce((sum, item) => sum + (item.total ?? 0), 0);
  }, [filteredProducts]);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando estoque...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
            Estoque da Região
          </h1>

          <button style={btnSecondary} onClick={loadData}>
            Atualizar
          </button>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Região: {regionName} • Estoque: {stockLocationName}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard
            label="Produtos encontrados"
            value={filteredProducts.length}
            theme={theme}
          />
          <SummaryCard
            label="Quantidade total"
            value={totalQty}
            theme={theme}
          />
          <SummaryCard
            label="Estoque vinculado"
            value={stockLocationName || "-"}
            theme={theme}
            textValue
          />
        </div>

        <div
          style={{
            ...card,
            marginBottom: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <div style={{ fontSize: 14, color: muted }}>
            {filteredProducts.length} produto(s) encontrado(s)
          </div>
        </div>

        {error ? (
          <div
            style={{
              ...card,
              marginBottom: 16,
              border: "1px solid #ef4444",
            }}
          >
            {error}
          </div>
        ) : null}

        {filteredProducts.length === 0 ? (
          <div style={card}>Nenhum produto encontrado neste estoque.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredProducts.map((item) => (
              <div
                key={item.id}
                style={{
                  ...card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{item.name}</div>
                  <div style={{ marginTop: 8, color: muted, fontSize: 14 }}>
                    Produto disponível no estoque da região do representante.
                  </div>
                </div>

                <div
                  style={{
                    minWidth: 140,
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontSize: 12, color: muted }}>Quantidade</div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: item.total > 0 ? theme.text : "#ef4444",
                    }}
                  >
                    {item.total}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  theme,
  textValue,
}: {
  label: string;
  value: string | number;
  theme: any;
  textValue?: boolean;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        background: cardBg,
      }}
    >
      <div style={{ fontSize: 13, color: theme.isDark ? "#94a3b8" : "#64748b" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: textValue ? 18 : 28,
          fontWeight: 900,
          marginTop: 6,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
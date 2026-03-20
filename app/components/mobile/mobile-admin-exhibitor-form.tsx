"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  Minus,
  Package2,
  Plus,
  Save,
  Search,
  Store,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import {
  MobileCard,
  MobileSectionTitle,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";

type AuthResponse = {
  user?: {
    id: string;
    role: string;
  } | null;
};

type RegionItem = {
  id: string;
  name: string;
  stockLocationId?: string | null;
  stockLocationName?: string | null;
};

type ClientItem = {
  id: string;
  name: string;
  regionId?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

type ProductItem = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
};

type StockResponse = {
  products?: Array<{
    id: string;
    name: string;
    stock?: Record<string, number>;
  }>;
};

type ExhibitorCreateResponse = {
  id?: string;
  code?: string | null;
  error?: string;
  details?: string;
};

type InitialItem = {
  productId: string;
  quantity: number;
};

const EXHIBITOR_TYPES = [
  { value: "FLOOR", label: "Chão" },
  { value: "ACRYLIC_CLOSED", label: "Acrílico fechado" },
  { value: "ACRYLIC_OPEN", label: "Acrílico aberto" },
  { value: "ACRYLIC_OPEN_SMALL", label: "Acrílico aberto pequeno" },
] as const;

function compareSku(a: string, b: string) {
  const prefixA = a.replace(/\d+/g, "").toUpperCase();
  const prefixB = b.replace(/\d+/g, "").toUpperCase();

  if (prefixA !== prefixB) {
    return prefixA.localeCompare(prefixB, "pt-BR");
  }

  const numberA = Number(a.match(/\d+/)?.[0] ?? "999999");
  const numberB = Number(b.match(/\d+/)?.[0] ?? "999999");

  if (numberA !== numberB) return numberA - numberB;
  return a.localeCompare(b, "pt-BR");
}

function QtyControl({
  qty,
  onDecrease,
  onIncrease,
  onChange,
  themeColors,
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onChange: (next: number) => void;
  themeColors: ReturnType<typeof getThemeColors>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={onDecrease}
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          background: themeColors.cardBg,
          color: themeColors.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Minus size={16} />
      </button>

      <input
        inputMode="numeric"
        value={qty}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value || 0)))}
        style={{
          width: 54,
          height: 34,
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          background: themeColors.inputBg,
          color: themeColors.text,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 800,
          outline: "none",
        }}
      />

      <button
        type="button"
        onClick={onIncrease}
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          background: themeColors.primary,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function MobileAdminExhibitorForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stockByProductAndLocation, setStockByProductAndLocation] = useState<
    Record<string, Record<string, number>>
  >({});

  const [error, setError] = useState<string | null>(null);
  const [savedExhibitor, setSavedExhibitor] = useState<ExhibitorCreateResponse | null>(null);

  const [regionId, setRegionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<string>("FLOOR");
  const [installedAt, setInstalledAt] = useState("");
  const [nextVisitAt, setNextVisitAt] = useState("");
  const [initialStockNote, setInitialStockNote] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [initialItems, setInitialItems] = useState<InitialItem[]>([]);

  useEffect(() => {
    let active = true;

    async function loadBase() {
      try {
        setLoading(true);
        setError(null);

        const [authRes, regionsRes, clientsRes, productsRes, stockRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/stock", { cache: "no-store" }),
        ]);

        const authJson = (await authRes.json().catch(() => null)) as AuthResponse | null;
        const regionsJson = await regionsRes.json().catch(() => null);
        const clientsJson = await clientsRes.json().catch(() => null);
        const productsJson = await productsRes.json().catch(() => null);
        const stockJson = (await stockRes.json().catch(() => null)) as StockResponse | null;

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/exhibitors/new");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const nextRegions: RegionItem[] = Array.isArray(regionsJson?.items)
          ? regionsJson.items
          : [];

        const nextClients: ClientItem[] = Array.isArray(clientsJson) ? clientsJson : [];

        const nextProducts: ProductItem[] = Array.isArray(productsJson)
          ? productsJson
          : [];

        const stockMap: Record<string, Record<string, number>> = {};
        for (const product of stockJson?.products ?? []) {
          stockMap[product.id] = product.stock ?? {};
        }

        if (!active) return;

        const sortedProducts = nextProducts
          .slice()
          .sort((a, b) => {
            const categoryCompare = String(a.category ?? "").localeCompare(
              String(b.category ?? ""),
              "pt-BR"
            );
            if (categoryCompare !== 0) return categoryCompare;
            return compareSku(a.sku ?? "", b.sku ?? "");
          });

        setRegions(nextRegions);
        setClients(nextClients);
        setProducts(sortedProducts);
        setStockByProductAndLocation(stockMap);
        setInitialItems(
          sortedProducts.map((product) => ({
            productId: product.id,
            quantity: 0,
          }))
        );

        if (nextRegions.length > 0) {
          setRegionId(nextRegions[0].id);
        }

        setInstalledAt(new Date().toISOString().slice(0, 10));
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar dados do expositor."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBase();

    return () => {
      active = false;
    };
  }, [router]);

  const selectedRegion = useMemo(() => {
    return regions.find((item) => item.id === regionId) ?? null;
  }, [regions, regionId]);

  const filteredClients = useMemo(() => {
    return clients
      .filter((item) => !regionId || item.regionId === regionId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [clients, regionId]);

  useEffect(() => {
    if (!regionId) return;
    if (!filteredClients.some((item) => item.id === clientId)) {
      setClientId(filteredClients[0]?.id ?? "");
    }
  }, [regionId, filteredClients, clientId]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((item) => item.category).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")) as string[];
  }, [products]);

  const itemsWithProduct = useMemo(() => {
    const stockLocationId = selectedRegion?.stockLocationId ?? "";

    return initialItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const stockQty =
        stockByProductAndLocation[item.productId]?.[stockLocationId] ?? 0;

      return {
        ...item,
        product,
        stockQty,
      };
    });
  }, [initialItems, products, stockByProductAndLocation, selectedRegion?.stockLocationId]);

  const filteredProducts = useMemo(() => {
    return itemsWithProduct.filter((item) => {
      const product = item.product;
      if (!product) return false;

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        String(product.sku ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !categoryFilter || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [itemsWithProduct, search, categoryFilter]);

  const selectedInitialItems = useMemo(() => {
    return itemsWithProduct.filter((item) => item.quantity > 0 && item.product);
  }, [itemsWithProduct]);

  function updateQty(productId: string, nextQty: number) {
    setInitialItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, nextQty || 0) }
          : item
      )
    );
  }

  function incrementQty(productId: string) {
    const current = initialItems.find((item) => item.productId === productId)?.quantity ?? 0;
    updateQty(productId, current + 1);
  }

  function decrementQty(productId: string) {
    const current = initialItems.find((item) => item.productId === productId)?.quantity ?? 0;
    updateQty(productId, Math.max(0, current - 1));
  }

  function resetForm() {
    setSavedExhibitor(null);
    setType("FLOOR");
    setInstalledAt(new Date().toISOString().slice(0, 10));
    setNextVisitAt("");
    setInitialStockNote("");
    setSearch("");
    setCategoryFilter("");
    setInitialItems((prev) => prev.map((item) => ({ ...item, quantity: 0 })));
  }

  async function handleSave() {
    try {
      setError(null);

      if (!regionId) {
        setError("Selecione a região.");
        return;
      }

      if (!clientId) {
        setError("Selecione o cliente.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/exhibitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regionId,
          clientId,
          type,
          installedAt: installedAt || null,
          nextVisitAt: nextVisitAt || null,
          initialStockNote: initialStockNote.trim() || null,
          initialItems: selectedInitialItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const json = (await res.json().catch(() => null)) as ExhibitorCreateResponse | null;

      if (!res.ok) {
        throw new Error(json?.error || json?.details || "Erro ao salvar expositor.");
      }

      setSavedExhibitor(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar expositor.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Carregando dados do expositor...</div>
      </MobileCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error ? (
        <MobileCard style={{ borderColor: "#ef4444" }}>
          <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 800 }}>{error}</div>
        </MobileCard>
      ) : null}

      {savedExhibitor ? (
        <MobileCard
          style={{
            background: colors.isDark
              ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
              : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <CheckCircle2 size={22} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>Expositor salvo com sucesso</div>
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            Código gerado: <strong>{savedExhibitor.code || "Expositor criado"}</strong>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 10,
            }}
          >
            <Link href="/m/admin/exhibitors">
              <div
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  background: colors.cardBg,
                  color: colors.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Ver expositores
              </div>
            </Link>

            <button
              type="button"
              onClick={resetForm}
              style={{
                minHeight: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.text,
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Novo cadastro
            </button>
          </div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <MobileSectionTitle title="Região, cliente e tipo" />

        <div style={{ display: "grid", gap: 10 }}>
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          >
            <option value="">Selecione a região</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
                {region.stockLocationName ? ` • ${region.stockLocationName}` : ""}
              </option>
            ))}
          </select>

          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          >
            <option value="">Selecione o cliente</option>
            {filteredClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          >
            {EXHIBITOR_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Datas e observação inicial" />

        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="date"
            value={installedAt}
            onChange={(e) => setInstalledAt(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <input
            type="date"
            value={nextVisitAt}
            onChange={(e) => setNextVisitAt(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <textarea
            value={initialStockNote}
            onChange={(e) => setInitialStockNote(e.target.value)}
            placeholder="Observação do abastecimento inicial"
            rows={3}
            style={{
              width: "100%",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: 14,
              outline: "none",
              fontSize: 14,
              resize: "vertical",
            }}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Filtro de produtos iniciais" />

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.subtext,
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou SKU"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px 0 38px",
                outline: "none",
                fontSize: 14,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setCategoryFilter("")}
              style={{
                border: `1px solid ${colors.border}`,
                background:
                  !categoryFilter
                    ? colors.isDark
                      ? "#1d4ed8"
                      : "#dbeafe"
                    : colors.cardBg,
                color: !categoryFilter ? (colors.isDark ? "#ffffff" : "#1d4ed8") : colors.text,
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              Todas
            </button>

            {categories.map((category) => {
              const active = categoryFilter === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: active
                      ? colors.isDark
                        ? "#1d4ed8"
                        : "#dbeafe"
                      : colors.cardBg,
                    color: active ? (colors.isDark ? "#ffffff" : "#1d4ed8") : colors.text,
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </MobileCard>

      <div style={{ display: "grid", gap: 12 }}>
        {filteredProducts.length === 0 ? (
          <MobileCard>
            <div style={{ fontSize: 14, color: colors.subtext }}>
              Nenhum produto encontrado.
            </div>
          </MobileCard>
        ) : (
          filteredProducts.map((item) => {
            const product = item.product;
            if (!product) return null;

            const insufficient = item.quantity > item.stockQty;

            return (
              <MobileCard key={product.id} style={{ padding: 14 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: colors.text,
                        }}
                      >
                        {product.name}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: colors.subtext,
                        }}
                      >
                        {product.sku} • {product.category || "Sem categoria"}
                      </div>
                    </div>

                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        border: `1px solid ${colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Package2 size={18} color={colors.subtext} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <QtyControl
                      qty={item.quantity}
                      onDecrease={() => decrementQty(product.id)}
                      onIncrease={() => incrementQty(product.id)}
                      onChange={(next) => updateQty(product.id, next)}
                      themeColors={colors}
                    />

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <div style={{ fontSize: 12, color: colors.subtext }}>Estoque regional</div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 13,
                          fontWeight: 900,
                          color: insufficient ? "#ef4444" : colors.text,
                        }}
                      >
                        {item.stockQty}
                      </div>
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })
        )}
      </div>

      <MobileCard>
        <MobileSectionTitle title="Resumo do abastecimento inicial" />

        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Itens selecionados</span>
            <strong>{selectedInitialItems.length}</strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Instalação</span>
            <strong>{formatDateBR(installedAt || null)}</strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Próxima visita</span>
            <strong>{formatDateBR(nextVisitAt || null)}</strong>
          </div>
        </div>
      </MobileCard>

      {selectedInitialItems.length > 0 ? (
        <MobileCard>
          <MobileSectionTitle title="Produtos incluídos" />

          <div style={{ display: "grid", gap: 10 }}>
            {selectedInitialItems.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: colors.text,
                    }}
                  >
                    {item.product?.name}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: colors.subtext,
                    }}
                  >
                    {item.product?.sku}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: colors.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.quantity} un.
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 10,
          }}
        >
          <Link href="/m/admin/exhibitors">
            <div
              style={{
                minHeight: 48,
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              <ChevronLeft size={16} />
              Voltar
            </div>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              minHeight: 48,
              borderRadius: 16,
              border: "none",
              background: colors.primary,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.75 : 1,
            }}
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar expositor"}
          </button>
        </div>
      </MobileCard>
    </div>
  );
}
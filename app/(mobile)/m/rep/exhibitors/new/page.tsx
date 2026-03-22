"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Minus,
  Package2,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AuthResponse = {
  user?: {
    id: string;
    role?: string;
    regionId?: string | null;
  } | null;
};

type ClientItem = {
  id: string;
  name?: string | null;
  regionId?: string | null;
};

type ProductItem = {
  id: string;
  sku?: string | null;
  name?: string | null;
  category?: string | null;
  active?: boolean | null;
};

type StockResponse = {
  products?: Array<{
    id: string;
    name?: string | null;
    stock?: Record<string, number>;
  }>;
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

export default function MobileRepNewExhibitorPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regionId, setRegionId] = useState("");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stockByProduct, setStockByProduct] = useState<Record<string, number>>(
    {}
  );

  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<string>("FLOOR");
  const [installedAt, setInstalledAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  });
  const [nextVisitAt, setNextVisitAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  });
  const [initialStockNote, setInitialStockNote] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [initialItems, setInitialItems] = useState<InitialItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [authRes, clientsRes, productsRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/rep/clients", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
        ]);

        const authJson = (await authRes.json().catch(() => null)) as
          | AuthResponse
          | null;
        const clientsJson = await clientsRes.json().catch(() => null);
        const productsJson = await productsRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/rep/exhibitors/new");
          return;
        }

        if (authJson?.user?.role !== "REPRESENTATIVE") {
          router.push("/m/rep");
          return;
        }

        const nextRegionId = authJson?.user?.regionId ?? "";
        if (!nextRegionId) {
          throw new Error("Representante sem região vinculada.");
        }

        const stockRes = await fetch(`/api/stock?regionId=${nextRegionId}`, {
          cache: "no-store",
        });
        const stockJson = (await stockRes.json().catch(() => null)) as
          | StockResponse
          | null;

        if (!active) return;

        const loadedClients = Array.isArray(clientsJson?.items)
          ? clientsJson.items
          : [];
        const loadedProductsRaw = Array.isArray(productsJson)
          ? productsJson
          : Array.isArray(productsJson?.items)
          ? productsJson.items
          : [];

        const loadedProducts = loadedProductsRaw
          .filter((item: ProductItem) => item.active !== false)
          .slice()
          .sort((a: ProductItem, b: ProductItem) => {
            const categoryCompare = String(a.category ?? "").localeCompare(
              String(b.category ?? ""),
              "pt-BR"
            );
            if (categoryCompare !== 0) return categoryCompare;
            return compareSku(a.sku ?? "", b.sku ?? "");
          });

        const nextStock: Record<string, number> = {};
        for (const p of stockJson?.products ?? []) {
          nextStock[p.id] = Object.values(p.stock ?? {}).reduce(
            (sum, qty) => sum + Number(qty || 0),
            0
          );
        }

        setRegionId(nextRegionId);
        setClients(
          loadedClients.sort((a: ClientItem, b: ClientItem) =>
            String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR")
          )
        );
        setProducts(loadedProducts);
        setStockByProduct(nextStock);
        setInitialItems(
          loadedProducts.map((product: ProductItem) => ({
            productId: product.id,
            quantity: 0,
          }))
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar base."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((item) => item.category).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")) as string[];
  }, [products]);

  const itemsWithProduct = useMemo(() => {
    return initialItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const stockQty = stockByProduct[item.productId] ?? 0;

      return {
        ...item,
        product,
        stockQty,
      };
    });
  }, [initialItems, products, stockByProduct]);

  const filteredProducts = useMemo(() => {
    return itemsWithProduct.filter((item) => {
      const product = item.product;
      if (!product) return false;

      const matchesSearch =
        !search ||
        String(product.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(product.sku ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        !categoryFilter || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [itemsWithProduct, search, categoryFilter]);

  const selectedInitialItems = useMemo(() => {
    return itemsWithProduct.filter((item) => item.quantity > 0 && item.product);
  }, [itemsWithProduct]);

  const totalSelectedUnits = useMemo(() => {
    return selectedInitialItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedInitialItems]);

  function updateQty(productId: string, nextQty: number) {
    setInitialItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, Math.floor(nextQty || 0)) }
          : item
      )
    );
  }

  function incrementQty(productId: string) {
    const current =
      initialItems.find((item) => item.productId === productId)?.quantity ?? 0;
    updateQty(productId, current + 1);
  }

  function decrementQty(productId: string) {
    const current =
      initialItems.find((item) => item.productId === productId)?.quantity ?? 0;
    updateQty(productId, Math.max(0, current - 1));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (!regionId) {
        throw new Error("Região não identificada.");
      }

      if (!clientId) {
        throw new Error("Selecione um cliente.");
      }

      const res = await fetch("/api/exhibitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regionId,
          clientId,
          type,
          installedAt,
          nextVisitAt,
          initialStockNote: initialStockNote.trim() || null,
          initialItems: selectedInitialItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar expositor.");
      }

      router.push("/m/rep/exhibitors");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar expositor.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: 14,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };

  return (
    <MobileRepPageFrame
      title="Novo expositor"
      subtitle="Cadastro mobile do representante"
      desktopHref="/exhibitors/new"
    >
      {loading ? (
        <MobileCard>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            Carregando dados do expositor...
          </div>
        </MobileCard>
      ) : (
        <>
          {error ? (
            <MobileCard style={{ borderColor: "#ef4444" }}>
              <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 800 }}>
                {error}
              </div>
            </MobileCard>
          ) : null}

          <MobileCard>
            <MobileSectionTitle title="Dados do expositor" />

            <div style={{ display: "grid", gap: 10 }}>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecione o cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || "Cliente"}
                  </option>
                ))}
              </select>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={inputStyle}
              >
                {EXHIBITOR_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={installedAt}
                onChange={(e) => setInstalledAt(e.target.value)}
                style={inputStyle}
              />

              <input
                type="datetime-local"
                value={nextVisitAt}
                onChange={(e) => setNextVisitAt(e.target.value)}
                style={inputStyle}
              />

              <textarea
                value={initialStockNote}
                onChange={(e) => setInitialStockNote(e.target.value)}
                rows={3}
                placeholder="Observações do estoque inicial"
                style={textareaStyle}
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
                    ...inputStyle,
                    padding: "0 14px 0 38px",
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
                    background: !categoryFilter
                      ? colors.isDark
                        ? "#1d4ed8"
                        : "#dbeafe"
                      : colors.cardBg,
                    color: !categoryFilter
                      ? colors.isDark
                        ? "#ffffff"
                        : "#1d4ed8"
                      : colors.text,
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
                        color: active
                          ? colors.isDark
                            ? "#ffffff"
                            : "#1d4ed8"
                          : colors.text,
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
                            {product.name || "Produto"}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: colors.subtext,
                            }}
                          >
                            {product.sku || "Sem SKU"} •{" "}
                            {product.category || "Sem categoria"}
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
                          <div
                            style={{
                              fontSize: 12,
                              color: colors.subtext,
                            }}
                          >
                            Estoque regional
                          </div>
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
                <span style={{ color: colors.subtext }}>Quantidade total</span>
                <strong>{totalSelectedUnits}</strong>
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
                        {item.product?.sku || "Sem SKU"}
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

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 46,
              borderRadius: 14,
              border: "none",
              background: colors.primary,
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar expositor"}
          </button>
        </>
      )}
    </MobileRepPageFrame>
  );
}
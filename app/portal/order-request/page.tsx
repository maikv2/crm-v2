"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type Product = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  priceCents?: number | null;
  active?: boolean;
  imageUrl?: string | null;
};

type CatalogItem = {
  productId: string;
  qty: number;
};

type RequestItem = {
  id: string;
  quantity: number;
  lineTotalCents: number;
  product: {
    id: string;
    sku?: string | null;
    name: string;
    category?: string | null;
    priceCents?: number | null;
  };
};

type RequestHistoryItem = {
  id: string;
  status: string;
  createdAt: string;
  notes?: string | null;
  subtotalCents: number;
  items: RequestItem[];
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Rejeitado";
    case "CONVERTED_TO_ORDER":
      return "Convertido em pedido";
    default:
      return status;
  }
}

function ActionButton({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
      ? "#2563eb"
      : colors.cardBg;

  const color = primary ? "#ffffff" : hover ? "#ffffff" : colors.text;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 42,
        padding: "0 14px",
        borderRadius: 12,
        border: primary ? "none" : `1px solid ${colors.border}`,
        background,
        color,
        fontWeight: 800,
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
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: colors.isDark
          ? "0 8px 24px rgba(2,6,23,0.26)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: colors.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

export default function PortalOrderRequestPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<RequestHistoryItem[]>([]);
  const [catalog, setCatalog] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [productsRes, requestsRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/portal/order-request", { cache: "no-store" }),
        ]);

        if (productsRes.status === 401 || requestsRes.status === 401) {
          router.push("/portal/login");
          return;
        }

        const productsJson = await productsRes.json().catch(() => null);
        const requestsJson = await requestsRes.json().catch(() => null);

        if (!productsRes.ok) {
          throw new Error(productsJson?.error || "Erro ao carregar produtos.");
        }

        if (!requestsRes.ok) {
          throw new Error(
            requestsJson?.error || "Erro ao carregar histórico de solicitações."
          );
        }

        if (active) {
          const activeProducts = Array.isArray(productsJson)
            ? productsJson.filter((item: Product) => item.active !== false)
            : [];

          activeProducts.sort((a: Product, b: Product) => {
            const skuA = String(a.sku || "").toUpperCase();
            const skuB = String(b.sku || "").toUpperCase();
            return skuA.localeCompare(skuB, "pt-BR");
          });

          setProducts(activeProducts);
          setRequests(Array.isArray(requestsJson?.requests) ? requestsJson.requests : []);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar solicitação de pedido."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!q) return true;

      return (
        String(product.name ?? "").toLowerCase().includes(q) ||
        String(product.sku ?? "").toLowerCase().includes(q) ||
        String(product.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const selectedItems = useMemo(() => {
    return products
      .map((product) => ({
        product,
        qty: catalog[product.id] ?? 0,
      }))
      .filter((item) => item.qty > 0);
  }, [products, catalog]);

  const subtotalCents = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      return sum + item.qty * Number(item.product.priceCents || 0);
    }, 0);
  }, [selectedItems]);

  function changeQty(productId: string, delta: number) {
    setCatalog((prev) => {
      const nextQty = Math.max(0, (prev[productId] ?? 0) + delta);
      return {
        ...prev,
        [productId]: nextQty,
      };
    });
  }

  async function handleSubmit() {
    try {
      if (selectedItems.length === 0) {
        setError("Selecione ao menos um produto.");
        return;
      }

      setSending(true);
      setError(null);
      setOk(null);

      const res = await fetch("/api/portal/order-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes,
          items: selectedItems.map((item) => ({
            productId: item.product.id,
            quantity: item.qty,
          })),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao enviar solicitação de pedido.");
      }

      setCatalog({});
      setNotes("");
      setOk("Solicitação enviada com sucesso.");

      const historyRes = await fetch("/api/portal/order-request", {
        cache: "no-store",
      });
      const historyJson = await historyRes.json().catch(() => null);

      if (historyRes.ok) {
        setRequests(Array.isArray(historyJson?.requests) ? historyJson.requests : []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao enviar solicitação de pedido."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.pageBg,
          color: colors.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        Carregando catálogo...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        color: colors.text,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: colors.subtext,
                marginBottom: 10,
              }}
            >
              🏠 / Portal do Cliente / Solicitar pedido
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Solicitar pedido
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              Escolha os produtos, ajuste a quantidade e envie sua solicitação.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton
              label="Voltar ao portal"
              onClick={() => router.push("/portal/dashboard")}
            />
            <ActionButton
              label={sending ? "Enviando..." : "Enviar solicitação"}
              primary
              disabled={sending || selectedItems.length === 0}
              onClick={handleSubmit}
            />
          </div>
        </div>

        {error ? (
          <div
            style={{
              borderRadius: 14,
              border: "1px solid #ef4444",
              background: colors.isDark ? "rgba(127,29,29,0.18)" : "#fff1f2",
              color: "#ef4444",
              padding: 14,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        {ok ? (
          <div
            style={{
              borderRadius: 14,
              border: "1px solid #22c55e",
              background: colors.isDark ? "rgba(21,128,61,0.18)" : "#f0fdf4",
              color: "#16a34a",
              padding: 14,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {ok}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 340px",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <Card
              title="Catálogo"
              right={
                <div
                  style={{
                    minWidth: 220,
                    height: 42,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 12px",
                  }}
                >
                  <Search size={16} color={colors.subtext} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto, SKU ou categoria"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: colors.text,
                      fontSize: 14,
                    }}
                  />
                </div>
              }
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {filteredProducts.map((product) => {
                  const qty = catalog[product.id] ?? 0;

                  return (
                    <div
                      key={product.id}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#f8fafc",
                        overflow: "hidden",
                        display: "grid",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: "1 / 1",
                          background: colors.isDark ? "#0f172a" : "#eef2ff",
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
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: 12,
                              color: colors.subtext,
                              textAlign: "center",
                              padding: 16,
                            }}
                          >
                            Sem imagem
                          </div>
                        )}
                      </div>

                      <div style={{ padding: 14 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: colors.subtext,
                            marginBottom: 6,
                          }}
                        >
                          {product.sku}
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: colors.text,
                            lineHeight: 1.35,
                            minHeight: 38,
                          }}
                        >
                          {product.name}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {product.category || "Sem categoria"}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 15,
                            fontWeight: 900,
                            color: colors.primary,
                          }}
                        >
                          {money(Number(product.priceCents || 0))}
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => changeQty(product.id, -1)}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              border: `1px solid ${colors.border}`,
                              background: colors.cardBg,
                              color: colors.text,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Minus size={16} />
                          </button>

                          <div
                            style={{
                              minWidth: 44,
                              textAlign: "center",
                              fontSize: 16,
                              fontWeight: 900,
                              color: colors.text,
                            }}
                          >
                            {qty}
                          </div>

                          <button
                            type="button"
                            onClick={() => changeQty(product.id, 1)}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              border: "none",
                              background: "#2563eb",
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <Card title="Resumo da solicitação">
              {selectedItems.length === 0 ? (
                <div style={{ fontSize: 13, color: colors.subtext }}>
                  Nenhum produto selecionado.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {selectedItems.map((item) => (
                    <div
                      key={item.product.id}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#f8fafc",
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: colors.text,
                        }}
                      >
                        {item.product.name}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: colors.subtext,
                        }}
                      >
                        {item.product.sku} • {item.qty} un.
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      paddingTop: 6,
                      fontSize: 16,
                      fontWeight: 900,
                      color: colors.text,
                    }}
                  >
                    Total estimado: {money(subtotalCents)}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: colors.text,
                  }}
                >
                  Observações
                </label>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Informações adicionais sobre a solicitação"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    color: colors.text,
                    outline: "none",
                    resize: "vertical",
                    fontSize: 14,
                  }}
                />
              </div>
            </Card>

            <Card title="Solicitações recentes">
              {requests.length === 0 ? (
                <div style={{ fontSize: 13, color: colors.subtext }}>
                  Nenhuma solicitação encontrada.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {requests.slice(0, 5).map((request) => (
                    <div
                      key={request.id}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#f8fafc",
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: colors.text,
                        }}
                      >
                        {statusLabel(request.status)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: colors.subtext,
                        }}
                      >
                        {dateBR(request.createdAt)} • {money(request.subtotalCents)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
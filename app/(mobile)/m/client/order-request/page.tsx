"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
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

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function MobileClientOrderRequestPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [products, setProducts] = useState<Product[]>([]);
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

        const res = await fetch("/api/products", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar produtos.");
        }

        if (active) {
          const activeProducts = Array.isArray(json)
            ? json.filter((item: Product) => item.active !== false)
            : [];

          activeProducts.sort((a: Product, b: Product) => {
            const skuA = String(a.sku || "").toUpperCase();
            const skuB = String(b.sku || "").toUpperCase();
            return skuA.localeCompare(skuB, "pt-BR");
          });

          setProducts(activeProducts);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar catálogo de produtos."
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
  }, []);

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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao enviar solicitação de pedido."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <MobileClientPageFrame
      title="Solicitar pedido"
      subtitle="Catálogo mobile do cliente"
      desktopHref="/portal/order-request"
    >
      {loading ? (
        <MobileCard>Carregando catálogo...</MobileCard>
      ) : (
        <>
          {error ? <MobileCard>{error}</MobileCard> : null}
          {ok ? <MobileCard>{ok}</MobileCard> : null}

          <MobileCard>
            <div
              style={{
                height: 44,
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
          </MobileCard>

          <div style={{ display: "grid", gap: 12 }}>
            {filteredProducts.map((product) => {
              const qty = catalog[product.id] ?? 0;

              return (
                <MobileCard key={product.id} style={{ overflow: "hidden", padding: 0 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "110px minmax(0,1fr)",
                      minHeight: 120,
                    }}
                  >
                    <div
                      style={{
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
                            fontSize: 11,
                            color: colors.subtext,
                            textAlign: "center",
                            padding: 10,
                          }}
                        >
                          Sem imagem
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: colors.subtext,
                          marginBottom: 4,
                        }}
                      >
                        {product.sku}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: colors.text,
                          lineHeight: 1.3,
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
                          marginTop: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => changeQty(product.id, -1)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            border: `1px solid ${colors.border}`,
                            background: colors.cardBg,
                            color: colors.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={15} />
                        </button>

                        <div
                          style={{
                            minWidth: 32,
                            textAlign: "center",
                            fontSize: 15,
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
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            border: "none",
                            background: "#2563eb",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </MobileCard>
              );
            })}
          </div>

          <MobileCard>
            <MobileSectionTitle title="Resumo da solicitação" />
            {selectedItems.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum produto selecionado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {selectedItems.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ color: colors.text }}>
                      {item.product.name} × {item.qty}
                    </div>
                    <div style={{ color: colors.text, fontWeight: 800 }}>
                      {money(item.qty * Number(item.product.priceCents || 0))}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${colors.border}`,
                    fontSize: 15,
                    fontWeight: 900,
                    color: colors.text,
                  }}
                >
                  Total estimado: {money(subtotalCents)}
                </div>
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Observações" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
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
          </MobileCard>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || selectedItems.length === 0}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 900,
              opacity: sending || selectedItems.length === 0 ? 0.7 : 1,
            }}
          >
            {sending ? "Enviando..." : "Enviar solicitação"}
          </button>
        </>
      )}
    </MobileClientPageFrame>
  );
}
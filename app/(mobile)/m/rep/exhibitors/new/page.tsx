"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
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
  const [stock, setStock] = useState<Record<string, number>>({});

  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<string>("FLOOR");
  const [installedAt, setInstalledAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [nextVisitAt, setNextVisitAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [initialStockNote, setInitialStockNote] = useState("");
  const [items, setItems] = useState<InitialItem[]>([
    { productId: "", quantity: 1 },
  ]);

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

        setRegionId(nextRegionId);
        setClients(Array.isArray(clientsJson?.items) ? clientsJson.items : []);
        setProducts(Array.isArray(productsJson) ? productsJson : []);

        const nextStock: Record<string, number> = {};
        for (const p of stockJson?.products ?? []) {
          nextStock[p.id] = Object.values(p.stock ?? {}).reduce(
            (sum, qty) => sum + Number(qty || 0),
            0
          );
        }
        setStock(nextStock);
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

  const cleanItems = useMemo(
    () =>
      items.filter((item) => item.productId && Number(item.quantity) > 0),
    [items]
  );

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
          initialItems: cleanItems,
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
    background: colors.cardBg,
    color: colors.text,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
  };

  return (
    <MobileRepPageFrame
      title="Novo expositor"
      subtitle="Cadastro mobile do representante"
      desktopHref="/exhibitors/new"
    >
      {loading ? (
        <MobileCard>Carregando...</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Dados do expositor" />

            <div style={{ display: "grid", gap: 12 }}>
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
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.cardBg,
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
            <MobileSectionTitle title="Itens iniciais" />

            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 92px",
                    gap: 12,
                  }}
                >
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = {
                        ...next[index],
                        productId: e.target.value,
                      };
                      setItems(next);
                    }}
                    style={inputStyle}
                  >
                    <option value="">Selecione o produto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku ? `${product.sku} - ` : ""}
                        {product.name || "Produto"}
                        {typeof stock[product.id] === "number"
                          ? ` (est.: ${stock[product.id]})`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = {
                        ...next[index],
                        quantity: Number(e.target.value || 1),
                      };
                      setItems(next);
                    }}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => [...prev, { productId: "", quantity: 1 }])
                  }
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    color: colors.text,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Adicionar item
                </button>

                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.slice(0, -1))}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      color: colors.text,
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Remover último
                  </button>
                ) : null}
              </div>
            </div>
          </MobileCard>

          {error ? <MobileCard>{error}</MobileCard> : null}

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
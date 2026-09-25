"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import {
  EXHIBITOR_TYPES,
  getExhibitorTypeCapacity,
} from "../../../../lib/exhibitors";

type InitialItem = {
  productId: string;
  quantity: number;
};

// Mix sugerido que já vem preenchido ao cadastrar um expositor novo (por SKU).
const DEFAULT_INITIAL_MIX: { sku: string; quantity: number }[] = [
  { sku: "CB0001", quantity: 4 }, // Cabo de dados V8
  { sku: "CB0002", quantity: 4 }, // Cabo de dados TC
  { sku: "CB0003", quantity: 4 }, // Cabo de dados iOS
  { sku: "CR0003", quantity: 3 }, // Kit carregador V8
  { sku: "CR0004", quantity: 3 }, // Kit carregador TC
  { sku: "CR0005", quantity: 3 }, // Kit carregador iOS
  { sku: "CR0002", quantity: 1 }, // Carregador fonte tomada
  { sku: "CR0001", quantity: 1 }, // Carregador fonte veicular
  { sku: "FN0001", quantity: 3 }, // Fone de ouvido P2
  { sku: "FN0002", quantity: 1 }, // Fone de ouvido TC
  { sku: "FN0003", quantity: 1 }, // Fone de ouvido iOS
  { sku: "FN0004", quantity: 1 }, // Fone Bluetooth Blue One
  { sku: "FN0005", quantity: 1 }, // Fone Bluetooth Blue Pro
];

function buildDefaultItems(products: any[]): InitialItem[] {
  const items = DEFAULT_INITIAL_MIX.flatMap(({ sku, quantity }) => {
    const product = products.find(
      (p: any) => String(p.sku ?? "").toUpperCase() === sku
    );
    return product ? [{ productId: product.id, quantity }] : [];
  });

  return items.length > 0 ? items : [{ productId: "", quantity: 1 }];
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function ProductSearchSelect({
  products,
  value,
  onChange,
  inputStyle,
  theme,
  dropdownBg,
}: {
  products: any[];
  value: string;
  onChange: (productId: string) => void;
  inputStyle: React.CSSProperties;
  theme: ReturnType<typeof getThemeColors>;
  dropdownBg: string;
}) {
  const selected = products.find((p: any) => p.id === value) ?? null;
  const selectedLabel = selected
    ? `${selected.sku ? `${selected.sku} - ` : ""}${selected.name}`
    : "";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return products;

    return products.filter((p: any) => {
      const haystack = normalizeSearch(
        [p.name, p.sku, p.category, p.barcode].filter(Boolean).join(" ")
      );
      return terms.every((term) => haystack.includes(term));
    });
  }, [products, query]);

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <input
        type="text"
        style={inputStyle}
        value={open ? query : selectedLabel}
        placeholder="Buscar produto por nome ou código..."
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (open && filtered.length > 0) {
              onChange(filtered[0].id);
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          } else if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            maxHeight: 280,
            overflowY: "auto",
            background: dropdownBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            boxShadow: theme.isDark
              ? "0 10px 30px rgba(2,6,23,0.5)"
              : "0 8px 24px rgba(15,23,42,0.12)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: theme.subtext }}>
              Nenhum produto encontrado.
            </div>
          ) : (
            filtered.map((p: any) => (
              <div
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(p.id);
                  setOpen(false);
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  color: theme.text,
                  borderBottom: `1px solid ${theme.border}`,
                  background:
                    p.id === value
                      ? theme.isDark
                        ? "rgba(59,130,246,0.18)"
                        : "#eff6ff"
                      : "transparent",
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: theme.subtext }}>
                  {[p.sku, p.category].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NewExhibitorPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const initialClientId = search.get("clientId") ?? "";
  const initialRegionId = search.get("regionId") ?? "";
  const from = search.get("from");
  const isRepresentativeFlow = from === "rep-client";

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClient, setLoadingClient] = useState(false);

  const [type, setType] = useState<string>("FLOOR");
  const [installedAt, setInstalledAt] = useState<string>("");

  const [nextVisitAt, setNextVisitAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);

    const pad = (n: number) => String(n).padStart(2, "0");

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [initialStockNote, setInitialStockNote] = useState<string>("");

  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<InitialItem[]>([
    { productId: "", quantity: 1 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalInitialQty = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        return sum + (qty > 0 ? qty : 0);
      }, 0),
    [items]
  );

  const maxCapacity = useMemo(() => getExhibitorTypeCapacity(type), [type]);

  useEffect(() => {
    async function loadBase() {
      try {
        setLoading(true);
        setError(null);

        const clientsEndpoint = isRepresentativeFlow
          ? "/api/rep/clients"
          : "/api/clients";

        const [clientsRes, productsRes] = await Promise.all([
          fetch(clientsEndpoint, { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
        ]);

        const clientsData = await readJsonSafe(clientsRes);
        const productsData = await readJsonSafe(productsRes);

        if (!clientsRes.ok) {
          throw new Error(
            clientsData?.error || clientsData?.raw || "Não foi possível carregar os clientes."
          );
        }

        if (!productsRes.ok) {
          throw new Error(
            productsData?.error || productsData?.raw || "Não foi possível carregar os produtos."
          );
        }

        const clientList = Array.isArray(clientsData)
          ? clientsData
          : Array.isArray(clientsData?.items)
          ? clientsData.items
          : [];

        const productList = Array.isArray(productsData)
          ? productsData
          : Array.isArray(productsData?.items)
          ? productsData.items
          : [];

        setClients(clientList);
        setProducts(productList);
        setItems(buildDefaultItems(productList));

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
          now.getDate()
        )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setInstalledAt(local);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Não foi possível carregar clientes e produtos.");
      } finally {
        setLoading(false);
      }
    }

    loadBase();
  }, [isRepresentativeFlow]);

  useEffect(() => {
    async function loadSelectedClient() {
      if (!selectedClientId) {
        setClient(null);
        return;
      }

      try {
        setLoadingClient(true);
        setError(null);

        const res = await fetch(`/api/clients/${selectedClientId}`, {
          cache: "no-store",
        });

        const data = await readJsonSafe(res);

        if (!res.ok) {
          throw new Error(
            data?.error || data?.raw || "Não foi possível carregar o cliente."
          );
        }

        setClient(data);
      } catch (err: any) {
        console.error(err);
        setClient(null);
        setError(err?.message || "Erro ao carregar o cliente selecionado.");
      } finally {
        setLoadingClient(false);
      }
    }

    loadSelectedClient();
  }, [selectedClientId]);

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function updateItem(index: number, field: keyof InitialItem, value: any) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const finalClientId = selectedClientId;
    const finalRegionId = client?.regionId || initialRegionId;

    if (!finalClientId) {
      setError("Selecione um cliente.");
      setSaving(false);
      return;
    }

    if (!finalRegionId) {
      setError("Não consegui identificar a região do cliente.");
      setSaving(false);
      return;
    }

    const initialItems = items.filter(
      (item) => item.productId && Number(item.quantity) > 0
    );

    const totalQty = initialItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );

    if (maxCapacity > 0 && totalQty > maxCapacity) {
      setError(
        `A capacidade máxima deste expositor é ${maxCapacity} itens, mas o mix inicial informado tem ${totalQty} itens.`
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/exhibitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: finalClientId,
          regionId: finalRegionId,
          type,
          installedAt: installedAt
            ? new Date(installedAt).toISOString()
            : undefined,
          nextVisitAt: nextVisitAt
            ? new Date(nextVisitAt).toISOString()
            : undefined,
          initialStockNote: initialStockNote || null,
          initialItems,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.details || data?.raw || "Erro ao salvar expositor."
        );
      }

      if (isRepresentativeFlow && finalClientId) {
        router.push(`/rep/clients/${finalClientId}`);
        return;
      }

      router.push("/exhibitors");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar expositor.");
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: 18,
    padding: 20,
    background: theme.cardBg,
    color: theme.text,
    maxWidth: 900,
    boxShadow: theme.isDark
      ? "0 10px 30px rgba(2,6,23,0.35)"
      : "0 8px 24px rgba(15,23,42,0.06)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: theme.text,
          background: theme.pageBg,
          minHeight: "100%",
        }}
      >
        Carregando…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.subtext,
          marginBottom: 10,
        }}
      >
        🏠 / Expositores / Novo expositor
      </div>

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
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Cadastrar Expositor
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
              display: "grid",
              gap: 4,
            }}
          >
            <div>
              <b style={{ color: theme.text }}>Cliente:</b>{" "}
              {loadingClient
                ? "Carregando cliente..."
                : client?.tradeName || client?.name || "Selecione um cliente"}
            </div>
            <div>
              <b style={{ color: theme.text }}>Região:</b>{" "}
              {client?.region?.name ?? "-"}
            </div>
            <div>
              <b style={{ color: theme.text }}>RegionId:</b>{" "}
              {(client?.regionId ?? initialRegionId) || "-"}
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Cliente
              </label>
              <select
                style={input}
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.tradeName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Região do cliente
              </label>
              <input
                style={{
                  ...input,
                  opacity: 0.9,
                }}
                value={client?.region?.name ?? "-"}
                readOnly
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Tipo de expositor
              </label>
              <select
                style={input}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {EXHIBITOR_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.capacity} itens)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Capacidade máxima
              </label>
              <input
                style={{
                  ...input,
                  opacity: 0.9,
                }}
                value={`${maxCapacity} itens`}
                readOnly
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Instalado em
              </label>
              <input
                style={input}
                type="datetime-local"
                value={installedAt}
                onChange={(e) => setInstalledAt(e.target.value)}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: theme.text,
                }}
              >
                Próxima visita (opcional)
              </label>
              <input
                style={input}
                type="datetime-local"
                value={nextVisitAt}
                onChange={(e) => setNextVisitAt(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 700,
                fontSize: 13,
                color: theme.text,
              }}
            >
              Observação / estoque inicial
            </label>
            <textarea
              style={{ ...input, minHeight: 90, resize: "vertical" }}
              value={initialStockNote}
              onChange={(e) => setInitialStockNote(e.target.value)}
              placeholder="Ex: Expositor instalado com estoque inicial."
            />
          </div>

          <div
            style={{
              marginTop: 20,
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: 16,
              background: subtleCard,
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                margin: "0 0 6px 0",
                fontWeight: 800,
                fontSize: 18,
                color: theme.text,
              }}
            >
              Mix inicial do expositor
            </h3>

            <div
              style={{
                marginBottom: 12,
                fontSize: 13,
                color: totalInitialQty > maxCapacity ? "#ef4444" : theme.subtext,
              }}
            >
              Total informado: <b>{totalInitialQty}</b> de <b>{maxCapacity}</b> itens
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 140px auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <ProductSearchSelect
                    products={products}
                    value={item.productId}
                    onChange={(productId) =>
                      updateItem(index, "productId", productId)
                    }
                    inputStyle={input}
                    theme={theme}
                    dropdownBg={inputBg}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px minmax(0, 1fr) 36px",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      onClick={() =>
                        updateItem(
                          index,
                          "quantity",
                          Math.max(1, (Number(item.quantity) || 0) - 1)
                        )
                      }
                      style={{ ...btnSecondary, padding: "8px 0", fontSize: 16 }}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity ? String(item.quantity) : ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        updateItem(index, "quantity", digits ? Number(digits) : 0);
                      }}
                      onBlur={() => {
                        if (!(Number(item.quantity) > 0)) {
                          updateItem(index, "quantity", 1);
                        }
                      }}
                      style={{ ...input, textAlign: "center", padding: "10px 4px" }}
                    />
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      onClick={() =>
                        updateItem(
                          index,
                          "quantity",
                          (Number(item.quantity) || 0) + 1
                        )
                      }
                      style={{ ...btnSecondary, padding: "8px 0", fontSize: 16 }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    style={{
                      ...btnSecondary,
                      background: theme.isDark ? "rgba(127,29,29,0.18)" : "#fff1f2",
                      color: theme.isDark ? "#fca5a5" : "#dc2626",
                      border: theme.isDark
                        ? "1px solid rgba(248,113,113,0.25)"
                        : "1px solid #fecaca",
                    }}
                  >
                    remover
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              style={{
                ...btnSecondary,
                marginTop: 12,
              }}
            >
              + adicionar item
            </button>
          </div>

          {error && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#ef4444",
                marginBottom: 12,
              }}
            >
              {error}
            </pre>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={btnSecondary}
              onClick={() => {
                if (isRepresentativeFlow && selectedClientId) {
                  router.push(`/rep/clients/${selectedClientId}`);
                  return;
                }

                router.back();
              }}
            >
              Cancelar
            </button>

            <button type="submit" style={btnPrimary} disabled={saving || loadingClient}>
              {saving ? "Salvando..." : "Salvar expositor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
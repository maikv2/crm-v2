"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ReturnItemRow = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
  } | null;
};

type ExhibitorReturnData = {
  id: string;
  name?: string | null;
  code?: string | null;
  client?: {
    id: string;
    name?: string | null;
  } | null;
  region?: {
    id: string;
    name?: string | null;
  } | null;
  products?: ReturnItemRow[] | null;
};

type FormRow = {
  itemId: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  availableQty: number;
  returnQty: number;
  sellQty: number;
};

export default function RepExhibitorReturnPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const exhibitorId = params?.id;

  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [data, setData] = useState<ExhibitorReturnData | null>(null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!exhibitorId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/exhibitors/${exhibitorId}`, {
        cache: "no-store",
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar itens do expositor.");
      }

      const normalized = Array.isArray(raw?.products)
        ? raw.products.map((item: ReturnItemRow) => ({
            itemId: item.id,
            productId: item.product?.id ?? "",
            productName: item.product?.name ?? "Produto",
            productSku: item.product?.sku ?? null,
            availableQty: Number(item.quantity ?? 0),
            returnQty: 0,
            sellQty: 0,
          }))
        : [];

      setData(raw as ExhibitorReturnData);
      setRows(normalized);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar devolução."
      );
      setData(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [exhibitorId]);

  function updateQty(
    index: number,
    field: "returnQty" | "sellQty",
    rawValue: string
  ) {
    const value = Math.max(0, Number(rawValue || 0));

    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return {
          ...row,
          [field]: Number.isFinite(value) ? Math.trunc(value) : 0,
        };
      })
    );
  }

  const validationErrors = useMemo(() => {
    return rows
      .map((row) => {
        const total = row.returnQty + row.sellQty;
        if (total > row.availableQty) {
          return `${row.productName}: devolver + vender não pode ser maior que ${row.availableQty}.`;
        }
        return null;
      })
      .filter(Boolean) as string[];
  }, [rows]);

  const hasOperation = useMemo(() => {
    return rows.some((row) => row.returnQty > 0 || row.sellQty > 0);
  }, [rows]);

  async function handleSubmit() {
    if (!exhibitorId) return;

    if (!hasOperation) {
      alert("Informe ao menos uma quantidade para devolver ou vender.");
      return;
    }

    if (validationErrors.length > 0) {
      alert(validationErrors[0]);
      return;
    }

    const items = rows
      .filter((row) => row.returnQty > 0 || row.sellQty > 0)
      .map((row) => ({
        productId: row.productId,
        returnQty: row.returnQty,
        sellQty: row.sellQty,
      }));

    try {
      setSaving(true);

      const res = await fetch(`/api/exhibitors/${exhibitorId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao registrar devolução.");
      }

      alert(raw?.message || "Operação registrada com sucesso.");
      router.push(`/rep/exhibitors/${exhibitorId}`);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Erro ao registrar devolução."
      );
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "white",
    cursor: saving ? "not-allowed" : "pointer",
    fontWeight: 800,
    opacity: saving ? 0.7 : 1,
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
    width: 110,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
    fontWeight: 700,
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
        Carregando devolução...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div style={{ ...card, border: "1px solid #ef4444" }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div style={card}>Expositor não encontrado.</div>
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
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ color: muted, fontSize: 14, marginBottom: 8 }}>
              Expositores / Registrar devolução
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
              {data.name || data.code || "Expositor"}
            </h1>

            <div style={{ color: muted, marginTop: 8 }}>
              Cliente: {data.client?.name ?? "-"} • Região: {data.region?.name ?? "-"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={btnSecondary}
              onClick={() => router.push(`/rep/exhibitors/${data.id}`)}
            >
              Voltar ao expositor
            </button>

            <button style={btnPrimary} onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar operação"}
            </button>
          </div>
        </div>

        {validationErrors.length > 0 ? (
          <div
            style={{
              ...card,
              marginBottom: 16,
              border: "1px solid #ef4444",
              color: "#ef4444",
            }}
          >
            {validationErrors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        ) : null}

        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18 }}>
            Como funciona
          </h2>

          <div style={{ color: muted, lineHeight: 1.6 }}>
            Para cada item do expositor, informe quanto vai voltar ao estoque da
            região e quanto foi vendido ao cliente. A soma de devolver + vender
            não pode ser maior do que a quantidade disponível no expositor.
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={card}>Nenhum item encontrado no expositor.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((row, index) => {
              const totalInformado = row.returnQty + row.sellQty;
              const excedeu = totalInformado > row.availableQty;

              return (
                <div
                  key={row.itemId}
                  style={{
                    ...card,
                    background: subtleCard,
                    border: `1px solid ${excedeu ? "#ef4444" : border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>
                        {row.productName}
                      </div>
                      <div style={{ color: muted, marginTop: 4 }}>
                        SKU: {row.productSku || "-"}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800 }}>
                      Quantidade no expositor: {row.availableQty}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <div style={{ color: muted, marginBottom: 6, fontSize: 14 }}>
                        Devolver ao estoque
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={row.returnQty}
                        onChange={(e) =>
                          updateQty(index, "returnQty", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div style={{ color: muted, marginBottom: 6, fontSize: 14 }}>
                        Vender ao cliente
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={row.sellQty}
                        onChange={(e) =>
                          updateQty(index, "sellQty", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ color: excedeu ? "#ef4444" : muted, fontWeight: 700 }}>
                      Total informado: {totalInformado}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
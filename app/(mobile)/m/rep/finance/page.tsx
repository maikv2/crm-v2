"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, RefreshCcw, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatDateTimeBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type FinanceEntry = {
  id: string;
  description?: string | null;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  createdAt?: string | null;
  order?: {
    id: string;
    number?: number | null;
  } | null;
};

type FinanceResponse = {
  region?: {
    id: string;
    name: string;
  } | null;
  entries: FinanceEntry[];
};

export default function MobileRepFinancePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinanceResponse | null>(null);

  async function loadData(isReload = false) {
    try {
      if (isReload) {
        setReloading(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const res = await fetch("/api/rep/finance", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.push("/login?redirect=/m/rep/finance");
        return;
      }

      if (res.status === 403) {
        router.push("/m");
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar financeiro.");
      }

      setData(json as FinanceResponse);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar financeiro."
      );
      setData(null);
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const entries = data?.entries || [];

    return entries.reduce(
      (acc, entry) => {
        if (entry.type === "INCOME") {
          acc.received += entry.amountCents;
        }

        if (entry.type === "EXPENSE") {
          acc.expenses += entry.amountCents;
        }

        return acc;
      },
      {
        received: 0,
        expenses: 0,
      }
    );
  }, [data]);

  const balance = summary.received - summary.expenses;

  return (
    <MobileRepPageFrame
      title="Financeiro"
      subtitle="Movimentações e saldo da sua região"
      desktopHref="/rep/finance"
    >
      {loading ? (
        <MobileCard>Carregando financeiro...</MobileCard>
      ) : (
        <>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Wallet size={20} />
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  Resumo da região
                </div>
              </div>

              <button
                onClick={() => loadData(true)}
                disabled={reloading}
                style={{
                  height: 36,
                  minWidth: 36,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.cardBg,
                  color: colors.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: reloading ? 0.7 : 1,
                }}
              >
                <RefreshCcw size={16} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  background: colors.isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                  Recebido
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  {formatMoneyBR(summary.received)}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  background: colors.isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                  Despesas
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  {formatMoneyBR(summary.expenses)}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  background: colors.isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                  Saldo
                </div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  {formatMoneyBR(balance)}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                opacity: 0.86,
              }}
            >
              Região: {data?.region?.name || "-"}
            </div>
          </MobileCard>

          {error ? <MobileCard>{error}</MobileCard> : null}

          <MobileCard>
            <MobileSectionTitle title="Movimentações" />

            {!data?.entries?.length ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhuma movimentação registrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {data.entries.map((entry) => {
                  const income = entry.type === "INCOME";

                  return (
                    <div
                      key={entry.id}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#f8fafc",
                        padding: 14,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
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
                            {entry.description || "Movimentação"}
                          </div>

                          {entry.order?.number ? (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: colors.subtext,
                              }}
                            >
                              Pedido #{entry.order.number}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: income ? "#16a34a" : "#ef4444",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {income ? "+" : "-"} {formatMoneyBR(entry.amountCents)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          fontSize: 12,
                          color: colors.subtext,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {income ? (
                            <ArrowUpRight size={14} />
                          ) : (
                            <ArrowDownRight size={14} />
                          )}
                          {income ? "Entrada" : "Saída"}
                        </span>

                        <span>{formatDateTimeBR(entry.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}
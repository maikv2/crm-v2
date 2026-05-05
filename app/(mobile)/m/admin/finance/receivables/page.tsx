"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Search,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ReceivableItem = {
  id: string;
  amountCents?: number | null;
  receivedCents?: number | null;
  dueDate?: string | null;
  status?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
  order?: {
    id: string;
    number: number;
  } | null;
};

function openAmount(amountCents?: number | null, receivedCents?: number | null) {
  return Math.max(0, Number(amountCents ?? 0) - Number(receivedCents ?? 0));
}

export default function MobileAdminReceivablesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ReceivableItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReceivables() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = await authRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/finance/receivables");
          return;
        }

        if (!["ADMIN", "ADMINISTRATIVE"].includes(authJson?.user?.role)) {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/finance/receivables", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar contas a receber.");
        }

        const nextItems = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        if (active) {
          setItems(nextItems);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar contas a receber."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReceivables();

    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!q) return true;

      return (
        String(item.client?.name ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q) ||
        String(item.order?.number ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    const overdue = filtered.filter((item) => item.status === "OVERDUE");
    const pending = filtered.filter((item) =>
      ["PENDING", "PARTIAL", "OVERDUE"].includes(String(item.status ?? ""))
    );

    return {
      overdueCount: overdue.length,
      overdueValue: overdue.reduce(
        (sum, item) => sum + openAmount(item.amountCents, item.receivedCents),
        0
      ),
      openValue: pending.reduce(
        (sum, item) => sum + openAmount(item.amountCents, item.receivedCents),
        0
      ),
    };
  }, [filtered]);

  return (
    <MobilePageFrame
      title="Contas a receber"
      subtitle="Financeiro mobile do admin"
      desktopHref="/finance/receivables"
    >
      <MobileCard>
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
            placeholder="Buscar por cliente, região ou pedido"
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
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando contas a receber...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileCard style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>
                Em atraso
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 21,
                  fontWeight: 900,
                  color: "#ef4444",
                }}
              >
                {formatMoneyBR(summary.overdueValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
                {summary.overdueCount} títulos
              </div>
            </MobileCard>

            <MobileCard style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>
                Em aberto
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 21,
                  fontWeight: 900,
                  color: colors.primary,
                }}
              >
                {formatMoneyBR(summary.openValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
                total pendente
              </div>
            </MobileCard>
          </div>

          <MobileCard>
            <MobileSectionTitle title="Títulos" />

            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum título encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((item) => {
                  const openCents = openAmount(item.amountCents, item.receivedCents);
                  const isOverdue = item.status === "OVERDUE";

                  return (
                    <Link key={item.id} href="/finance/receivables">
                      <div
                        style={{
                          borderRadius: 16,
                          border: `1px solid ${colors.border}`,
                          background: colors.isDark ? "#111827" : "#f8fafc",
                          padding: 14,
                          display: "grid",
                          gap: 10,
                        }}
                      >
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
                              {item.client?.name || "Cliente"}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: colors.subtext,
                              }}
                            >
                              {item.region?.name || "Sem região"}
                              {item.order?.number ? ` • Pedido #${item.order.number}` : ""}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: isOverdue ? "#ef4444" : colors.text,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatMoneyBR(openCents)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              background: isOverdue
                                ? colors.isDark
                                  ? "#2a1313"
                                  : "#fee2e2"
                                : colors.isDark
                                ? "#111f39"
                                : "#e8f0ff",
                              color: isOverdue ? "#ef4444" : colors.primary,
                            }}
                          >
                            {item.status || "Status"}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {isOverdue ? <AlertTriangle size={14} /> : <CalendarDays size={14} />}
                            Vence em {formatDateBR(item.dueDate)}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Wallet size={14} />
                            abrir
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, MobileStatCard, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type PayableItem = {
  id: string;
  description: string;
  amountCents: number;
  dueDate?: string | null;
  paidAt?: string | null;
  status: string;
  category?: string | null;
  region?: { id: string; name: string } | null;
};

function statusLabel(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "PENDING") return "Pendente";
  if (status === "CANCELLED") return "Cancelado";
  return status;
}

function statusColor(status: string) {
  if (status === "PAID") return "#16a34a";
  if (status === "PENDING") return "#ea580c";
  if (status === "CANCELLED") return "#dc2626";
  return "#64748b";
}

export default function MobileFinancePayablesPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [items, setItems] = useState<PayableItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/finance", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar contas a pagar.");
        }

        const list = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
        const payables = list.filter((item: PayableItem & { type?: string }) => item.type === "EXPENSE");

        if (active) setItems(payables);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar contas a pagar.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!q) return true;
      return (
        String(item.description ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q) ||
        String(item.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    const pending = filtered.filter((item) => item.status === "PENDING");
    const paid = filtered.filter((item) => item.status === "PAID");

    return {
      pendingValue: pending.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      paidValue: paid.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      pendingCount: pending.length,
      paidCount: paid.length,
    };
  }, [filtered]);

  return (
    <MobilePageFrame
      title="Contas a pagar"
      subtitle="Financeiro mobile do admin"
      desktopHref="/finance"
    >
      <MobileCard>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.subtext }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, região ou categoria"
            style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 14px 0 38px", outline: "none", fontSize: 14 }}
          />
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando contas a pagar...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileStatCard label="Pendentes" value={formatMoneyBR(summary.pendingValue)} helper={`${summary.pendingCount} lançamentos`} />
            <MobileStatCard label="Pagos" value={formatMoneyBR(summary.paidValue)} helper={`${summary.paidCount} lançamentos`} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Lançamentos" />
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma conta a pagar encontrada.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((item) => (
                  <div key={item.id} style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text, lineHeight: 1.25 }}>{item.description || "Sem descrição"}</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: colors.subtext }}>{item.region?.name || "Matriz"} • Venc. {formatDateBR(item.dueDate)}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{formatMoneyBR(item.amountCents)}</div>
                        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 800, color: statusColor(item.status) }}>{statusLabel(item.status)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}

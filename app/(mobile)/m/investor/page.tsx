"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type InvestorMeResponse = {
  investor: { id: string; name: string; email: string | null };
  period: { month: number; year: number };
  totals: {
    salesCents: number;
    receivedCents: number;
    yourShareCents: number;
  };
};

function getNextDay10(): Date {
  const now = new Date();
  const thisMonth10 = new Date(now.getFullYear(), now.getMonth(), 10);
  if (now < thisMonth10) return thisMonth10;
  return new Date(now.getFullYear(), now.getMonth() + 1, 10);
}

function Shortcut({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: colors.isDark ? "#111827" : "#e8f0ff",
            color: colors.primary,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: colors.text, lineHeight: 1.2 }}>{title}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext, lineHeight: 1.45 }}>{subtitle}</div>
          </div>
          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

export default function MobileInvestorDashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvestorMeResponse | null>(null);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }

      const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || "Erro ao carregar painel do investidor.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar painel do investidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const investorName = data?.investor?.name?.trim() || "Investidor";
  const totals = data?.totals;
  const nextDay10 = getNextDay10();
  const periodLabel = data ? `${String(data.period.month).padStart(2, "0")}/${data.period.year}` : "";

  return (
    <MobileInvestorPageFrame
      title="Resumo"
      subtitle={`Bem-vindo, ${investorName}`}
      desktopHref="/investor/dashboard"
    >
      {loading ? (
        <MobileCard>Carregando painel...</MobileCard>
      ) : error ? (
        <MobileCard><div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div></MobileCard>
      ) : (
        <>
          <MobileCard style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: colors.subtext, marginBottom: 14 }}>
              Referente a {periodLabel} · atualizado em tempo real
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ borderRadius: 14, padding: "14px 16px", background: colors.isDark ? "#111827" : "#f8fafc", border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>Total de vendas no mês</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: colors.text, marginTop: 4 }}>
                  {formatMoneyBR(totals?.salesCents ?? 0)}
                </div>
              </div>

              <div style={{ borderRadius: 14, padding: "14px 16px", background: colors.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Total recebido no mês</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#16a34a", marginTop: 4 }}>
                  {formatMoneyBR(totals?.receivedCents ?? 0)}
                </div>
                <div style={{ fontSize: 11, color: "#166534", marginTop: 4, opacity: 0.8 }}>
                  Vendas parceladas contam quando a parcela é paga.
                </div>
              </div>

              <div style={{ borderRadius: 14, padding: "14px 16px", background: colors.isDark ? "#0c1a2e" : "#eff6ff", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>Sua parte disponível</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#2563eb", marginTop: 4 }}>
                  {formatMoneyBR(totals?.yourShareCents ?? 0)}
                </div>
                <div style={{ fontSize: 11, color: "#1e40af", marginTop: 4, opacity: 0.8 }}>
                  Será distribuída no dia {nextDay10.toLocaleDateString("pt-BR")}.
                </div>
              </div>
            </div>
          </MobileCard>

          <Shortcut
            href="/m/investor/quotas"
            title="Minhas cotas"
            subtitle="Ver quanto você investiu e a fração que isso representa em cada região"
            icon={<Coins size={18} />}
          />
        </>
      )}
    </MobileInvestorPageFrame>
  );
}

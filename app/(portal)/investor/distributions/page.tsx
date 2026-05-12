"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function getNextEbitdaDate(): Date {
  const now = new Date();
  const day = now.getDate();
  if (day < 5) return new Date(now.getFullYear(), now.getMonth(), 5);
  return new Date(now.getFullYear(), now.getMonth() + 1, 5);
}

function getNextQuarterlyFundDate(): Date {
  const now = new Date();
  const m = now.getMonth() + 1;
  const quarterEndMonth = m <= 3 ? 3 : m <= 6 ? 6 : m <= 9 ? 9 : 12;
  const payoutMonth = quarterEndMonth + 1;
  const payoutYear = payoutMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  const adjPayoutMonth = payoutMonth > 12 ? 1 : payoutMonth;
  const payoutDate = new Date(payoutYear, adjPayoutMonth - 1, 5);
  if (now > payoutDate) {
    const nextQEnd = quarterEndMonth + 3;
    const nextPM = nextQEnd + 1;
    const nextPY = nextPM > 12 ? payoutYear + 1 : payoutYear;
    const adjNextPM = nextPM > 12 ? nextPM - 12 : nextPM;
    return new Date(nextPY, adjNextPM - 1, 5);
  }
  return payoutDate;
}

type DistributionItem = {
  id: string;
  regionId: string;
  month: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  paidAt?: string | null;
  status: string;
  payoutPhase?: string | null;
  region?: { id: string; name: string } | null;
};

type QuarterlyDistributionItem = {
  id: string;
  regionId: string;
  quarter: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  status: string;
  payoutPhase?: string | null;
  region?: { name?: string | null } | null;
};

type InvestorMeResponse = {
  investor: { id: string; name: string };
  summary: {
    activeQuotaCount: number;
    totalInvestedCents: number;
  };
  liveEstimate?: {
    ebitdaCents: number;
    quarterlyFundCents: number;
    quarter: number;
    year: number;
  } | null;
  distributions: DistributionItem[];
  quarterlyFundDistributions: QuarterlyDistributionItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function PageButton({
  label,
  icon,
  theme,
  onClick,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);

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
        border: `1px solid ${theme.border}`,
        background: hover ? "#2563eb" : theme.isDark ? "#0f172a" : "#ffffff",
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function LiveCard({ title, value, sub, bg, border, textColor }: {
  title: string;
  value: string;
  sub?: string;
  bg: string;
  border: string;
  textColor: string;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: textColor, textTransform: "uppercase", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: textColor, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75, color: textColor }}>{sub}</div>}
    </div>
  );
}

export default function InvestorDistributionsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : "#f3f6fb";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<InvestorMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"monthly" | "quarterly">("monthly");

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }

      const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Erro ao carregar distribuições.");
      setData(json);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Erro ao carregar distribuições.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const distributions = useMemo(() => data?.distributions || [], [data]);
  const quarterlyDistributions = useMemo(() => data?.quarterlyFundDistributions || [], [data]);

  const paid = useMemo(() => distributions.filter((item) => item.status === "PAID"), [distributions]);
  const pending = useMemo(() => distributions.filter((item) => item.status !== "PAID"), [distributions]);
  const totalPaid = useMemo(() => paid.reduce((sum, item) => sum + (item.totalDistributionCents ?? 0), 0), [paid]);
  const totalPending = useMemo(() => pending.reduce((sum, item) => sum + (item.totalDistributionCents ?? 0), 0), [pending]);
  const fundoPago = useMemo(() => quarterlyDistributions.filter(d => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0), [quarterlyDistributions]);

  const liveEbitda = data?.liveEstimate?.ebitdaCents ?? 0;
  const liveFundo = data?.liveEstimate?.quarterlyFundCents ?? 0;
  const totalInvestedCents = data?.summary?.totalInvestedCents ?? 0;

  const nextEbitdaDate = getNextEbitdaDate();
  const nextFundoDate = getNextQuarterlyFundDate();

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 74px)", display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, fontWeight: 700 }}>
        Carregando distribuições...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 74px)", background: pageBg, padding: 24, color: theme.text }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: muted, marginBottom: 8 }}>Portal do investidor</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Distribuições</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
              EBITDA e fundo trimestral em tempo real.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PageButton label={refreshing ? "Atualizando..." : "Atualizar"} icon={<RefreshCw size={16} />} theme={theme} onClick={() => load(true)} disabled={refreshing} />
            <PageButton label="Voltar ao painel" icon={<ArrowLeft size={16} />} theme={theme} onClick={() => router.push("/investor/dashboard")} />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 18, padding: 12, borderRadius: 12, border: "1px solid #ef4444", color: "#ef4444", background: theme.isDark ? "#0f172a" : "#ffffff", fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Live estimates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <LiveCard
            title={`EBITDA — estimativa do mês · ao vivo`}
            value={money(liveEbitda)}
            sub={`Sua parte · próx. retirada: ${nextEbitdaDate.toLocaleDateString("pt-BR")}`}
            bg={theme.isDark ? "#1c1917" : "#fffbeb"}
            border="#fde68a"
            textColor="#92400e"
          />
          <LiveCard
            title={`Fundo trimestral — estimativa · ${data?.liveEstimate ? `${data.liveEstimate.quarter}º tri/${data.liveEstimate.year}` : "ao vivo"}`}
            value={money(liveFundo)}
            sub={`Receita − despesas · próx. retirada: ${nextFundoDate.toLocaleDateString("pt-BR")}`}
            bg={theme.isDark ? "#0c1a2e" : "#eff6ff"}
            border="#bfdbfe"
            textColor="#1e40af"
          />
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
          {[
            { title: "Lançamentos EBITDA", value: String(distributions.length), helper: "Histórico mensal", accent: undefined },
            { title: "EBITDA pago", value: money(totalPaid), helper: "Distribuições pagas", accent: "#22c55e" },
            { title: "EBITDA pendente", value: money(totalPending), helper: "Aguardando pagamento", accent: "#f59e0b" },
            { title: "Fundo trimestral pago", value: money(fundoPago), helper: "Trimestrais pagos", accent: "#2563eb" },
          ].map(({ title, value, helper, accent }) => (
            <div key={title} style={{ background: theme.isDark ? "#0f172a" : "#ffffff", border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`, borderRadius: 18, padding: 18, minHeight: 100, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: muted, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: accent || theme.text, lineHeight: 1.1 }}>{value}</div>
              {helper && <div style={{ marginTop: 6, fontSize: 12, color: muted }}>{helper}</div>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {(["monthly", "quarterly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px", borderRadius: 12,
                border: `1px solid ${activeTab === tab ? "#2563eb" : theme.border}`,
                background: activeTab === tab ? "#2563eb" : (theme.isDark ? "#0f172a" : "#ffffff"),
                color: activeTab === tab ? "#fff" : theme.text,
                fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}
            >
              {tab === "monthly" ? "Mensal (EBITDA)" : "Fundo Trimestral"}
            </button>
          ))}
        </div>

        {/* Distribution list */}
        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          {activeTab === "monthly" ? (
            distributions.length === 0 ? (
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, background: theme.isDark ? "#0f172a" : "#ffffff", color: muted, fontWeight: 700 }}>
                Nenhuma distribuição mensal encontrada.
              </div>
            ) : (
              distributions.map((dist) => (
                <div key={dist.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, background: theme.isDark ? "#0f172a" : "#ffffff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>{dist.region?.name || "Região"}</div>
                      <div style={{ fontSize: 13, color: muted }}>{formatMonthYear(dist.month, dist.year)}</div>
                      {dist.payoutPhase && (
                        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: dist.payoutPhase === "PAYBACK" ? "#92400e" : "#1e40af", textTransform: "uppercase" }}>
                          {dist.payoutPhase === "PAYBACK" ? "Recuperação" : "Pós-payback"}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: dist.status === "PAID" ? "#16a34a" : "#f59e0b", whiteSpace: "nowrap" }}>
                      {dist.status === "PAID" ? "Pago" : "Pendente"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    {[
                      { label: "Cotas", value: String(dist.quotaCount) },
                      { label: "Valor por cota", value: money(dist.valuePerQuotaCents) },
                      { label: "Total", value: money(dist.totalDistributionCents) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )
          ) : (
            quarterlyDistributions.length === 0 ? (
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, background: theme.isDark ? "#0f172a" : "#ffffff", color: muted, fontWeight: 700 }}>
                Nenhum fundo trimestral distribuído ainda.
              </div>
            ) : (
              quarterlyDistributions.map((dist) => (
                <div key={dist.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, background: theme.isDark ? "#0f172a" : "#ffffff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>{dist.region?.name || "Região"}</div>
                      <div style={{ fontSize: 13, color: muted }}>{dist.quarter}º Trimestre/{dist.year}</div>
                      {dist.payoutPhase && (
                        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: dist.payoutPhase === "PAYBACK" ? "#92400e" : "#1e40af", textTransform: "uppercase" }}>
                          {dist.payoutPhase === "PAYBACK" ? "Recuperação" : "Pós-payback"}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: dist.status === "PAID" ? "#16a34a" : "#f59e0b", whiteSpace: "nowrap" }}>
                      {dist.status === "PAID" ? "Pago" : "Pendente"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    {[
                      { label: "Cotas", value: String(dist.quotaCount) },
                      { label: "Valor por cota", value: money(dist.valuePerQuotaCents) },
                      { label: "Total", value: money(dist.totalDistributionCents) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* 10x motivacional */}
        {(liveEbitda > 0 || liveFundo > 0 || totalInvestedCents > 0) && (
          <div style={{
            background: theme.isDark ? "#0f172a" : "#eff6ff",
            border: "1px solid #bfdbfe", borderRadius: 18, padding: 24,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1e40af", marginBottom: 6 }}>E se você tivesse 10x mais?</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
              Imagine ter 10x o investimento atual. Veja como ficariam seus rendimentos estimados:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
              {[
                { label: "Investimento total", current: totalInvestedCents, color: theme.text },
                { label: "EBITDA mensal", current: liveEbitda, color: "#f59e0b" },
                { label: "Fundo trimestral", current: liveFundo, color: "#2563eb" },
              ].filter(item => item.current > 0).map(({ label, current, color }) => (
                <div key={label} style={{ background: theme.isDark ? "#111827" : "#ffffff", border: `1px solid ${theme.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 10, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: muted, marginBottom: 4 }}>Atual</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color, marginBottom: 12 }}>{money(current)}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 4 }}>Com 10x</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#2563eb" }}>{money(current * 10)}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: "#1e40af", fontWeight: 700, textAlign: "center" }}>
              Fale com um de nossos representantes e escale sua participação.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

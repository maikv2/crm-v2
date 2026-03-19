"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

function moneyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type RegionInvestorItem = {
  investorId: string;
  investorName: string;
  email: string | null;
  phone: string | null;
  quotaCount: number;
  quotaNumbers: number[];
  estimatedInvestedCents: number;
};

type QuotaSummaryItem = {
  regionId: string;
  regionName: string;
  maxQuotaCount: number;
  quotaValueCents: number;
  targetClients: number;
  activeQuotaCount: number;
  companyQuotaCount: number;
  investorQuotaCount: number;
  availableQuotaCount: number;
  grossRevenueCents: number;
  operatingProfitCents: number;
  ebitdaCents: number;
  reserveCents: number;
  investorPoolCents: number;
  companyPoolCents: number;
  valuePerQuotaCents: number;
  hasMonthlyResult: boolean;
  investors: RegionInvestorItem[];
};

type QuotaSummaryResponse = {
  month: number;
  year: number;
  items: QuotaSummaryItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
  primary,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const bg = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
      ? "#2563eb"
      : theme.isDark
        ? "#0f172a"
        : theme.cardBg;

  const color = primary
    ? "#ffffff"
    : hover
      ? "#ffffff"
      : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: primary ? "none" : `1px solid ${theme.border}`,
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  title,
  value,
  theme,
  color,
}: {
  title: string;
  value: string;
  theme: ThemeShape;
  color?: string;
}) {
  return (
    <div
      style={{
        background: theme.isDark ? "#0f172a" : theme.cardBg,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: color || theme.text,
          lineHeight: 1.15,
          whiteSpace: "normal",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  theme,
  color,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
  color?: string;
}) {
  return (
    <div
      style={{
        background: theme.isDark ? "#111827" : "#f8fafc",
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: color || theme.text,
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RegionCard({
  item,
  theme,
  onOpenDistribution,
}: {
  item: QuotaSummaryItem;
  theme: ThemeShape;
  onOpenDistribution?: () => void;
}) {
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const bg = theme.isDark ? "#0b1324" : "#f8fafc";

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            {item.regionName}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: muted,
              fontWeight: 700,
            }}
          >
            Meta de {item.targetClients} PDVs • {item.maxQuotaCount} cotas
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: item.hasMonthlyResult ? "#22c55e" : "#f59e0b",
            background: item.hasMonthlyResult
              ? theme.isDark
                ? "rgba(34,197,94,0.14)"
                : "#eaf8ef"
              : theme.isDark
                ? "rgba(245,158,11,0.16)"
                : "#fff7e8",
            padding: "6px 10px",
            borderRadius: 999,
          }}
        >
          {item.hasMonthlyResult ? "Com resultado" : "Sem resultado"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <InfoBox
          label="Ativas"
          value={String(item.activeQuotaCount)}
          theme={theme}
        />
        <InfoBox
          label="Investidores"
          value={String(item.investorQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <InfoBox
          label="Empresa"
          value={String(item.companyQuotaCount)}
          theme={theme}
        />
        <InfoBox
          label="Disponíveis"
          value={String(item.availableQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <InfoBox
          label="Valor da cota"
          value={moneyFromCents(item.quotaValueCents)}
          theme={theme}
          color="#22c55e"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <InfoBox
          label="Faturamento bruto"
          value={moneyFromCents(item.grossRevenueCents)}
          theme={theme}
        />
        <InfoBox
          label="Lucro operacional"
          value={moneyFromCents(item.operatingProfitCents)}
          theme={theme}
        />
        <InfoBox
          label="EBITDA"
          value={moneyFromCents(item.ebitdaCents)}
          theme={theme}
          color="#22c55e"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <InfoBox
          label="Fundo trimestral"
          value={moneyFromCents(item.reserveCents)}
          theme={theme}
          color="#f59e0b"
        />
        <InfoBox
          label="Previsto investidores"
          value={moneyFromCents(item.investorPoolCents)}
          theme={theme}
          color="#2563eb"
        />
        <InfoBox
          label="Previsto empresa"
          value={moneyFromCents(item.companyPoolCents)}
          theme={theme}
        />
        <InfoBox
          label="Projeção por cota"
          value={moneyFromCents(item.valuePerQuotaCents)}
          theme={theme}
          color="#22c55e"
        />
      </div>

      <div
        style={{
          background: theme.isDark ? "#111827" : "#ffffff",
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: theme.text,
            marginBottom: 10,
          }}
        >
          Investidores vinculados
        </div>

        {item.investors.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: muted,
              fontWeight: 700,
            }}
          >
            Nenhum investidor vinculado a cotas ativas nesta região.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {item.investors.map((investor) => (
              <div
                key={investor.investorId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: theme.isDark ? "#0b1324" : "#f8fafc",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: theme.text,
                    }}
                  >
                    {investor.investorName}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: muted,
                    }}
                  >
                    {investor.email || "Sem e-mail"}
                    {investor.phone ? ` • ${investor.phone}` : ""}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: muted,
                    }}
                  >
                    {investor.quotaCount} cota(s) • #{investor.quotaNumbers.join(", #")}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#22c55e",
                    whiteSpace: "nowrap",
                  }}
                >
                  {moneyFromCents(investor.estimatedInvestedCents)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <ActionButton
          label="Ver distribuição"
          theme={theme}
          onClick={onOpenDistribution}
          primary
        />
      </div>
    </div>
  );
}

export default function InvestorQuotasPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const today = new Date();

  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<QuotaSummaryItem[]>([]);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const inputBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;

  async function loadData(selectedMonth = month, selectedYear = year) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/investors/quotas/summary?month=${selectedMonth}&year=${selectedYear}`,
        {
          cache: "no-store",
        }
      );

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar cotas.");
      }

      const data = raw as QuotaSummaryResponse;
      setItems(data.items ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.maxQuotaCount += item.maxQuotaCount;
        acc.activeQuotaCount += item.activeQuotaCount;
        acc.companyQuotaCount += item.companyQuotaCount;
        acc.investorQuotaCount += item.investorQuotaCount;
        acc.availableQuotaCount += item.availableQuotaCount;
        acc.grossRevenueCents += item.grossRevenueCents;
        acc.operatingProfitCents += item.operatingProfitCents;
        acc.ebitdaCents += item.ebitdaCents;
        acc.reserveCents += item.reserveCents;
        acc.investorPoolCents += item.investorPoolCents;
        acc.companyPoolCents += item.companyPoolCents;
        return acc;
      },
      {
        maxQuotaCount: 0,
        activeQuotaCount: 0,
        companyQuotaCount: 0,
        investorQuotaCount: 0,
        availableQuotaCount: 0,
        grossRevenueCents: 0,
        operatingProfitCents: 0,
        ebitdaCents: 0,
        reserveCents: 0,
        investorPoolCents: 0,
        companyPoolCents: 0,
      }
    );
  }, [items]);

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "100vh",
        width: "100%",
        padding: 24,
      }}
    >
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
              fontSize: 14,
              fontWeight: 700,
              color: muted,
              marginBottom: 10,
            }}
          >
            💰 / Investidores / Gestão de Cotas
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Gestão de Cotas
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Análise por região com cotistas, cotas ativas, fundo trimestral e previsão de repasse.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: inputBg,
              color: theme.text,
              fontWeight: 700,
              outline: "none",
            }}
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {String(index + 1).padStart(2, "0")}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              height: 40,
              width: 100,
              padding: "0 12px",
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: inputBg,
              color: theme.text,
              fontWeight: 700,
              outline: "none",
            }}
          />

          <ActionButton
            label="Atualizar"
            theme={theme}
            onClick={() => loadData(month, year)}
          />
          <ActionButton
            label="Dashboard"
            theme={theme}
            onClick={() => router.push("/investors/dashboard")}
          />
          <ActionButton
            label="Distribuições"
            theme={theme}
            primary
            onClick={() => router.push("/investors/distributions")}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          title="Cotas totais"
          value={String(totals.maxQuotaCount)}
          theme={theme}
        />
        <SummaryCard
          title="Cotas ativas"
          value={String(totals.activeQuotaCount)}
          theme={theme}
        />
        <SummaryCard
          title="Investidores"
          value={String(totals.investorQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Empresa"
          value={String(totals.companyQuotaCount)}
          theme={theme}
        />
        <SummaryCard
          title="Disponíveis"
          value={String(totals.availableQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Fundo trimestral"
          value={moneyFromCents(totals.reserveCents)}
          theme={theme}
          color="#f59e0b"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          title="Faturamento bruto"
          value={moneyFromCents(totals.grossRevenueCents)}
          theme={theme}
        />
        <SummaryCard
          title="Lucro operacional"
          value={moneyFromCents(totals.operatingProfitCents)}
          theme={theme}
        />
        <SummaryCard
          title="EBITDA"
          value={moneyFromCents(totals.ebitdaCents)}
          theme={theme}
          color="#22c55e"
        />
        <SummaryCard
          title="Previsto investidores"
          value={moneyFromCents(totals.investorPoolCents)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Previsto empresa"
          value={moneyFromCents(totals.companyPoolCents)}
          theme={theme}
        />
      </div>

      <div
        style={{
          background: theme.isDark ? "#0f172a" : theme.cardBg,
          border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
          borderRadius: 18,
          padding: 22,
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
              color: theme.text,
            }}
          >
            Resumo por região
          </div>

          <div
            style={{
              fontSize: 13,
              color: muted,
              fontWeight: 700,
            }}
          >
            {String(month).padStart(2, "0")}/{year}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: "12px 2px",
              color: muted,
              fontWeight: 700,
            }}
          >
            Carregando cotas...
          </div>
        ) : error ? (
          <div
            style={{
              padding: "12px 2px",
              color: "#ef4444",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: "12px 2px",
              color: muted,
              fontWeight: 700,
            }}
          >
            Nenhuma região encontrada.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {items.map((item) => (
              <RegionCard
                key={item.regionId}
                item={item}
                theme={theme}
                onOpenDistribution={() =>
                  router.push(
                    `/investors/distributions?month=${month}&year=${year}`
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
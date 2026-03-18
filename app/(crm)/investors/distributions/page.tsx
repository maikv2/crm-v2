"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

function moneyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type DistributionInvestorItem = {
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  quotaCount: number;
  totalDistributionCents: number;
  quotaNumbers: number[];
};

type DistributionSummaryItem = {
  regionId: string;
  regionName: string;
  month: number;
  year: number;
  grossRevenueCents: number;
  operatingProfitCents: number;
  ebitdaCents: number;
  reserveCents: number;
  totalBaseCents: number;
  investorPoolCents: number;
  companyPoolCents: number;
  activeQuotaCount: number;
  companyQuotaCount: number;
  investorQuotaCount: number;
  availableQuotaCount: number;
  valuePerQuotaCents: number;
  investors: DistributionInvestorItem[];
  hasMonthlyResult: boolean;
};

type DistributionSummaryResponse = {
  month: number;
  year: number;
  items: DistributionSummaryItem[];
};

type GenerateAllResultItem = {
  regionId: string;
  regionName: string;
  success: boolean;
  data?: unknown;
  error?: string;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
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
      disabled={disabled}
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
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
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

function RegionDistributionCard({
  item,
  theme,
  generating,
  onGenerate,
}: {
  item: DistributionSummaryItem;
  theme: ThemeShape;
  generating?: boolean;
  onGenerate?: () => void;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const bg = theme.isDark ? "#0b1324" : "#f8fafc";

  const totalQuotaNumbers = item.investors.reduce(
    (sum, investor) => sum + investor.quotaCount,
    0
  );

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
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
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
            {String(item.month).padStart(2, "0")}/{item.year}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
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

          <ActionButton
            label={generating ? "Gerando..." : "Gerar distribuição"}
            theme={theme}
            primary
            disabled={generating || !item.hasMonthlyResult}
            onClick={onGenerate}
          />
        </div>
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
        <InfoBox
          label="Fundo trimestral"
          value={moneyFromCents(item.reserveCents)}
          theme={theme}
          color="#f59e0b"
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
          label="Base total"
          value={moneyFromCents(item.totalBaseCents)}
          theme={theme}
        />
        <InfoBox
          label="Investidores"
          value={moneyFromCents(item.investorPoolCents)}
          theme={theme}
          color="#2563eb"
        />
        <InfoBox
          label="Empresa"
          value={moneyFromCents(item.companyPoolCents)}
          theme={theme}
        />
        <InfoBox
          label="Valor por cota"
          value={moneyFromCents(item.valuePerQuotaCents)}
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
          label="Cotas ativas"
          value={String(item.activeQuotaCount)}
          theme={theme}
        />
        <InfoBox
          label="Cotas investidores"
          value={String(item.investorQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <InfoBox
          label="Cotas empresa"
          value={String(item.companyQuotaCount)}
          theme={theme}
        />
        <InfoBox
          label="Disponíveis"
          value={String(item.availableQuotaCount)}
          theme={theme}
        />
      </div>

      <div
        style={{
          background: theme.isDark ? "#111827" : theme.cardBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <InfoBox
            label="Cotistas do período"
            value={String(item.investors.length)}
            theme={theme}
          />
          <InfoBox
            label="Cotas distribuídas"
            value={String(totalQuotaNumbers)}
            theme={theme}
          />
          <InfoBox
            label="Média por cota"
            value={moneyFromCents(item.valuePerQuotaCents)}
            theme={theme}
          />
        </div>
      </div>

      <div
        style={{
          background: theme.isDark ? "#111827" : theme.cardBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: theme.text,
            marginBottom: 12,
          }}
        >
          Investidores do período
        </div>

        {item.investors.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: muted,
            }}
          >
            Nenhum investidor vinculado nesta região.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {item.investors.map((investor) => (
              <div
                key={investor.investorId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 180px",
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: theme.isDark ? "#0b1324" : "#ffffff",
                  alignItems: "center",
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
                    {investor.investorEmail || "Sem e-mail"}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: muted,
                  }}
                >
                  {investor.quotaCount} cota(s) • #{investor.quotaNumbers.join(", #")}
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: "#22c55e",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {moneyFromCents(investor.totalDistributionCents)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvestorDistributionsPage() {
  return (
    <Suspense fallback={<InvestorDistributionsPageLoading />}>
      <InvestorDistributionsPageContent />
    </Suspense>
  );
}

function InvestorDistributionsPageLoading() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);
  const pageBg = theme.isDark ? "#081225" : theme.pageBg;

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
      Carregando distribuições...
    </div>
  );
}

function InvestorDistributionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const today = new Date();

  const initialMonth = Number(searchParams.get("month")) || today.getMonth() + 1;
  const initialYear = Number(searchParams.get("year")) || today.getFullYear();

  const [month, setMonth] = useState<number>(initialMonth);
  const [year, setYear] = useState<number>(initialYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<DistributionSummaryItem[]>([]);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingRegionId, setGeneratingRegionId] = useState<string | null>(null);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const inputBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;

  async function loadData(selectedMonth = month, selectedYear = year) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/investors/distributions/summary?month=${selectedMonth}&year=${selectedYear}`,
        {
          cache: "no-store",
        }
      );

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar distribuição.");
      }

      const data = raw as DistributionSummaryResponse;
      setItems(data.items ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRegion(regionId: string, regionName: string) {
    try {
      setGeneratingRegionId(regionId);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/investors/distributions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regionId,
          month,
          year,
        }),
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || `Erro ao gerar distribuição de ${regionName}.`);
      }

      setMessage(`Distribuição gerada com sucesso para ${regionName}.`);
      await loadData(month, year);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao gerar distribuição.");
    } finally {
      setGeneratingRegionId(null);
    }
  }

  async function handleGenerateAll() {
    try {
      setGeneratingAll(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/investors/distributions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generateAllRegions: true,
          month,
          year,
        }),
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao gerar distribuições.");
      }

      const successCount = Number(raw?.successCount ?? 0);
      const errorCount = Number(raw?.errorCount ?? 0);
      const results = Array.isArray(raw?.results)
        ? (raw.results as GenerateAllResultItem[])
        : [];

      if (errorCount > 0) {
        const failedNames = results
          .filter((item) => !item.success)
          .map((item) => item.regionName)
          .join(", ");

        setMessage(
          `Distribuições geradas em ${successCount} região(ões). Falhas em ${errorCount}: ${failedNames || "verifique os dados"}.`
        );
      } else {
        setMessage(
          `Distribuições geradas com sucesso para ${successCount} região(ões).`
        );
      }

      await loadData(month, year);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao gerar distribuições.");
    } finally {
      setGeneratingAll(false);
    }
  }

  useEffect(() => {
    loadData(initialMonth, initialYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const investorSet = new Set<string>();

    return items.reduce(
      (acc, item) => {
        acc.grossRevenueCents += item.grossRevenueCents;
        acc.operatingProfitCents += item.operatingProfitCents;
        acc.ebitdaCents += item.ebitdaCents;
        acc.reserveCents += item.reserveCents;
        acc.totalBaseCents += item.totalBaseCents;
        acc.investorPoolCents += item.investorPoolCents;
        acc.companyPoolCents += item.companyPoolCents;
        acc.activeQuotaCount += item.activeQuotaCount;

        if (item.hasMonthlyResult) {
          acc.regionWithResultCount += 1;
        }

        for (const investor of item.investors) {
          investorSet.add(investor.investorId);
        }

        acc.investorCount = investorSet.size;
        return acc;
      },
      {
        grossRevenueCents: 0,
        operatingProfitCents: 0,
        ebitdaCents: 0,
        reserveCents: 0,
        totalBaseCents: 0,
        investorPoolCents: 0,
        companyPoolCents: 0,
        activeQuotaCount: 0,
        investorCount: 0,
        regionWithResultCount: 0,
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
            💸 / Investidores / Distribuições
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Distribuição de Resultados
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Origem dos valores, base total do período e repasse previsto por cotista.
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
            label={generatingAll ? "Gerando todas..." : "Gerar todas"}
            theme={theme}
            primary
            disabled={generatingAll || loading}
            onClick={handleGenerateAll}
          />
          <ActionButton
            label="Dashboard"
            theme={theme}
            onClick={() => router.push("/investors/dashboard")}
          />
          <ActionButton
            label="Gestão de Cotas"
            theme={theme}
            onClick={() => router.push("/investors/quotas")}
          />
        </div>
      </div>

      {message ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${theme.isDark ? "#14532d" : "#86efac"}`,
            background: theme.isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4",
            color: theme.isDark ? "#bbf7d0" : "#166534",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${theme.isDark ? "#7f1d1d" : "#fca5a5"}`,
            background: theme.isDark ? "rgba(239,68,68,0.12)" : "#fef2f2",
            color: theme.isDark ? "#fecaca" : "#991b1b",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
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
          title="Fundo trimestral"
          value={moneyFromCents(totals.reserveCents)}
          theme={theme}
          color="#f59e0b"
        />
        <SummaryCard
          title="Investidores"
          value={moneyFromCents(totals.investorPoolCents)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Empresa"
          value={moneyFromCents(totals.companyPoolCents)}
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          title="Base total"
          value={moneyFromCents(totals.totalBaseCents)}
          theme={theme}
        />
        <SummaryCard
          title="Cotas ativas"
          value={String(totals.activeQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Cotistas"
          value={String(totals.investorCount)}
          theme={theme}
        />
        <SummaryCard
          title="Regiões com resultado"
          value={String(totals.regionWithResultCount)}
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
            Carregando distribuição...
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
              <RegionDistributionCard
                key={item.regionId}
                item={item}
                theme={theme}
                generating={generatingRegionId === item.regionId}
                onGenerate={() =>
                  handleGenerateRegion(item.regionId, item.regionName)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
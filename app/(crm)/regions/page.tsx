"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type RegionItem = {
  id: string;
  name: string;
  active: boolean;
  targetClients: number;
  monthlySalesTargetCents: number;
  maxQuotaCount: number;
  quotaValueCents: number;
  investmentTargetCents: number;
  activeQuotaCount: number;
  companyQuotaCount: number;
  investorQuotaCount: number;
  availableQuotaCount: number;
  occupationPercent: number;
};

type RegionsResponse = {
  items: RegionItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  const buttonBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const buttonBorder = theme.isDark ? "#1e293b" : theme.border;
  const buttonText = theme.isDark ? "#ffffff" : theme.text;

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
        border: `1px solid ${buttonBorder}`,
        background: hover ? "#2563eb" : buttonBg,
        color: hover ? "#ffffff" : buttonText,
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

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  const blockBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const blockBorder = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: blockBg,
        border: `1px solid ${blockBorder}`,
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
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
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
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const cardBorder = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 16,
        padding: 22,
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
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
          fontSize: 26,
          fontWeight: 900,
          color: color || theme.text,
          whiteSpace: "nowrap",
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
}: {
  item: RegionItem;
  theme: ThemeShape;
}) {
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const innerCardBg = theme.isDark ? "#111827" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        background: subtleCard,
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
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.name}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Meta de clientes: {item.targetClients}
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: item.active ? "#22c55e" : "#f59e0b",
            background: item.active
              ? theme.isDark
                ? "rgba(34,197,94,0.14)"
                : "#eaf8ef"
              : theme.isDark
              ? "rgba(245,158,11,0.16)"
              : "#fff7e8",
            padding: "6px 10px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {item.active ? "Ativa" : "Inativa"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: muted }}>Cotas máximas</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.maxQuotaCount}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Cotas ativas</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.activeQuotaCount}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Empresa</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.companyQuotaCount}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Investidores</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.investorQuotaCount}
          </div>
        </div>
      </div>

      <div
        style={{
          background: innerCardBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: muted }}>Ocupação das cotas</div>

        <div
          style={{
            marginTop: 10,
            width: "100%",
            height: 10,
            borderRadius: 999,
            background: theme.isDark ? "#1e293b" : "#e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${item.occupationPercent}%`,
              height: "100%",
              borderRadius: 999,
              background: "#2563eb",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: muted,
          }}
        >
          <span>{item.occupationPercent}% ocupada</span>
          <span>{item.availableQuotaCount} disponível(is)</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <div
          style={{
            background: innerCardBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: muted }}>Valor da cota</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 800,
              color: "#22c55e",
            }}
          >
            {money(item.quotaValueCents / 100)}
          </div>
        </div>

        <div
          style={{
            background: innerCardBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: muted }}>Meta mensal</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {money(item.monthlySalesTargetCents / 100)}
          </div>
        </div>

        <div
          style={{
            background: innerCardBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, color: muted }}>Meta investimento</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {money(item.investmentTargetCents / 100)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegionsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RegionItem[]>([]);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/regions", {
        cache: "no-store",
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar regiões.");
      }

      const data = raw as RegionsResponse;

      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.regionCount += 1;
        acc.maxQuotaCount += item.maxQuotaCount;
        acc.activeQuotaCount += item.activeQuotaCount;
        acc.investmentTargetCents += item.investmentTargetCents;
        return acc;
      },
      {
        regionCount: 0,
        maxQuotaCount: 0,
        activeQuotaCount: 0,
        investmentTargetCents: 0,
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
        padding: "24px",
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
            🌍 / Regiões
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Regiões
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Controle de cotas, metas e capacidade de investimento por região.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="Atualizar"
            theme={theme}
            onClick={loadData}
          />
          <ActionButton
            label="Gestão de Cotas"
            theme={theme}
            onClick={() => router.push("/investors/quotas")}
          />
        </div>
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
          title="Regiões"
          value={String(totals.regionCount)}
          theme={theme}
        />
        <SummaryCard
          title="Cotas Máximas"
          value={String(totals.maxQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Cotas Ativas"
          value={String(totals.activeQuotaCount)}
          theme={theme}
        />
        <SummaryCard
          title="Meta de Investimento"
          value={money(totals.investmentTargetCents / 100)}
          theme={theme}
          color="#22c55e"
        />
      </div>

      <Block title="Lista de Regiões" theme={theme}>
        {loading ? (
          <div
            style={{
              padding: "12px 2px",
              color: muted,
              fontWeight: 700,
            }}
          >
            Carregando regiões...
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
                key={item.id}
                item={item}
                theme={theme}
              />
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}
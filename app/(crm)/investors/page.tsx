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

type InvestorRegionItem = {
  regionId: string;
  regionName: string;
  quotaCount: number;
  quotaNumbers: number[];
};

type InvestorItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  activeQuotaCount: number;
  estimatedInvestedCents: number;
  regions: InvestorRegionItem[];
};

type InvestorsResponse = {
  items: InvestorItem[];
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

  const buttonBg = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
    ? "#2563eb"
    : theme.isDark
    ? "#0f172a"
    : theme.cardBg;

  const buttonBorder = primary
    ? "none"
    : `1px solid ${theme.isDark ? "#1e293b" : theme.border}`;

  const buttonText = primary
    ? "#ffffff"
    : hover
    ? "#ffffff"
    : theme.isDark
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
        border: buttonBorder,
        background: buttonBg,
        color: buttonText,
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

function SmallActionButton({
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
    ? "#111827"
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
        height: 36,
        padding: "0 12px",
        borderRadius: 10,
        border: primary ? "none" : `1px solid ${theme.border}`,
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 12,
        cursor: "pointer",
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

function InvestorCard({
  item,
  theme,
  onAssignQuota,
  onOpenQuotas,
}: {
  item: InvestorItem;
  theme: ThemeShape;
  onAssignQuota?: () => void;
  onOpenQuotas?: () => void;
}) {
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const innerCardBg = theme.isDark ? "#111827" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const regionCount = item.regions.length;

  return (
    <div
      style={{
        background: subtleCard,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
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
            {item.email || "Sem e-mail"} {item.phone ? `• ${item.phone}` : ""}
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#2563eb",
            background: theme.isDark ? "rgba(37,99,235,0.14)" : "#eaf1ff",
            padding: "6px 10px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {item.activeQuotaCount} cota(s)
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: muted }}>Documento</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.document || "-"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Valor investido estimado</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 800,
              color: "#22c55e",
            }}
          >
            {money(item.estimatedInvestedCents / 100)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Regiões</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {regionCount}
          </div>
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
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: theme.text,
            marginBottom: 10,
          }}
        >
          Regiões vinculadas
        </div>

        {item.regions.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: muted,
            }}
          >
            Nenhuma cota ativa vinculada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {item.regions.map((region) => (
              <div
                key={region.regionId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: theme.isDark ? "#0b1324" : "#ffffff",
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
                    {region.regionName}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: muted,
                    }}
                  >
                    {region.quotaCount} cota(s) • #{region.quotaNumbers.join(", #")}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#2563eb",
                    whiteSpace: "nowrap",
                  }}
                >
                  {region.quotaCount} ativa(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {item.notes ? (
        <div
          style={{
            fontSize: 13,
            color: muted,
            lineHeight: 1.5,
          }}
        >
          {item.notes}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <SmallActionButton
          label="Vincular mais cotas"
          theme={theme}
          primary
          onClick={onAssignQuota}
        />
        <SmallActionButton
          label="Gestão de cotas"
          theme={theme}
          onClick={onOpenQuotas}
        />
      </div>
    </div>
  );
}

export default function InvestorsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InvestorItem[]>([]);
  const [search, setSearch] = useState("");

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const inputBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/investors", {
        cache: "no-store",
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar investidores.");
      }

      const data = raw as InvestorsResponse;

      setItems(data.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar dados."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return items;

    return items.filter((item) => {
      const regionNames = item.regions.map((region) => region.regionName).join(" ");
      const haystack = [
        item.name,
        item.email,
        item.phone,
        item.document,
        item.notes,
        regionNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [items, search]);

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.investorCount += 1;
        acc.activeQuotaCount += item.activeQuotaCount;
        acc.estimatedInvestedCents += item.estimatedInvestedCents;
        acc.regionCount += item.regions.length;
        return acc;
      },
      {
        investorCount: 0,
        activeQuotaCount: 0,
        estimatedInvestedCents: 0,
        regionCount: 0,
      }
    );
  }, [filteredItems]);

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
            🧾 / Investidores
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Investidores
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Lista de cotistas, regiões vinculadas e volume investido estimado.
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
            label="Novo Investidor"
            theme={theme}
            onClick={() => router.push("/investors/new")}
          />

          <ActionButton
            label="Vincular Cotas"
            theme={theme}
            primary
            onClick={() => router.push("/investors/assign-quota")}
          />

          <ActionButton
            label="Gestão de Cotas"
            theme={theme}
            onClick={() => router.push("/investors/quotas")}
          />

          <ActionButton
            label="Distribuição"
            theme={theme}
            onClick={() => router.push("/investors/distributions")}
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
          title="Investidores"
          value={String(totals.investorCount)}
          theme={theme}
        />
        <SummaryCard
          title="Cotas Ativas"
          value={String(totals.activeQuotaCount)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Valor Investido"
          value={money(totals.estimatedInvestedCents / 100)}
          theme={theme}
          color="#22c55e"
        />
        <SummaryCard
          title="Participações em Regiões"
          value={String(totals.regionCount)}
          theme={theme}
        />
      </div>

      <Block
        title="Lista de Investidores"
        theme={theme}
        right={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, documento, contato ou região..."
            style={{
              width: 320,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: inputBg,
              color: theme.text,
              padding: "0 12px",
              outline: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          />
        }
      >
        {loading ? (
          <div
            style={{
              padding: "12px 2px",
              color: muted,
              fontWeight: 700,
            }}
          >
            Carregando investidores...
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
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: "12px 2px",
              color: muted,
              fontWeight: 700,
            }}
          >
            Nenhum investidor encontrado.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {filteredItems.map((item) => (
              <InvestorCard
                key={item.id}
                item={item}
                theme={theme}
                onAssignQuota={() => router.push("/investors/assign-quota")}
                onOpenQuotas={() => router.push("/investors/quotas")}
              />
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}

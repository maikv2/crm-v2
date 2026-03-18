"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type RepresentativeItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  regionId?: string | null;
  stockLocationId?: string | null;
  regionName?: string | null;
  stockLocationName?: string | null;
};

type RepresentativesResponse = {
  items: RepresentativeItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

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
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
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
          fontSize: 18,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
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

function RepresentativeCard({
  item,
  theme,
}: {
  item: RepresentativeItem;
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
            {item.email}
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
          {item.active ? "Ativo" : "Inativo"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
          <div style={{ fontSize: 12, color: muted }}>Telefone</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 16,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.phone?.trim() ? item.phone : "-"}
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
          <div style={{ fontSize: 12, color: muted }}>Cadastro</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 16,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {formatDate(item.createdAt)}
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
          <div style={{ fontSize: 12, color: muted }}>Região</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 16,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.regionName || "Não vinculada"}
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
          <div style={{ fontSize: 12, color: muted }}>Estoque</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 16,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {item.stockLocationName || "Não vinculado"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RepresentativesPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RepresentativeItem[]>([]);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/representatives", {
        cache: "no-store",
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar representantes.");
      }

      const data = raw as RepresentativesResponse;
      setItems(data.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar representantes."
      );
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
        acc.total += 1;
        if (item.active) acc.active += 1;
        if (item.regionId) acc.withRegion += 1;
        if (item.stockLocationId) acc.withStock += 1;
        return acc;
      },
      {
        total: 0,
        active: 0,
        withRegion: 0,
        withStock: 0,
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
            👤 / Representantes
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Representantes
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Gestão dos representantes, vínculo com região e estrutura operacional.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton label="Atualizar" theme={theme} onClick={loadData} />
          <ActionButton
            label="Novo Representante"
            theme={theme}
            onClick={() => router.push("/representatives/new")}
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
          title="Total de Representantes"
          value={String(totals.total)}
          theme={theme}
        />
        <SummaryCard
          title="Ativos"
          value={String(totals.active)}
          theme={theme}
          color="#22c55e"
        />
        <SummaryCard
          title="Com Região"
          value={String(totals.withRegion)}
          theme={theme}
          color="#2563eb"
        />
        <SummaryCard
          title="Com Estoque"
          value={String(totals.withStock)}
          theme={theme}
        />
      </div>

      <Block title="Lista de Representantes" theme={theme}>
        {loading ? (
          <div
            style={{
              padding: "12px 2px",
              color: muted,
              fontWeight: 700,
            }}
          >
            Carregando representantes...
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
            Nenhum representante encontrado.
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
              <RepresentativeCard key={item.id} item={item} theme={theme} />
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}
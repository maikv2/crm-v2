"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type InvestorOption = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  document?: string | null;
};

type RegionOption = {
  id: string;
  name: string;
  maxQuotaCount: number;
  quotaValueCents: number;
  targetClients: number;
};

type ActiveShareItem = {
  id: string;
  regionId: string;
  investorId: string | null;
  quotaNumber: number;
  amountCents: number;
  investedAt: string;
};

type AssignQuotaResponse = {
  investors: InvestorOption[];
  regions: RegionOption[];
  activeShares: ActiveShareItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ActionButton({
  label,
  theme,
  onClick,
  primary,
  disabled,
  type = "button",
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
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
    : theme.isDark
    ? "#ffffff"
    : theme.text;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: primary ? "none" : `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
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
  return (
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

export default function AssignQuotaPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [activeShares, setActiveShares] = useState<ActiveShareItem[]>([]);

  const [investorId, setInvestorId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [quotaCount, setQuotaCount] = useState(1);
  const [quotaValue, setQuotaValue] = useState(0);
  const [investedAt, setInvestedAt] = useState(toDateInputValue(new Date()));

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const inputBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const subtleCard = theme.isDark ? "#111827" : "#f8fafc";

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/investors/assign-quota", {
        cache: "no-store",
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar dados.");
      }

      const data = raw as AssignQuotaResponse;

      setInvestors(data.investors ?? []);
      setRegions(data.regions ?? []);
      setActiveShares(data.activeShares ?? []);

      if ((data.investors ?? []).length > 0) {
        setInvestorId((current) => current || data.investors[0].id);
      }

      if ((data.regions ?? []).length > 0) {
        const firstRegion = data.regions[0];

        setRegionId((current) => current || firstRegion.id);
        setQuotaValue((current) =>
          current > 0 ? current : firstRegion.quotaValueCents / 100
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedInvestor = useMemo(
    () => investors.find((item) => item.id === investorId) ?? null,
    [investors, investorId]
  );

  const selectedRegion = useMemo(
    () => regions.find((item) => item.id === regionId) ?? null,
    [regions, regionId]
  );

  const regionShares = useMemo(() => {
    if (!selectedRegion) return [];
    return activeShares.filter((item) => item.regionId === selectedRegion.id);
  }, [activeShares, selectedRegion]);

  const availableQuotaCount = useMemo(() => {
    if (!selectedRegion) return 0;
    return Math.max(0, selectedRegion.maxQuotaCount - regionShares.length);
  }, [selectedRegion, regionShares]);

  const nextAvailableQuotaNumbers = useMemo(() => {
    if (!selectedRegion) return [];

    const used = new Set(regionShares.map((item) => item.quotaNumber));
    const numbers: number[] = [];

    for (let number = 1; number <= selectedRegion.maxQuotaCount; number++) {
      if (!used.has(number)) {
        numbers.push(number);
      }
    }

    return numbers;
  }, [selectedRegion, regionShares]);

  const previewQuotaNumbers = useMemo(() => {
    return nextAvailableQuotaNumbers.slice(0, quotaCount);
  }, [nextAvailableQuotaNumbers, quotaCount]);

  const totalAmount = useMemo(() => {
    return Math.max(0, quotaCount) * Math.max(0, quotaValue);
  }, [quotaCount, quotaValue]);

  useEffect(() => {
    if (!selectedRegion) return;
    setQuotaValue(selectedRegion.quotaValueCents / 100);
  }, [selectedRegion]);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      if (!investorId) {
        throw new Error("Selecione o investidor.");
      }

      if (!regionId) {
        throw new Error("Selecione a região.");
      }

      if (quotaCount <= 0) {
        throw new Error("Informe uma quantidade de cotas válida.");
      }

      if (quotaValue <= 0) {
        throw new Error("Informe um valor por cota válido.");
      }

      const res = await fetch("/api/investors/assign-quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          investorId,
          regionId,
          quotaCount,
          amountCents: Math.round(quotaValue * 100),
          investedAt,
        }),
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao vincular cotas.");
      }

      router.push("/investors/quotas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular cotas.");
    } finally {
      setSaving(false);
    }
  }

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
            💰 / Investidores / Vincular Cotas
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Vincular Cotas ao Investidor
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Escolha o investidor, a região e a quantidade de cotas que ele está adquirindo.
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
            label="Investidores"
            theme={theme}
            onClick={() => router.push("/investors")}
          />
          <ActionButton
            label="Gestão de Cotas"
            theme={theme}
            onClick={() => router.push("/investors/quotas")}
          />
        </div>
      </div>

      <form onSubmit={save} style={{ display: "grid", gap: 18 }}>
        <Block title="Dados da Compra de Cotas" theme={theme}>
          {loading ? (
            <div
              style={{
                color: muted,
                fontWeight: 700,
              }}
            >
              Carregando...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    Investidor
                  </label>

                  <select
                    value={investorId}
                    onChange={(e) => setInvestorId(e.target.value)}
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color: theme.text,
                      padding: "0 12px",
                      outline: "none",
                      fontWeight: 700,
                    }}
                  >
                    {investors.map((investor) => (
                      <option key={investor.id} value={investor.id}>
                        {investor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    Região
                  </label>

                  <select
                    value={regionId}
                    onChange={(e) => setRegionId(e.target.value)}
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color: theme.text,
                      padding: "0 12px",
                      outline: "none",
                      fontWeight: 700,
                    }}
                  >
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    Quantidade de cotas
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, availableQuotaCount)}
                    value={quotaCount}
                    onChange={(e) =>
                      setQuotaCount(Math.max(1, Number(e.target.value) || 1))
                    }
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color: theme.text,
                      padding: "0 12px",
                      outline: "none",
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    Valor de cada cota
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={quotaValue}
                    onChange={(e) =>
                      setQuotaValue(Math.max(0, Number(e.target.value) || 0))
                    }
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color: theme.text,
                      padding: "0 12px",
                      outline: "none",
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    Data do investimento
                  </label>

                  <input
                    type="date"
                    value={investedAt}
                    onChange={(e) => setInvestedAt(e.target.value)}
                    style={{
                      height: 42,
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color: theme.text,
                      padding: "0 12px",
                      outline: "none",
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.8fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: muted,
                      marginBottom: 8,
                    }}
                  >
                    Próximas cotas que serão utilizadas
                  </div>

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: theme.text,
                    }}
                  >
                    {previewQuotaNumbers.length > 0
                      ? previewQuotaNumbers.map((item) => `#${item}`).join(", ")
                      : "Nenhuma cota disponível"}
                  </div>
                </div>

                <div
                  style={{
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: muted,
                      marginBottom: 8,
                    }}
                  >
                    Total do investimento
                  </div>

                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#22c55e",
                    }}
                  >
                    {money(totalAmount)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: muted }}>Região</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>
                    {selectedRegion?.name || "-"}
                  </div>
                </div>

                <div
                  style={{
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: muted }}>Cotas totais</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>
                    {selectedRegion?.maxQuotaCount ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: muted }}>Cotas ocupadas</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>
                    {regionShares.length}
                  </div>
                </div>

                <div
                  style={{
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: muted }}>Disponíveis</div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#2563eb",
                    }}
                  >
                    {availableQuotaCount}
                  </div>
                </div>
              </div>

              {selectedInvestor ? (
                <div
                  style={{
                    marginBottom: 16,
                    background: subtleCard,
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: muted,
                      marginBottom: 8,
                    }}
                  >
                    Investidor selecionado
                  </div>

                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {selectedInvestor.name}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: muted,
                    }}
                  >
                    {selectedInvestor.email || "Sem e-mail"}{" "}
                    {selectedInvestor.document ? `• ${selectedInvestor.document}` : ""}
                  </div>
                </div>
              ) : null}

              {error ? (
                <div
                  style={{
                    marginBottom: 16,
                    color: "#ef4444",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <ActionButton
                  label={saving ? "Salvando..." : "Salvar Vinculação"}
                  theme={theme}
                  primary
                  type="submit"
                  disabled={
                    saving ||
                    !investorId ||
                    !regionId ||
                    quotaCount <= 0 ||
                    quotaValue <= 0 ||
                    availableQuotaCount <= 0
                  }
                />

                <ActionButton
                  label="Cancelar"
                  theme={theme}
                  onClick={() => router.back()}
                />
              </div>
            </>
          )}
        </Block>
      </form>
    </div>
  );
}
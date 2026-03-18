"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type RegionItem = {
  id: string;
  name: string;
  active: boolean;
};

type StockLocationItem = {
  id: string;
  name: string;
  active: boolean;
};

type RegionsResponse = {
  items: RegionItem[];
};

type StockLocationsResponse = {
  items: StockLocationItem[];
};

export default function NewRepresentativePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const inputBg = colors.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = colors.isDark ? "#0e1728" : "#f8fafc";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("");
  const [stockLocationId, setStockLocationId] = useState("");

  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocationItem[]>([]);

  const [loadingDependencies, setLoadingDependencies] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasRegion = Boolean(regionId);
  const hasStockLocation = Boolean(stockLocationId);

  useEffect(() => {
    async function loadDependencies() {
      try {
        setLoadingDependencies(true);

        const [regionsRes, stockRes] = await Promise.all([
          fetch("/api/regions", { cache: "no-store" }),
          fetch("/api/stock-locations", { cache: "no-store" }),
        ]);

        if (regionsRes.ok) {
          const regionsData = (await regionsRes.json()) as RegionsResponse;
          setRegions(regionsData.items ?? []);
        } else {
          setRegions([]);
        }

        if (stockRes.ok) {
          const stockData = (await stockRes.json()) as StockLocationsResponse;
          setStockLocations(stockData.items ?? []);
        } else {
          setStockLocations([]);
        }
      } catch (error) {
        console.error("LOAD REPRESENTATIVE DEPENDENCIES ERROR:", error);
        setRegions([]);
        setStockLocations([]);
      } finally {
        setLoadingDependencies(false);
      }
    }

    loadDependencies();
  }, []);

  const summaryText = useMemo(() => {
    if (!hasRegion && !hasStockLocation) {
      return "Representante ainda sem vínculos operacionais definidos.";
    }

    if (hasRegion && hasStockLocation) {
      return "Representante pronto com região e local de estoque vinculados.";
    }

    if (hasRegion) {
      return "Representante vinculado à região, mas sem local de estoque definido.";
    }

    return "Representante sem região vinculada, mas com local de estoque definido.";
  }, [hasRegion, hasStockLocation]);

  async function createRepresentative(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Informe o nome do representante.");
      return;
    }

    if (!email.trim()) {
      alert("Informe o e-mail do representante.");
      return;
    }

    if (!password.trim() || password.trim().length < 4) {
      alert("Informe uma senha com pelo menos 4 caracteres.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/representatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          password: password.trim(),
          regionId: regionId || null,
          stockLocationId: stockLocationId || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        router.push("/representatives");
      } else {
        alert(data?.error || "Erro ao criar representante");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao criar representante");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 13,
    color: colors.text,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: inputBg,
    color: colors.text,
    outline: "none",
    fontSize: 14,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: colors.isDark
      ? "0 10px 30px rgba(2,6,23,0.35)"
      : "0 8px 24px rgba(15,23,42,0.06)",
  };

  const summaryCardStyle: React.CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 16,
    background: subtleCard,
  };

  return (
    <div
      style={{
        padding: 24,
        color: colors.text,
        background: colors.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: colors.subtext,
          marginBottom: 10,
        }}
      >
        👤 / Representantes / Novo Representante
      </div>

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
              fontSize: 22,
              fontWeight: 900,
              color: colors.text,
            }}
          >
            Novo Representante
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: colors.subtext,
            }}
          >
            Cadastre o representante, vincule região e estrutura operacional de atendimento.
          </div>
        </div>
      </div>

      <form
        onSubmit={createRepresentative}
        style={{ display: "grid", gap: 18, maxWidth: 1100 }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            Dados do Representante
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.3fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                style={inputStyle}
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Telefone</label>
              <input
                style={inputStyle}
                placeholder="Ex: (49) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>E-mail</label>
              <input
                type="email"
                style={inputStyle}
                placeholder="Ex: representante@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Senha inicial</label>
              <input
                type="password"
                style={inputStyle}
                placeholder="Mínimo 4 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Região</label>
              <select
                style={selectStyle}
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                disabled={loadingDependencies}
              >
                <option value="">Selecione uma região</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Local de estoque</label>
              <select
                style={selectStyle}
                value={stockLocationId}
                onChange={(e) => setStockLocationId(e.target.value)}
                disabled={loadingDependencies}
              >
                <option value="">Selecione um local de estoque</option>
                {stockLocations.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            Resumo Automático
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Nome informado
              </div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {name.trim() || "-"}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Região vinculada
              </div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {regions.find((item) => item.id === regionId)?.name || "Não definida"}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Estoque vinculado
              </div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {stockLocations.find((item) => item.id === stockLocationId)?.name ||
                  "Não definido"}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Status inicial
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#22c55e" }}>
                Ativo
              </div>
            </div>

            <div
              style={{
                ...summaryCardStyle,
                gridColumn: "1 / -1",
              }}
            >
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Situação operacional
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary }}>
                {summaryText}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              background: colors.cardBg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              background: colors.primary,
              color: "white",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Criando..." : "Criar Representante"}
          </button>
        </div>
      </form>
    </div>
  );
}
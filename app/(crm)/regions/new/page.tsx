"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function NewRegionPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const inputBg = colors.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = colors.isDark ? "#0e1728" : "#f8fafc";

  const [name, setName] = useState("");
  const [targetClients, setTargetClients] = useState(400);
  const [maxQuotaCount, setMaxQuotaCount] = useState(10);
  const [quotaValue, setQuotaValue] = useState(20000);
  const [monthlySalesTarget, setMonthlySalesTarget] = useState(0);
  const [quotaDistribution, setQuotaDistribution] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const totalInvestmentTarget = useMemo(() => {
    return Math.max(0, maxQuotaCount) * Math.max(0, quotaValue);
  }, [maxQuotaCount, quotaValue]);

  const clientsPerQuota = useMemo(() => {
    if (!maxQuotaCount || maxQuotaCount <= 0) return 0;
    return targetClients / maxQuotaCount;
  }, [targetClients, maxQuotaCount]);

  async function createRegion(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Informe o nome da região.");
      return;
    }

    if (maxQuotaCount <= 0) {
      alert("Informe um número de cotas maior que zero.");
      return;
    }

    if (quotaValue <= 0) {
      alert("Informe um valor de cota maior que zero.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/regions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          targetClients,
          maxQuotaCount,
          quotaValueCents: quotaValue * 100,
          monthlySalesTargetCents: monthlySalesTarget * 100,
          quotaDistribution: quotaDistribution.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        router.push("/regions");
      } else {
        alert(data?.error || "Erro ao criar região");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao criar região");
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

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 110,
    resize: "vertical",
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
        🏠 / Regiões / Nova Região
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
            Nova Região
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: colors.subtext,
            }}
          >
            Cadastre a região com metas, estrutura de cotas e informações estratégicas.
          </div>
        </div>
      </div>

      <form onSubmit={createRegion} style={{ display: "grid", gap: 18, maxWidth: 1100 }}>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            Dados da Região
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Nome da região</label>
              <input
                style={inputStyle}
                placeholder="Ex: Chapecó"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Meta de clientes</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="Ex: 400"
                value={targetClients}
                onChange={(e) => setTargetClients(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Total de cotas</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="Ex: 10"
                value={maxQuotaCount}
                onChange={(e) => setMaxQuotaCount(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div>
              <label style={labelStyle}>Valor de cada cota</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="Ex: 20000"
                value={quotaValue}
                onChange={(e) => setQuotaValue(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div>
              <label style={labelStyle}>Meta mensal de vendas</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="Ex: 50000"
                value={monthlySalesTarget}
                onChange={(e) =>
                  setMonthlySalesTarget(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Distribuição das cotas</label>
            <textarea
              style={textareaStyle}
              placeholder="Ex: 3 cotas investidor A, 2 cotas investidor B, 1 cota reserva da operação..."
              value={quotaDistribution}
              onChange={(e) => setQuotaDistribution(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Observações da região</label>
            <textarea
              style={textareaStyle}
              placeholder="Informações estratégicas, observações comerciais, potencial da região, detalhes importantes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
                Meta de clientes
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{targetClients}</div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Total de cotas
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{maxQuotaCount}</div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Clientes por cota
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {clientsPerQuota.toFixed(1)}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Valor por cota
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {money(quotaValue)}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Capital total da região
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: colors.primary }}>
                {money(totalInvestmentTarget)}
              </div>
            </div>

            <div style={summaryCardStyle}>
              <div style={{ color: colors.subtext, fontSize: 13, marginBottom: 6 }}>
                Meta mensal de vendas
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {money(monthlySalesTarget)}
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
            {saving ? "Criando..." : "Criar Região"}
          </button>
        </div>
      </form>
    </div>
  );
}
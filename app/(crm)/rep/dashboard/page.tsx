"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function RepHomePage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const region = "Chapecó";
      const res = await fetch(`/api/rep/agenda?region=${encodeURIComponent(region)}`);
      const json = await res.json();
      setData(json);
    }

    load();
  }, []);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const action: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    textDecoration: "none",
    fontWeight: 800,
  };

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando painel do representante...
      </div>
    );
  }

  const atrasados = data.atrasados?.length ?? 0;
  const hoje = data.hoje?.length ?? 0;
  const visitadosHoje = data.visitadosHoje?.length ?? 0;
  const proximos = data.proximos?.length ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1000 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 20 }}>
          Painel do Representante
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={card}>
            <div style={{ color: muted, fontSize: 13 }}>Clientes atrasados</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                marginTop: 8,
                color: atrasados > 0 ? "#ef4444" : theme.text,
              }}
            >
              {atrasados}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: muted, fontSize: 13 }}>Visitas de hoje</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
              {hoje}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: muted, fontSize: 13 }}>Visitados hoje</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
              {visitadosHoje}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: muted, fontSize: 13 }}>Próximas visitas</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
              {proximos}
            </div>
          </div>
        </div>

        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Ações rápidas
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/rep/agenda" style={action}>
              Abrir agenda
            </Link>

            <Link href="/clients" style={action}>
              Ver clientes
            </Link>

            <Link href="/rep/orders/new" style={action}>
              Novo pedido
            </Link>

            <Link href="/exhibitors" style={action}>
              Ver expositores
            </Link>
          </div>
        </div>

        {atrasados > 0 && (
          <div
            style={{
              ...card,
              border: "1px solid #ef4444",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
              ⚠ Atenção do dia
            </div>
            <div>
              Você tem <b>{atrasados}</b> cliente(s) com visita atrasada.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
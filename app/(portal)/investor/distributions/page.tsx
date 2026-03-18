"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function InvestorDistributionsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/investor-auth/me", {
      cache: "no-store",
    });

    const data = await res.json();

    setDistributions(data.distributions || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div style={{ padding: 30 }}>Carregando distribuições...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Distribuições</h1>

      <div
        style={{
          marginTop: 20,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%" }}>
          <thead
            style={{
              background: colors.hoverBg,
            }}
          >
            <tr>
              <th>Região</th>
              <th>Mês</th>
              <th>Cotas</th>
              <th>Valor por cota</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {distributions.map((dist) => (
              <tr key={dist.id}>
                <td>{dist.region?.name}</td>

                <td>
                  {String(dist.month).padStart(2, "0")}/{dist.year}
                </td>

                <td>{dist.quotaCount}</td>

                <td>{money(dist.valuePerQuotaCents)}</td>

                <td>{money(dist.totalDistributionCents)}</td>

                <td>{dist.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
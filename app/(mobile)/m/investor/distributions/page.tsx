"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

type DistributionItem = {
  id: string;
  month: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  status: string;
  region?: {
    name?: string | null;
  } | null;
};

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

export default function MobileInvestorDistributionsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ distributions?: DistributionItem[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/investor-auth/me", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/investor/login");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Erro ao carregar distribuições do investidor:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const distributions = useMemo(() => data?.distributions ?? [], [data]);

  return (
    <MobileInvestorPageFrame
      title="Distribuições"
      subtitle="Histórico de distribuições"
      desktopHref="/investor/distributions"
    >
      <MobileSectionTitle
        title="Distribuições"
        action={
          <button
            onClick={() => load(true)}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid #dbe3ef",
              background: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        }
      />

      {loading ? <p>Carregando distribuições...</p> : null}

      {!loading && distributions.length === 0 ? (
        <p>Nenhuma distribuição encontrada.</p>
      ) : null}

      {!loading &&
        distributions.map((dist) => (
          <MobileCard key={dist.id}>
            <MobileInfoRow
              title={formatMonthYear(dist.month, dist.year)}
              subtitle={`Região: ${dist.region?.name ?? "-"}`}
            />

            <MobileInfoRow title="Cotas" right={String(dist.quotaCount ?? 0)} />

            <MobileInfoRow
              title="Valor por cota"
              right={formatMoneyBR(dist.valuePerQuotaCents ?? 0)}
            />

            <MobileInfoRow
              title="Total"
              right={formatMoneyBR(dist.totalDistributionCents ?? 0)}
            />

            <MobileInfoRow title="Status" right={dist.status ?? "-"} />
          </MobileCard>
        ))}
    </MobileInvestorPageFrame>
  );
}
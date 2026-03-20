"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import MobileShell, {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  formatMoneyBR,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";

type ShareItem = {
  id: string;
  quotaNumber: number;
  amountCents: number;
  investedAt: string;
  region?: {
    name?: string | null;
  } | null;
};

export default function MobileInvestorQuotasPage() {
  const router = useRouter();
  const [data, setData] = useState<{ shares?: ShareItem[] } | null>(null);
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
      console.error("Erro ao carregar cotas do investidor:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load(true);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const shares = useMemo(() => data?.shares ?? [], [data]);

  return (
    <MobileInvestorPageFrame
      title="Minhas cotas"
      subtitle="Cotas vinculadas ao investidor"
      desktopHref="/investor/quotas"
    >
      <MobileSectionTitle
        title="Cotas"
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

      {loading ? <p>Carregando cotas...</p> : null}

      {!loading && shares.length === 0 ? <p>Nenhuma cota encontrada.</p> : null}

      {!loading &&
        shares.map((share) => (
          <MobileCard key={share.id}>
            <MobileInfoRow
              title={`Cota #${share.quotaNumber}`}
              subtitle={`Região: ${share.region?.name ?? "-"}`}
            />

            <MobileInfoRow
              title="Valor investido"
              right={formatMoneyBR(share.amountCents)}
            />

            <MobileInfoRow
              title="Data do investimento"
              right={formatDateBR(share.investedAt)}
            />
          </MobileCard>
        ))}
    </MobileInvestorPageFrame>
  );
}
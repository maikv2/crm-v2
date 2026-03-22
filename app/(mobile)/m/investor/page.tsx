"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ShareItem = {
  id: string;
  quotaNumber: number;
  amountCents: number;
};

type DistributionItem = {
  id: string;
  totalDistributionCents: number;
};

function RowLink({
  href,
  title,
  value,
}: {
  href: string;
  title: string;
  value: string;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 0",
          borderBottom: `1px solid ${colors.border}`,
          color: colors.text,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: colors.subtext }}>{value}</div>
      </div>
    </Link>
  );
}

function RowValue({
  title,
  value,
  last = false,
}: {
  title: string;
  value: string;
  last?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 13, color: colors.subtext }}>{value}</div>
    </div>
  );
}

export default function MobileInvestorDashboardPage() {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [distributions, setDistributions] = useState<DistributionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sharesRes, distributionsRes] = await Promise.all([
          fetch("/api/investor/shares", { cache: "no-store" }),
          fetch("/api/investor/distributions", { cache: "no-store" }),
        ]);

        const sharesJson = await sharesRes.json().catch(() => null);
        const distJson = await distributionsRes.json().catch(() => null);

        if (active) {
          setShares(sharesJson?.shares ?? []);
          setDistributions(distJson?.distributions ?? []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const investedCents = useMemo(() => {
    return shares.reduce((acc, s) => acc + (s.amountCents ?? 0), 0);
  }, [shares]);

  const totalDistributions = useMemo(() => {
    return distributions.reduce(
      (acc, d) => acc + (d.totalDistributionCents ?? 0),
      0
    );
  }, [distributions]);

  return (
    <MobileInvestorPageFrame
      title="Portal do investidor"
      subtitle="Resumo das suas cotas"
      desktopHref="/investor"
    >
      {loading ? (
        <MobileCard>Carregando informações...</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Total investido"
              value={formatMoneyBR(investedCents)}
              helper={`${shares.length} cotas`}
            />

            <MobileStatCard
              label="Distribuições"
              value={formatMoneyBR(totalDistributions)}
              helper="Total recebido"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Acesso rápido" />

            <RowLink
              href="/m/investor/quotas"
              title="Minhas cotas"
              value="Ver detalhes"
            />

            <RowLink
              href="/m/investor/distributions"
              title="Distribuições"
              value="Ver histórico"
            />

            <RowLink
              href="/m/investor/portal"
              title="Portal completo"
              value="Abrir"
            />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Resumo das cotas" />

            {shares.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma cota encontrada.</div>
            ) : (
              shares.slice(0, 4).map((share, index) => (
                <RowValue
                  key={share.id}
                  title={`Cota #${share.quotaNumber}`}
                  value={formatMoneyBR(share.amountCents)}
                  last={index === Math.min(shares.length, 4) - 1}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileInvestorPageFrame>
  );
}
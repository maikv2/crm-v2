"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  PlusCircle,
  UserPlus,
  Wrench,
} from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RepAgendaResponse = {
  atrasados?: any[];
  hoje?: any[];
  proximos?: any[];
  visitadosHoje?: any[];
  regionName?: string | null;
};

type RepCommissionsResponse = {
  dayCommissionCents?: number;
  weekCommissionCents?: number;
  monthCommissionCents?: number;
};

type RepOrdersResponse = {
  items?: Array<{
    id: string;
    number?: number;
    totalCents?: number;
    issuedAt?: string | Date;
    createdAt?: string | Date;
  }>;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function Shortcut({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: colors.isDark ? "#111827" : "#e8f0ff",
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileCard
      style={{
        padding: 14,
        background: highlight
          ? colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)"
          : undefined,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: highlight ? (colors.isDark ? "#cbd5e1" : "#475569") : colors.subtext,
          lineHeight: 1.35,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: 900,
          color: colors.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </MobileCard>
  );
}

export default function RepMobileDashboardPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [ordersData, setOrdersData] = useState<RepOrdersResponse | null>(null);
  const [agendaData, setAgendaData] = useState<RepAgendaResponse | null>(null);
  const [commissionData, setCommissionData] = useState<RepCommissionsResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);

        const [ordersRes, agendaRes, commissionsRes] = await Promise.all([
          fetch("/api/rep/orders", { cache: "no-store" }),
          fetch("/api/rep/agenda", { cache: "no-store" }),
          fetch("/api/rep/commissions", { cache: "no-store" }),
        ]);

        const ordersJson = await ordersRes.json().catch(() => null);
        const agendaJson = await agendaRes.json().catch(() => null);
        const commissionsJson = await commissionsRes.json().catch(() => null);

        if (!active) return;

        setOrdersData(ordersRes.ok ? (ordersJson as RepOrdersResponse) : { items: [] });
        setAgendaData(agendaRes.ok ? (agendaJson as RepAgendaResponse) : {});
        setCommissionData(
          commissionsRes.ok ? (commissionsJson as RepCommissionsResponse) : {}
        );
      } catch (error) {
        console.error(error);
        if (!active) return;
        setOrdersData({ items: [] });
        setAgendaData({});
        setCommissionData({});
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const weekSalesCents = useMemo(() => {
    const weekStart = startOfWeek();
    const todayEnd = endOfDay();

    return (ordersData?.items ?? []).reduce((acc, order) => {
      const baseDate = order.issuedAt ?? order.createdAt;
      if (!baseDate) return acc;

      const orderDate = new Date(baseDate);
      if (Number.isNaN(orderDate.getTime())) return acc;

      if (orderDate >= weekStart && orderDate <= todayEnd) {
        return acc + (order.totalCents ?? 0);
      }

      return acc;
    }, 0);
  }, [ordersData]);

  const weekCommissionCents = commissionData?.weekCommissionCents ?? 0;
  const overdueVisits = agendaData?.atrasados?.length ?? 0;
  const nextVisits = agendaData?.proximos?.length ?? 0;

  return (
    <MobileRepPageFrame
      title="Representante"
      subtitle="Resumo e acessos rápidos"
      desktopHref="/rep"
    >
      <div style={{ display: "grid", gap: 12 }}>
        <SummaryCard
          label="Vendas reais da semana"
          value={loading ? "..." : money(weekSalesCents)}
          highlight
        />

        <SummaryCard
          label="Comissão total da semana"
          value={loading ? "..." : money(weekCommissionCents)}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 12,
          }}
        >
          <SummaryCard
            label="Visitas atrasadas"
            value={loading ? "..." : String(overdueVisits)}
          />

          <SummaryCard
            label="Próximas visitas"
            value={loading ? "..." : String(nextVisits)}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 900,
          color: colors.text,
        }}
      >
        Acessos rápidos
      </div>

      <Shortcut
        href="/m/rep/orders/new"
        title="Novo pedido"
        subtitle="Abrir pedido do representante"
        icon={<PlusCircle size={20} />}
      />

      <Shortcut
        href="/m/rep/clients/new"
        title="Novo cliente"
        subtitle="Cadastrar novo cliente"
        icon={<UserPlus size={20} />}
      />

      <Shortcut
        href="/m/rep/exhibitors"
        title="Novo expositor"
        subtitle="Cadastrar ou acessar expositores"
        icon={<Wrench size={20} />}
      />

      <Shortcut
        href="/rep/visit"
        title="Registrar visitas"
        subtitle="Registrar visita sem venda"
        icon={<CalendarDays size={20} />}
      />
    </MobileRepPageFrame>
  );
}
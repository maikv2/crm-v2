"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  Users,
  Store,
  Package,
  Boxes,
  ShoppingCart,
  PlusCircle,
  DollarSign,
  FileText,
  Wallet,
  ArrowRightLeft,
  BarChart3,
  Coins,
  CircleDollarSign,
  Map,
  CalendarDays,
  UserCog,
  BriefcaseBusiness,
  Bell,
  Target,
} from "lucide-react";

import { useTheme } from "../providers/theme-provider";
import { useEffect, useState } from "react";

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "REPRESENTATIVE" | "INVESTOR" | "ADMINISTRATIVE" | string;
  regionId?: string | null;
  stockLocationId?: string | null;
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  if (pathname.startsWith("/m/")) {
    return null;
  }

  const dark = theme === "dark";

  const [user, setUser] = useState<LoggedUser | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (active) setUser(null);
          return;
        }
        const json = await res.json();
        if (active) setUser(json?.user ?? null);
      } catch (error) {
        console.error(error);
        if (active) setUser(null);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [pathname]);

  const isRepresentative = user?.role === "REPRESENTATIVE";
  const isAdministrative = user?.role === "ADMINISTRATIVE";

  function isActivePath(currentPath: string, itemPath: string) {
    if (itemPath === "/") return currentPath === "/";
    return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
  }

  function Item({
    icon: Icon,
    label,
    path,
    badge,
  }: {
    icon: any;
    label: string;
    path: string;
    badge?: number;
  }) {
    const active = isActivePath(pathname, path);
    const [hover, setHover] = useState(false);

    const textColor = active
      ? "#2563eb"
      : hover
      ? "#2563eb"
      : dark
      ? "#cbd5e1"
      : "#374151";

    return (
      <div
        onClick={() => router.push(path)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: 500,
          background: active ? (dark ? "#1e293b" : "#e8f0ff") : "transparent",
          color: textColor,
          transition: "all .15s ease",
        }}
      >
        {active && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 6,
              bottom: 6,
              width: 4,
              borderRadius: 4,
              background: "#2563eb",
            }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon size={18} />
          {label}
        </div>
        {badge ? (
          <span
            style={{
              background: "#ef4444",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 999,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
    );
  }

  function Section({ title }: { title: string }) {
    return (
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          fontWeight: 700,
          color: dark ? "#94a3b8" : "#9ca3af",
          marginTop: 24,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
    );
  }

  return (
    <aside
      style={{
        width: 260,
        background: dark ? "#0f172a" : "#ffffff",
        borderRight: dark ? "1px solid #1e293b" : "1px solid #e5e7eb",
        padding: 20,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}
      >
        <img
          src={dark ? "/logo_branca.svg" : "/logo.svg"}
          style={{ width: 60 }}
          alt="Logo"
        />
      </div>

      {isAdministrative ? (
        <>
          <Section title="FINANCEIRO" />
          <Item icon={DollarSign} label="Financeiro" path="/finance" />
          <Item
            icon={FileText}
            label="Contas a Receber"
            path="/finance/receivables"
          />
          <Item
            icon={FileText}
            label="Contas a Pagar"
            path="/finance/payables"
          />
          <Item
            icon={Wallet}
            label="Caixa da Região"
            path="/finance/region-cash"
          />
          <Item
            icon={ArrowRightLeft}
            label="Repasses → Matriz"
            path="/finance/transfers"
          />

          <Section title="INVESTIDORES" />
          <Item icon={BarChart3} label="Cotistas" path="/investors/dashboard" />
          <Item icon={Coins} label="Cotas" path="/investors/quotas" />
          <Item
            icon={CircleDollarSign}
            label="Repasses Investidores"
            path="/investors/distributions"
          />

          <Section title="RELATÓRIOS" />
          <Item icon={BarChart3} label="Relatórios Financeiros" path="/reports/finance" />
        </>
      ) : isRepresentative ? (
        <>
          <Section title="PRINCIPAL" />
          <Item icon={LayoutDashboard} label="Dashboard" path="/rep" />
          <Item
            icon={PieChart}
            label="Painel de Vendas"
            path="/rep/sales-dashboard"
          />
          <Item icon={CalendarDays} label="Agenda" path="/rep/agenda" />
          <Item icon={Map} label="Mapa Comercial" path="/rep/map" />
          <Item
            icon={BriefcaseBusiness}
            label="Centro de Operações"
            path="/rep/operations"
          />

          <Section title="CADASTROS" />
          <Item icon={Users} label="Clientes" path="/rep/clients" />
          <Item icon={Store} label="Expositores" path="/rep/exhibitors" />
          <Item icon={Target} label="Prospectos" path="/rep/prospects" />

          <Section title="OPERAÇÕES" />
          <Item icon={Boxes} label="Estoque" path="/rep/stock" />
          <Item icon={ShoppingCart} label="Pedidos" path="/rep/orders" />
          <Item icon={PlusCircle} label="Novo Pedido" path="/rep/orders/new" />

          <Section title="FINANCEIRO" />
          <Item icon={DollarSign} label="Financeiro" path="/rep/finance" />
          <Item
            icon={CircleDollarSign}
            label="Minhas Comissões"
            path="/rep/finance/commissions"
          />
          <Item
            icon={FileText}
            label="Contas a Receber"
            path="/rep/finance/receivables"
          />
          <Item
            icon={Wallet}
            label="Caixa da Região"
            path="/rep/finance/region-cash"
          />
          <Item
            icon={ArrowRightLeft}
            label="Repasses → Matriz"
            path="/rep/finance/transfers"
          />
        </>
      ) : (
        <>
          <Section title="PRINCIPAL" />
          <Item icon={LayoutDashboard} label="Dashboard" path="/dashboard" />
          <Item
            icon={PieChart}
            label="Painel de Vendas"
            path="/sales-dashboard"
          />
          <Item icon={Map} label="Mapa Comercial" path="/map" />
          <Item icon={Bell} label="Alertas" path="/alerts" />

          <Section title="CADASTROS" />
          <Item icon={Users} label="Clientes" path="/clients" />
          <Item icon={Target} label="Prospectos" path="/prospects" />
          <Item icon={UserCog} label="Representantes" path="/representatives" />
          <Item icon={Map} label="Regiões" path="/regions" />
          <Item icon={Store} label="Expositores" path="/exhibitors" />
          <Item icon={Package} label="Produtos" path="/products" />

          <Section title="OPERAÇÕES" />
          <Item icon={Boxes} label="Estoque" path="/stock" />
          <Item icon={ShoppingCart} label="Pedidos" path="/orders" />
          <Item icon={PlusCircle} label="Novo Pedido" path="/orders/new" />

          <Section title="FINANCEIRO" />
          <Item icon={DollarSign} label="Financeiro" path="/finance" />
          <Item
            icon={FileText}
            label="Contas a Receber"
            path="/finance/receivables"
          />
          <Item
            icon={FileText}
            label="Contas a Pagar"
            path="/finance/payables"
          />
          <Item
            icon={Wallet}
            label="Caixa da Região"
            path="/finance/region-cash"
          />
          <Item
            icon={ArrowRightLeft}
            label="Repasses → Matriz"
            path="/finance/transfers"
          />

          <Section title="COTAS" />
          <Item icon={Coins} label="Gestão de Cotas" path="/investors/quotas" />
          <Item
            icon={CircleDollarSign}
            label="Distribuição"
            path="/investors/distributions"
          />

          <Section title="RELATÓRIOS" />
          <Item icon={BarChart3} label="Relatórios" path="/reports" />
          <Item icon={BarChart3} label="Relatórios Financeiros" path="/reports/finance" />
        </>
      )}
    </aside>
  );
}

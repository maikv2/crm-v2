import {
  Home,
  Package,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type RepMobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const repMobileNavItems: RepMobileNavItem[] = [
  { label: "Início", href: "/m/rep", icon: Home },
  { label: "Pedidos", href: "/m/rep/orders", icon: Package },
  { label: "Financeiro", href: "/m/rep/finance", icon: Wallet },
  { label: "Clientes", href: "/m/rep/clients", icon: Users },
  { label: "OP", href: "/m/rep/operations", icon: Wrench },
];

export const repOperationLinks = {
  clients: "/m/rep/clients",
  orders: "/m/rep/orders",
  commissions: "/m/rep/finance/commissions",
  finance: "/m/rep/finance",
  operations: "/m/rep/operations",
  visit: "/m/rep/visit",
  exhibitors: "/m/rep/exhibitors",
  prospects: "/m/rep/prospects",
  map: "/m/rep/map",
};
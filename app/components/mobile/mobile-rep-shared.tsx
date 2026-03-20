import {
  Home,
  MoreHorizontal,
  Package,
  Users,
  Wallet,
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
  { label: "Mais", href: "/m/rep/operations", icon: MoreHorizontal },
];

export const repOperationLinks = {
  clients: "/m/rep/clients",
  orders: "/m/rep/orders",
  commissions: "/m/rep/commissions",
  finance: "/m/rep/finance",
  operations: "/m/rep/operations",
  visit: "/m/rep/visit",
  exhibitors: "/m/rep/operations",
  prospects: "/m/rep/operations",
  maintenance: "/m/rep/operations",
};
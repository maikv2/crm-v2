import {
  CalendarDays,
  Home,
  Package,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";

export type RepMobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const repMobileNavItems: RepMobileNavItem[] = [
  { label: "Início", href: "/m/rep", icon: Home },
  { label: "Agenda", href: "/m/rep/agenda", icon: CalendarDays },
  { label: "Rotas", href: "/m/rep/routes", icon: Route },
  { label: "Pedidos", href: "/m/rep/orders", icon: Package },
  { label: "Clientes", href: "/m/rep/clients", icon: Users },
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

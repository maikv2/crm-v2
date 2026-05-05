import {
  BarChart3,
  Home,
  Landmark,
  MoreHorizontal,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const adminMobileNavItems = [
  { label: "Início", href: "/m/admin", icon: Home },
  {
    label: "Vendas",
    href: "/m/admin/sales",
    icon: ShoppingCart,
    matchPrefixes: ["/m/admin/sales", "/m/admin/orders"],
  },
  {
    label: "Financeiro",
    href: "/m/admin/finance",
    icon: Wallet,
    matchPrefixes: ["/m/admin/finance", "/m/finance"],
  },
  {
    label: "Cadastros",
    href: "/m/admin/cadastros",
    icon: Users,
    matchPrefixes: [
      "/m/admin/cadastros",
      "/m/admin/clients",
      "/m/admin/exhibitors",
      "/m/admin/prospects",
      "/m/admin/representatives",
      "/m/admin/regions",
    ],
  },
  {
    label: "Mais",
    href: "/m/admin/more",
    icon: MoreHorizontal,
    matchPrefixes: [
      "/m/admin/more",
      "/m/admin/alerts",
      "/m/admin/map",
      "/m/admin/settings",
      "/m/admin/reports",
    ],
  },
];

export const financeMobileNavItems = [
  {
    label: "Início",
    href: "/m/admin/finance",
    icon: Home,
  },
  {
    label: "Receber",
    href: "/m/admin/finance/receivables",
    icon: Wallet,
    matchPrefixes: ["/m/admin/finance/receivables"],
  },
  {
    label: "Pagar",
    href: "/m/finance/payables",
    icon: Receipt,
    matchPrefixes: ["/m/finance/payables"],
  },
  {
    label: "Caixa",
    href: "/m/finance/region-cash",
    icon: Landmark,
    matchPrefixes: [
      "/m/finance/region-cash",
      "/m/admin/finance/transfers",
      "/m/finance/investor-distributions",
    ],
  },
  {
    label: "Relatórios",
    href: "/m/finance/reports",
    icon: BarChart3,
    matchPrefixes: [
      "/m/finance/reports",
      "/m/finance/investors",
    ],
  },
];

export type MobileHubItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};
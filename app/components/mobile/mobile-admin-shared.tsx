import {
  BarChart3,
  HandCoins,
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
    matchPrefixes: ["/m/admin/finance"],
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
    href: "/m/admin/finance/payables",
    icon: Receipt,
    matchPrefixes: ["/m/admin/finance/payables"],
  },
  {
    label: "Caixa",
    href: "/m/admin/finance/region-cash",
    icon: Landmark,
    matchPrefixes: [
      "/m/admin/finance/region-cash",
      "/m/admin/finance/transfers",
      "/m/admin/finance/investor-distributions",
    ],
  },
  {
    label: "Relatórios",
    href: "/m/admin/finance/reports",
    icon: BarChart3,
    matchPrefixes: [
      "/m/admin/finance/reports",
      "/m/admin/finance/investors",
    ],
  },
];

export type MobileHubItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};
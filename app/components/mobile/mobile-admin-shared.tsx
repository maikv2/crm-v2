import {
  Home,
  MoreHorizontal,
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

export type MobileHubItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

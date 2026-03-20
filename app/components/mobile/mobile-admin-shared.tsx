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
  { label: "Vendas", href: "/m/admin/sales", icon: ShoppingCart },
  { label: "Financeiro", href: "/m/admin/finance", icon: Wallet },
  { label: "Cadastros", href: "/m/admin/cadastros", icon: Users },
  { label: "Mais", href: "/m/admin/more", icon: MoreHorizontal },
];

export type MobileHubItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};
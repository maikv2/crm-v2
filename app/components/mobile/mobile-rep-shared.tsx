import {
  BriefcaseBusiness,
  Home,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

export const repMobileNavItems = [
  { label: "Início", href: "/m/rep", icon: Home },
  { label: "Pedidos", href: "/m/rep/orders", icon: ShoppingCart },
  { label: "Clientes", href: "/m/rep/clients", icon: Users },
  { label: "Financeiro", href: "/m/rep/finance", icon: Wallet },
  { label: "Operações", href: "/m/rep/operations", icon: BriefcaseBusiness },
];
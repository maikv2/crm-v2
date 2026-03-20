import {
  ClipboardList,
  Home,
  ShoppingCart,
  ToolCase,
  Wrench,
} from "lucide-react";

export const clientMobileNavItems = [
  { label: "Início", href: "/m/client", icon: Home },
  { label: "Pedidos", href: "/m/client/orders", icon: ShoppingCart },
  { label: "Solicitar", href: "/m/client/order-request", icon: ClipboardList },
  { label: "Visita", href: "/m/client/visit", icon: ToolCase },
  { label: "Manutenção", href: "/m/client/maintenance", icon: Wrench },
];
import {
  CircleDollarSign,
  Coins,
  FileBarChart2,
  Home,
} from "lucide-react";

export const investorMobileNavItems = [
  { label: "Início", href: "/m/investor", icon: Home },
  { label: "Cotas", href: "/m/investor/quotas", icon: Coins },
  { label: "Distribuições", href: "/m/investor/distributions", icon: CircleDollarSign },
  { label: "Relatório", href: "/m/investor/portal", icon: FileBarChart2 },
];
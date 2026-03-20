"use client";

import Link from "next/link";
import {
  Bell,
  Map,
  Settings,
  Shield,
} from "lucide-react";
import MobileShell, {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileAdminMorePage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const links = [
    { href: "/m/admin/alerts", label: "Central de alertas", icon: Bell },
    { href: "/m/admin/map", label: "Mapa comercial", icon: Map },
    { href: "/m/admin/settings", label: "Configurações", icon: Settings },
    { href: "/dashboard", label: "Voltar para desktop", icon: Shield },
  ];

  return (
    <MobileShell
      title="Mais"
      subtitle="Acessos complementares do admin"
      navItems={adminMobileNavItems}
      showBrand
    >
      <MobileCard>
        <MobileSectionTitle title="Ferramentas" />
        <div style={{ display: "grid", gap: 10 }}>
          {links.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{item.label}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </MobileCard>
    </MobileShell>
  );
}
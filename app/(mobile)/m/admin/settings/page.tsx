"use client";

import Link from "next/link";
import { LayoutDashboard, Monitor, Moon } from "lucide-react";
import MobileShell, { MobileCard, MobileSectionTitle } from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileAdminSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileShell
      title="Configurações"
      subtitle="Ajustes rápidos do app mobile"
      navItems={adminMobileNavItems}
      showBrand
    >
      <MobileCard>
        <MobileSectionTitle title="Tema" />
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            width: "100%",
            borderRadius: 16,
            padding: 14,
            background: colors.isDark ? "#111827" : "#f8fafc",
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: colors.text,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          <Moon size={18} />
          Alternar claro / escuro
        </button>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Acessos" />

        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/m/admin">
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
              <LayoutDashboard size={18} />
              <div style={{ fontSize: 14, fontWeight: 800 }}>Voltar ao dashboard mobile</div>
            </div>
          </Link>

          <Link href="/dashboard">
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
              <Monitor size={18} />
              <div style={{ fontSize: 14, fontWeight: 800 }}>Abrir versão desktop</div>
            </div>
          </Link>
        </div>
      </MobileCard>
    </MobileShell>
  );
}
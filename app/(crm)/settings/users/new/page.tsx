"use client";

import { useRouter } from "next/navigation";
import {
  Shield,
  UserCog,
  Briefcase,
  Users,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type UserTypeOption = {
  key: string;
  label: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: (isDark: boolean) => string;
};

const USER_TYPES: UserTypeOption[] = [
  {
    key: "ADMIN",
    label: "Admin",
    description:
      "Acesso completo ao CRM, configurações da empresa e gestão de usuários.",
    route: "/settings/users/new/admin",
    icon: <Shield size={20} />,
    iconColor: "#7c3aed",
    iconBg: (isDark) => (isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"),
  },
  {
    key: "REPRESENTATIVE",
    label: "Representante",
    description:
      "Vendedor vinculado a uma região, com acesso ao app comercial e às próprias comissões.",
    route: "/representatives/new",
    icon: <UserCog size={20} />,
    iconColor: "#2563eb",
    iconBg: (isDark) => (isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"),
  },
  {
    key: "INVESTOR",
    label: "Investidor",
    description:
      "Cotista da empresa, com acesso ao painel de cotas, distribuições e relatórios.",
    route: "/investors/new",
    icon: <Briefcase size={20} />,
    iconColor: "#16a34a",
    iconBg: (isDark) => (isDark ? "rgba(34,197,94,0.18)" : "#eaf8ef"),
  },
  {
    key: "CLIENT",
    label: "Cliente",
    description:
      "Cliente da distribuidora com acesso ao portal de pedidos e histórico de compras.",
    route: "/clients/new",
    icon: <Users size={20} />,
    iconColor: "#ea580c",
    iconBg: (isDark) => (isDark ? "rgba(249,115,22,0.18)" : "#fff1e8"),
  },
  {
    key: "ADMINISTRATIVE",
    label: "Financeiro",
    description:
      "Acesso restrito ao módulo financeiro, recebíveis, repasses e fechamentos.",
    route: "/settings/finance-user/new",
    icon: <DollarSign size={20} />,
    iconColor: "#0891b2",
    iconBg: (isDark) => (isDark ? "rgba(8,145,178,0.18)" : "#e0f2fe"),
  },
];

export default function NewUserSelectorPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  return (
    <div
      style={{
        minHeight: "100%",
        padding: 28,
        background: theme.pageBg,
        color: theme.text,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            ⚙️ / Configurações / Usuários e acessos / Novo usuário
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Qual tipo de usuário você quer cadastrar?
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            Escolha o perfil de acesso. Cada tipo tem permissões e telas
            diferentes dentro do CRM.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/settings/access")}
          style={{
            background: theme.cardBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "0 16px",
            height: 42,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Voltar
        </button>
      </div>

      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px 200px 1fr 60px",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${theme.border}`,
            fontSize: 12,
            fontWeight: 800,
            color: theme.subtext,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          <div></div>
          <div>Tipo</div>
          <div>Descrição</div>
          <div></div>
        </div>

        {USER_TYPES.map((option, idx) => (
          <button
            key={option.key}
            type="button"
            onClick={() => router.push(option.route)}
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "60px 200px 1fr 60px",
              gap: 12,
              padding: "18px",
              border: "none",
              borderTop: idx === 0 ? "none" : `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.text,
              cursor: "pointer",
              alignItems: "center",
              textAlign: "left",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.isDark
                ? "rgba(255,255,255,0.03)"
                : "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: option.iconBg(theme.isDark),
                color: option.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {option.icon}
            </div>

            <div style={{ fontWeight: 800, fontSize: 15 }}>{option.label}</div>

            <div
              style={{
                fontSize: 13,
                color: theme.subtext,
                lineHeight: 1.5,
              }}
            >
              {option.description}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                color: theme.subtext,
              }}
            >
              <ChevronRight size={18} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

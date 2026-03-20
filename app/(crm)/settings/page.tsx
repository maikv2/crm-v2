"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Settings2, Users } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function CardButton({
  title,
  description,
  icon,
  onClick,
  theme,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        border: `1px solid ${theme.border}`,
        background: hover ? (theme.isDark ? "#0f172a" : "#f8fafc") : theme.cardBg,
        padding: 20,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: theme.isDark ? "#111827" : "#eff6ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2563eb",
          marginBottom: 14,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: theme.text,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          color: theme.subtext,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </button>
  );
}

export default function SettingsHomePage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [user, setUser] = useState<LoggedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.user) {
          router.push("/login");
          return;
        }

        if (active) {
          setUser(json.user);
          if (json.user.role !== "ADMIN") {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
        router.push("/login");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100%",
          padding: 28,
          background: theme.pageBg,
          color: theme.text,
        }}
      >
        Carregando configurações...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100%",
        padding: 28,
        background: theme.pageBg,
        color: theme.text,
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.subtext,
            marginBottom: 10,
          }}
        >
          ⚙️ / Configurações
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 900,
          }}
        >
          Central de Configurações
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            color: theme.subtext,
          }}
        >
          Gerencie dados da empresa, acessos, senhas e segurança do CRM V2.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <CardButton
          title="Dados da empresa"
          description="Cadastre nome da empresa, CNPJ, contato, endereço, logo e observações institucionais."
          icon={<Building2 size={20} />}
          onClick={() => router.push("/settings/company")}
          theme={theme}
        />

        <CardButton
          title="Usuários e acessos"
          description="Gerencie admins, representantes, investidores e clientes com acesso ao portal."
          icon={<Users size={20} />}
          onClick={() => router.push("/settings/access")}
          theme={theme}
        />

        <CardButton
          title="Segurança e senhas"
          description="Troque a senha do admin, redefina credenciais e controle acessos do sistema."
          icon={<KeyRound size={20} />}
          onClick={() => router.push("/settings/security")}
          theme={theme}
        />

        <CardButton
          title="Configurações gerais"
          description="Área preparada para crescimento do CRM, com futuras regras de sistema, branding e preferências."
          icon={<Settings2 size={20} />}
          onClick={() => router.push("/settings/company")}
          theme={theme}
        />
      </div>

      <div
        style={{
          marginTop: 24,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          padding: 18,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          Admin logado
        </div>

        <div style={{ color: theme.subtext, fontSize: 14 }}>
          {user?.name} • {user?.email}
        </div>
      </div>
    </div>
  );
}
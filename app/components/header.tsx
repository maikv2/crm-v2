"use client";

import {
  Moon,
  Search,
  Settings,
  Sun,
  Plus,
  LogOut,
  Building2,
  Shield,
  KeyRound,
  Users,
  Smartphone,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "../providers/theme-provider";
import { getThemeColors } from "../../lib/theme";
import { useEffect, useRef, useState } from "react";

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/mobile/admin/clients")) return "Clientes";
  if (pathname.startsWith("/mobile/admin/dashboard")) return "Dashboard";
  if (pathname.startsWith("/mobile/admin/exhibitors")) return "Expositores";
  if (pathname.startsWith("/mobile/admin/products")) return "Produtos";
  if (pathname.startsWith("/mobile/admin/orders")) return "Pedidos";
  if (pathname.startsWith("/mobile/admin/finance")) return "Financeiro";
  if (pathname.startsWith("/mobile/admin/stock")) return "Estoque";
  if (pathname.startsWith("/mobile/admin/sales-dashboard")) return "Painel de Vendas";
  if (pathname.startsWith("/mobile/admin/regions")) return "Regiões";
  if (pathname.startsWith("/mobile/admin/investors")) return "Investidores";
  if (pathname.startsWith("/mobile/admin/representatives")) return "Representantes";
  if (pathname.startsWith("/mobile/admin/settings")) return "Configurações";

  if (pathname.startsWith("/mobile/rep/sales-dashboard")) return "Painel de Vendas";
  if (pathname.startsWith("/mobile/rep/agenda")) return "Agenda";
  if (pathname.startsWith("/mobile/rep/clients")) return "Clientes";
  if (pathname.startsWith("/mobile/rep/exhibitors")) return "Expositores";
  if (pathname.startsWith("/mobile/rep/stock")) return "Estoque";
  if (pathname.startsWith("/mobile/rep/orders")) return "Pedidos";
  if (pathname.startsWith("/mobile/rep/finance")) return "Financeiro";
  if (pathname.startsWith("/mobile/rep")) return "Representante";

  if (pathname.startsWith("/mobile/investor")) return "Investidor";

  if (pathname.startsWith("/clients")) return "Clientes";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/exhibitors")) return "Expositores";
  if (pathname.startsWith("/products")) return "Produtos";
  if (pathname.startsWith("/orders")) return "Pedidos";
  if (pathname.startsWith("/finance")) return "Financeiro";
  if (pathname.startsWith("/stock")) return "Estoque";
  if (pathname.startsWith("/sales-dashboard")) return "Painel de Vendas";
  if (pathname.startsWith("/regions")) return "Regiões";
  if (pathname.startsWith("/investors")) return "Investidores";
  if (pathname.startsWith("/representatives")) return "Representantes";
  if (pathname.startsWith("/settings")) return "Configurações";
  if (pathname.startsWith("/rep/sales-dashboard")) return "Painel de Vendas";
  if (pathname.startsWith("/rep/agenda")) return "Agenda";
  if (pathname.startsWith("/rep/clients")) return "Clientes";
  if (pathname.startsWith("/rep/exhibitors")) return "Expositores";
  if (pathname.startsWith("/rep/stock")) return "Estoque";
  if (pathname.startsWith("/rep/orders")) return "Pedidos";
  if (pathname.startsWith("/rep/finance")) return "Financeiro";
  if (pathname.startsWith("/rep")) return "Representante";
  if (pathname.startsWith("/investor")) return "Investidor";

  return "V2 CRM";
}

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function getDesktopBasePath(user: LoggedUser | null) {
  if (user?.role === "REPRESENTATIVE") return "/rep";
  if (user?.role === "INVESTOR") return "/investor";
  return "";
}

function getMobileBasePath(user: LoggedUser | null) {
  if (user?.role === "REPRESENTATIVE") return "/mobile/rep";
  if (user?.role === "INVESTOR") return "/mobile/investor";
  return "/mobile/admin";
}

function getToggleRoute(pathname: string, user: LoggedUser | null) {
  const mobileBase = getMobileBasePath(user);
  const desktopBase = getDesktopBasePath(user);

  const isMobileRoute =
    pathname.startsWith("/mobile/admin") ||
    pathname.startsWith("/mobile/rep") ||
    pathname.startsWith("/mobile/investor");

  if (isMobileRoute) {
    if (pathname.startsWith("/mobile/admin")) {
      const rest = pathname.replace("/mobile/admin", "") || "/dashboard";
      return `${desktopBase}${rest}`;
    }

    if (pathname.startsWith("/mobile/rep")) {
      const rest = pathname.replace("/mobile/rep", "") || "";
      return `${desktopBase}${rest || ""}`;
    }

    if (pathname.startsWith("/mobile/investor")) {
      const rest = pathname.replace("/mobile/investor", "") || "";
      return `${desktopBase}${rest || ""}`;
    }
  }

  if (user?.role === "REPRESENTATIVE") {
    if (pathname.startsWith("/rep")) {
      const rest = pathname.replace("/rep", "") || "";
      return `${mobileBase}${rest || ""}`;
    }

    return mobileBase;
  }

  if (user?.role === "INVESTOR") {
    if (pathname.startsWith("/investor")) {
      const rest = pathname.replace("/investor", "") || "";
      return `${mobileBase}${rest || ""}`;
    }

    return mobileBase;
  }

  if (pathname.startsWith("/rep") || pathname.startsWith("/investor")) {
    return mobileBase;
  }

  const rest = pathname || "/dashboard";
  return `${mobileBase}${rest === "/" ? "/dashboard" : rest}`;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const colors = getThemeColors(theme);

  const [openCadastros, setOpenCadastros] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const cadastrosRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const title = getPageTitle(pathname);
  const isRepresentative = user?.role === "REPRESENTATIVE";
  const isAdmin = user?.role === "ADMIN";
  const isMobileRoute =
    pathname.startsWith("/mobile/admin") ||
    pathname.startsWith("/mobile/rep") ||
    pathname.startsWith("/mobile/investor");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (active) setUser(null);
          return;
        }

        const json = await res.json();

        if (active) {
          setUser(json?.user ?? null);
        }
      } catch (error) {
        console.error(error);
        if (active) setUser(null);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (cadastrosRef.current && !cadastrosRef.current.contains(target)) {
        setOpenCadastros(false);
      }

      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setOpenSettings(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/auth/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoggingOut(false);
    }
  }

  function handleToggleMobile() {
    const nextRoute = getToggleRoute(pathname, user);

    try {
      localStorage.setItem("preferred_view_mode", isMobileRoute ? "desktop" : "mobile");
    } catch (error) {
      console.error(error);
    }

    router.push(nextRoute);
  }

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "AD";

  const userLabel = user?.name || "Admin";

  return (
    <header
      style={{
        height: 68,
        background: colors.headerBg,
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px 0 20px",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: colors.text,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 250,
            height: 40,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 14px",
            color: "#64748b",
          }}
        >
          <Search size={15} />
          <span style={{ fontSize: 14 }}>Buscar clientes, pedidos...</span>
        </div>

        <div ref={cadastrosRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              setOpenCadastros((prev) => !prev);
              setOpenSettings(false);
            }}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              color: colors.text,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <Plus size={15} />
            Cadastros
          </button>

          {openCadastros && (
            <div
              style={{
                position: "absolute",
                top: 45,
                right: 0,
                width: 210,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                padding: 6,
                zIndex: 50,
              }}
            >
              <div
                onClick={() => {
                  setOpenCadastros(false);
                  router.push("/clients/new");
                }}
                style={menuItemStyle(colors)}
              >
                Novo Cliente
              </div>

              <div
                onClick={() => {
                  setOpenCadastros(false);
                  router.push(isRepresentative ? "/rep/orders/new" : "/orders/new");
                }}
                style={menuItemStyle(colors)}
              >
                Novo Pedido
              </div>

              <div
                onClick={() => {
                  setOpenCadastros(false);
                  router.push("/exhibitors/new");
                }}
                style={menuItemStyle(colors)}
              >
                Novo Expositor
              </div>

              {!isRepresentative && (
                <>
                  <div
                    onClick={() => {
                      setOpenCadastros(false);
                      router.push("/products/new");
                    }}
                    style={menuItemStyle(colors)}
                  >
                    Novo Produto
                  </div>

                  <div
                    onClick={() => {
                      setOpenCadastros(false);
                      router.push("/investors/new");
                    }}
                    style={menuItemStyle(colors)}
                  >
                    Novo Investidor
                  </div>

                  <div
                    onClick={() => {
                      setOpenCadastros(false);
                      router.push("/regions/new");
                    }}
                    style={menuItemStyle(colors)}
                  >
                    Nova Região
                  </div>

                  <div
                    onClick={() => {
                      setOpenCadastros(false);
                      router.push("/representatives/new");
                    }}
                    style={menuItemStyle(colors)}
                  >
                    Novo Representante
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          style={{
            height: 40,
            minWidth: 76,
            padding: "0 10px",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: "pointer",
            color: colors.text,
          }}
        >
          {colors.isDark ? <Moon size={15} /> : <Sun size={15} />}
          <div
            style={{
              width: 30,
              height: 18,
              borderRadius: 999,
              background: colors.isDark ? "#1d4ed8" : "#d1d5db",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#ffffff",
                position: "absolute",
                top: 2,
                left: colors.isDark ? 14 : 2,
                transition: "all 0.2s ease",
              }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={handleToggleMobile}
          title={isMobileRoute ? "Voltar para modo normal" : "Abrir modo mobile"}
          style={{
            height: 40,
            minWidth: 108,
            padding: "0 12px",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            color: isMobileRoute ? "#2563eb" : colors.text,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <Smartphone size={16} />
          {isMobileRoute ? "Normal" : "Mobile"}
        </button>

        {isAdmin ? (
          <div ref={settingsRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setOpenSettings((prev) => !prev);
                setOpenCadastros(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#a78bfa",
              }}
            >
              <Settings size={16} />
            </button>

            {openSettings && (
              <div
                style={{
                  position: "absolute",
                  top: 45,
                  right: 0,
                  width: 250,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: colors.cardBg,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  padding: 6,
                  zIndex: 60,
                }}
              >
                <div
                  onClick={() => {
                    setOpenSettings(false);
                    router.push("/settings");
                  }}
                  style={menuItemWithIconStyle(colors)}
                >
                  <Shield size={15} />
                  Configurações gerais
                </div>

                <div
                  onClick={() => {
                    setOpenSettings(false);
                    router.push("/settings/company");
                  }}
                  style={menuItemWithIconStyle(colors)}
                >
                  <Building2 size={15} />
                  Dados da empresa
                </div>

                <div
                  onClick={() => {
                    setOpenSettings(false);
                    router.push("/settings/access");
                  }}
                  style={menuItemWithIconStyle(colors)}
                >
                  <Users size={15} />
                  Usuários e acessos
                </div>

                <div
                  onClick={() => {
                    setOpenSettings(false);
                    router.push("/settings/security");
                  }}
                  style={menuItemWithIconStyle(colors)}
                >
                  <KeyRound size={15} />
                  Segurança e senhas
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div
          style={{
            height: 40,
            padding: "0 12px 0 10px",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: colors.text,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {userInitials}
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {userLabel}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: colors.text,
            fontWeight: 700,
            fontSize: 13,
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          <LogOut size={15} />
          {loggingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}

function menuItemStyle(colors: any) {
  return {
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  };
}

function menuItemWithIconStyle(colors: any) {
  return {
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
}
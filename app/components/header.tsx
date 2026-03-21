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
  if (pathname.startsWith("/m/admin/clients")) return "Clientes";
  if (pathname.startsWith("/m/admin/exhibitors")) return "Expositores";
  if (pathname.startsWith("/m/admin/orders")) return "Pedidos";
  if (pathname.startsWith("/m/admin/finance/receivables")) return "Recebíveis";
  if (pathname.startsWith("/m/admin/finance/transfers")) return "Transferências";
  if (pathname.startsWith("/m/admin/finance")) return "Financeiro";
  if (pathname.startsWith("/m/admin/regions")) return "Regiões";
  if (pathname.startsWith("/m/admin/representatives")) return "Representantes";
  if (pathname.startsWith("/m/admin/prospects")) return "Prospectos";
  if (pathname.startsWith("/m/admin/map")) return "Mapa";
  if (pathname.startsWith("/m/admin/alerts")) return "Alertas";
  if (pathname.startsWith("/m/admin/sales")) return "Painel de Vendas";
  if (pathname.startsWith("/m/admin/settings")) return "Configurações";
  if (pathname.startsWith("/m/admin/cadastros")) return "Cadastros";
  if (pathname.startsWith("/m/admin/more")) return "Mais";
  if (pathname === "/m/admin") return "Dashboard";

  if (pathname.startsWith("/m/rep/clients")) return "Clientes";
  if (pathname.startsWith("/m/rep/orders")) return "Pedidos";
  if (pathname.startsWith("/m/rep/finance")) return "Financeiro";
  if (pathname.startsWith("/m/rep/commissions")) return "Comissões";
  if (pathname.startsWith("/m/rep/operations")) return "Operações";
  if (pathname.startsWith("/m/rep/visit")) return "Visitas";
  if (pathname === "/m/rep") return "Representante";

  if (pathname.startsWith("/m/investor/quotas")) return "Cotas";
  if (pathname.startsWith("/m/investor/distributions")) return "Distribuições";
  if (pathname.startsWith("/m/investor/portal")) return "Portal do Investidor";
  if (pathname === "/m/investor") return "Investidor";

  if (pathname.startsWith("/clients")) return "Clientes";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/exhibitors")) return "Expositores";
  if (pathname.startsWith("/products")) return "Produtos";
  if (pathname.startsWith("/orders")) return "Pedidos";
  if (pathname.startsWith("/finance/receivables")) return "Recebíveis";
  if (pathname.startsWith("/finance/transfers")) return "Transferências";
  if (pathname.startsWith("/finance/region-cash")) return "Caixa da Região";
  if (pathname.startsWith("/finance/new")) return "Novo Lançamento";
  if (pathname.startsWith("/finance")) return "Financeiro";
  if (pathname.startsWith("/stock/history")) return "Histórico de Estoque";
  if (pathname.startsWith("/stock/transfer")) return "Transferência de Estoque";
  if (pathname.startsWith("/stock/new")) return "Novo Estoque";
  if (pathname.startsWith("/stock")) return "Estoque";
  if (pathname.startsWith("/sales-dashboard")) return "Painel de Vendas";
  if (pathname.startsWith("/regions")) return "Regiões";
  if (pathname.startsWith("/investors")) return "Investidores";
  if (pathname.startsWith("/representatives")) return "Representantes";
  if (pathname.startsWith("/settings")) return "Configurações";
  if (pathname.startsWith("/prospects")) return "Prospectos";
  if (pathname.startsWith("/map")) return "Mapa";
  if (pathname.startsWith("/alerts")) return "Alertas";

  if (pathname.startsWith("/rep/sales-dashboard")) return "Painel de Vendas";
  if (pathname.startsWith("/rep/agenda")) return "Agenda";
  if (pathname.startsWith("/rep/clients")) return "Clientes";
  if (pathname.startsWith("/rep/exhibitors")) return "Expositores";
  if (pathname.startsWith("/rep/stock")) return "Estoque";
  if (pathname.startsWith("/rep/orders")) return "Pedidos";
  if (pathname.startsWith("/rep/finance")) return "Financeiro";
  if (pathname.startsWith("/rep/operations")) return "Operações";
  if (pathname.startsWith("/rep/prospects")) return "Prospectos";
  if (pathname.startsWith("/rep/map")) return "Mapa";
  if (pathname.startsWith("/rep/visit")) return "Visitas";
  if (pathname.startsWith("/rep/settlement")) return "Acerto";
  if (pathname.startsWith("/rep/dashboard")) return "Dashboard";
  if (pathname === "/rep") return "Representante";

  if (pathname.startsWith("/investor/quotas")) return "Cotas";
  if (pathname.startsWith("/investor/distributions")) return "Distribuições";
  if (pathname === "/investor") return "Investidor";

  return "V2 CRM";
}

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function startsWithSegment(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isMobileRoute(pathname: string) {
  return (
    startsWithSegment(pathname, "/m/admin") ||
    startsWithSegment(pathname, "/m/rep") ||
    startsWithSegment(pathname, "/m/investor")
  );
}

function desktopToMobile(pathname: string, user: LoggedUser | null) {
  if (user?.role === "REPRESENTATIVE") {
    if (
      pathname === "/rep" ||
      pathname === "/rep/dashboard" ||
      pathname === "/rep/sales-dashboard"
    ) {
      return "/m/rep";
    }

    if (startsWithSegment(pathname, "/rep/clients")) return "/m/rep/clients";
    if (pathname === "/rep/orders/new") return "/m/rep/orders/new";
    if (startsWithSegment(pathname, "/rep/orders")) return "/m/rep/orders";
    if (startsWithSegment(pathname, "/rep/finance/commissions")) return "/m/rep/commissions";
    if (startsWithSegment(pathname, "/rep/finance")) return "/m/rep/finance";
    if (startsWithSegment(pathname, "/rep/operations")) return "/m/rep/operations";
    if (startsWithSegment(pathname, "/rep/visit")) return "/m/rep/visit";

    return "/m/rep";
  }

  if (user?.role === "INVESTOR") {
    if (pathname === "/investor") return "/m/investor";
    if (startsWithSegment(pathname, "/investor/quotas")) return "/m/investor/quotas";
    if (startsWithSegment(pathname, "/investor/distributions")) {
      return "/m/investor/distributions";
    }

    return "/m/investor";
  }

  if (pathname === "/" || pathname === "/dashboard") return "/m/admin";

  if (pathname === "/clients/new") return "/m/admin/clients/new";
  if (startsWithSegment(pathname, "/clients")) return "/m/admin/clients";

  if (pathname === "/orders/new") return "/m/admin/orders/new";
  if (startsWithSegment(pathname, "/orders")) return "/m/admin/orders";

  if (pathname === "/exhibitors/new") return "/m/admin/exhibitors/new";
  if (startsWithSegment(pathname, "/exhibitors")) return "/m/admin/exhibitors";

  if (startsWithSegment(pathname, "/finance/receivables")) {
    return "/m/admin/finance/receivables";
  }
  if (startsWithSegment(pathname, "/finance/transfers")) {
    return "/m/admin/finance/transfers";
  }
  if (startsWithSegment(pathname, "/finance")) return "/m/admin/finance";

  if (startsWithSegment(pathname, "/sales-dashboard")) return "/m/admin/sales";
  if (startsWithSegment(pathname, "/regions")) return "/m/admin/regions";
  if (startsWithSegment(pathname, "/representatives")) return "/m/admin/representatives";
  if (startsWithSegment(pathname, "/prospects")) return "/m/admin/prospects";
  if (startsWithSegment(pathname, "/map")) return "/m/admin/map";
  if (startsWithSegment(pathname, "/alerts")) return "/m/admin/alerts";
  if (startsWithSegment(pathname, "/settings")) return "/m/admin/settings";

  return "/m/admin";
}

function mobileToDesktop(pathname: string, user: LoggedUser | null) {
  if (pathname === "/m/rep") return "/rep";
  if (startsWithSegment(pathname, "/m/rep/clients")) return "/rep/clients";
  if (pathname === "/m/rep/orders/new") return "/rep/orders/new";
  if (startsWithSegment(pathname, "/m/rep/orders")) return "/rep/orders";
  if (startsWithSegment(pathname, "/m/rep/commissions")) return "/rep/finance/commissions";
  if (startsWithSegment(pathname, "/m/rep/finance")) return "/rep/finance";
  if (startsWithSegment(pathname, "/m/rep/operations")) return "/rep/operations";
  if (startsWithSegment(pathname, "/m/rep/visit")) return "/rep/visit";

  if (pathname === "/m/investor") return "/investor";
  if (startsWithSegment(pathname, "/m/investor/quotas")) return "/investor/quotas";
  if (startsWithSegment(pathname, "/m/investor/distributions")) {
    return "/investor/distributions";
  }
  if (startsWithSegment(pathname, "/m/investor/portal")) {
    return "/investor";
  }

  if (pathname === "/m/admin") return "/dashboard";
  if (pathname === "/m/admin/clients/new") return "/clients/new";
  if (startsWithSegment(pathname, "/m/admin/clients")) return "/clients";

  if (pathname === "/m/admin/orders/new") return "/orders/new";
  if (startsWithSegment(pathname, "/m/admin/orders")) return "/orders";

  if (pathname === "/m/admin/exhibitors/new") return "/exhibitors/new";
  if (startsWithSegment(pathname, "/m/admin/exhibitors")) return "/exhibitors";

  if (startsWithSegment(pathname, "/m/admin/finance/receivables")) {
    return "/finance/receivables";
  }
  if (startsWithSegment(pathname, "/m/admin/finance/transfers")) {
    return "/finance/transfers";
  }
  if (startsWithSegment(pathname, "/m/admin/finance")) return "/finance";

  if (startsWithSegment(pathname, "/m/admin/sales")) return "/sales-dashboard";
  if (startsWithSegment(pathname, "/m/admin/regions")) return "/regions";
  if (startsWithSegment(pathname, "/m/admin/representatives")) return "/representatives";
  if (startsWithSegment(pathname, "/m/admin/prospects")) return "/prospects";
  if (startsWithSegment(pathname, "/m/admin/map")) return "/map";
  if (startsWithSegment(pathname, "/m/admin/alerts")) return "/alerts";
  if (startsWithSegment(pathname, "/m/admin/settings")) return "/settings";
  if (startsWithSegment(pathname, "/m/admin/cadastros")) return "/dashboard";
  if (startsWithSegment(pathname, "/m/admin/more")) return "/dashboard";

  if (user?.role === "REPRESENTATIVE") return "/rep";
  if (user?.role === "INVESTOR") return "/investor";
  return "/dashboard";
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
  const mobile = isMobileRoute(pathname);

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

      try {
        localStorage.removeItem("v2_view_mode");
      } catch (error) {
        console.error(error);
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoggingOut(false);
    }
  }

  function handleToggleMobile() {
    const nextRoute = mobile
      ? mobileToDesktop(pathname, user)
      : desktopToMobile(pathname, user);

    try {
      localStorage.setItem("v2_view_mode", mobile ? "desktop" : "mobile");
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
          title={mobile ? "Abrir modo normal" : "Abrir modo mobile"}
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
            color: mobile ? "#2563eb" : colors.text,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <Smartphone size={16} />
          {mobile ? "Normal" : "Mobile"}
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
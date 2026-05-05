"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import Header from "../components/header";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function isRepPath(pathname: string) {
  return pathname === "/rep" || pathname.startsWith("/rep/");
}

function isRepresentativeSharedAdminForm(pathname: string) {
  if (pathname === "/clients/new") return true;
  if (pathname === "/exhibitors/new") return true;
  const isClientEdit =
    pathname.startsWith("/clients/") && pathname.endsWith("/edit");
  return isClientEdit;
}

function isFinancePath(pathname: string) {
  return pathname === "/finance" || pathname.startsWith("/finance/");
}

function isAdministrativeAllowedPath(pathname: string) {
  if (isFinancePath(pathname)) return true;
  if (pathname === "/reports/finance") return true;
  if (pathname === "/investors/dashboard") return true;
  if (pathname === "/investors/quotas") return true;
  if (pathname === "/investors/distributions") return true;
  return false;
}

function getRedirectByRole(user: AuthUser, pathname: string) {
  if (
    user.role === "REPRESENTATIVE" &&
    !isRepPath(pathname) &&
    !isRepresentativeSharedAdminForm(pathname)
  ) {
    return "/rep";
  }

  if (user.role === "ADMIN" && isRepPath(pathname)) {
    return "/dashboard";
  }

  if (user.role === "ADMINISTRATIVE" && !isAdministrativeAllowedPath(pathname)) {
    return "/finance";
  }

  return null;
}

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const loginRedirect = useMemo(() => {
    const safePath = pathname?.startsWith("/") ? pathname : "/dashboard";
    return `/login?redirect=${encodeURIComponent(safePath)}`;
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function validateAccess() {
      try {
        setLoading(true);
        setAllowed(false);

        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!active) return;

        if (!res.ok || !json?.user) {
          router.replace(loginRedirect);
          return;
        }

        const user = json.user as AuthUser;
        const redirectTo = getRedirectByRole(user, pathname);

        if (redirectTo) {
          router.replace(redirectTo);
          return;
        }

        setAllowed(true);
      } catch (error) {
        console.error(error);
        if (!active) return;
        router.replace(loginRedirect);
      } finally {
        if (active) setLoading(false);
      }
    }

    validateAccess();

    return () => {
      active = false;
    };
  }, [pathname, router, loginRedirect]);

  if (loading || !allowed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f6fb",
          color: "#0f172a",
          fontWeight: 800,
          fontSize: 15,
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f6fb" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ flex: 1, padding: 0, background: "#f3f6fb" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isProtectedCrmRoute(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/clients" ||
    pathname.startsWith("/clients/") ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname === "/finance" ||
    pathname.startsWith("/finance/") ||
    pathname === "/rep" ||
    pathname.startsWith("/rep/") ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/regions" ||
    pathname.startsWith("/regions/") ||
    pathname === "/stock" ||
    pathname.startsWith("/stock/") ||
    pathname === "/exhibitors" ||
    pathname.startsWith("/exhibitors/") ||
    pathname === "/investors" ||
    pathname.startsWith("/investors/") ||
    pathname === "/sales-dashboard" ||
    pathname.startsWith("/sales-dashboard/")
  );
}

function isProtectedPortalRoute(pathname: string) {
  return (
    pathname === "/portal/dashboard" ||
    pathname.startsWith("/portal/dashboard/")
  );
}

export function proxy(req: NextRequest) {
  const crmSession = req.cookies.get("crm_session")?.value;
  const portalSession = req.cookies.get("portal_session")?.value;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/login";
  const isPortalLoginPage = pathname === "/portal/login";

  const isCrmProtected = isProtectedCrmRoute(pathname);
  const isPortalProtected = isProtectedPortalRoute(pathname);

  if (isCrmProtected && !crmSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isPortalProtected && !portalSession) {
    const url = new URL("/portal/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginPage && crmSession) {
    return NextResponse.next();
  }

  if (isPortalLoginPage && portalSession) {
    return NextResponse.redirect(new URL("/portal/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/portal/login",
    "/portal/dashboard/:path*",
    "/dashboard/:path*",
    "/clients/:path*",
    "/orders/:path*",
    "/finance/:path*",
    "/rep/:path*",
    "/products/:path*",
    "/regions/:path*",
    "/stock/:path*",
    "/exhibitors/:path*",
    "/investors/:path*",
    "/sales-dashboard/:path*",
  ],
};
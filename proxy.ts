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
    pathname.startsWith("/sales-dashboard/") ||
    pathname === "/m/admin" ||
    pathname.startsWith("/m/admin/") ||
    pathname === "/m/rep" ||
    pathname.startsWith("/m/rep/")
  );
}

function isProtectedPortalRoute(pathname: string) {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/m/client" ||
    pathname.startsWith("/m/client/")
  );
}

function isProtectedInvestorRoute(pathname: string) {
  return (
    pathname === "/investor" ||
    pathname.startsWith("/investor/") ||
    pathname === "/m/investor" ||
    pathname.startsWith("/m/investor/")
  );
}

export function proxy(req: NextRequest) {
  const crmSession = req.cookies.get("crm_session")?.value;
  const portalSession = req.cookies.get("portal_session")?.value;
  const investorSession = req.cookies.get("investor_session")?.value;
  const { pathname, searchParams } = req.nextUrl;

  const isLoginPage = pathname === "/login";
  const isPortalLoginPage = pathname === "/portal/login";
  const isInvestorLoginPage = pathname === "/investor/login";

  const isCrmProtected = isProtectedCrmRoute(pathname);
  const isPortalProtected = isProtectedPortalRoute(pathname);
  const isInvestorProtected = isProtectedInvestorRoute(pathname);

  if (isCrmProtected && !crmSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    if (pathname.startsWith("/m/")) url.searchParams.set("m", "1");
    return NextResponse.redirect(url);
  }

  if (isPortalProtected && !portalSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("access", "CLIENT");
    url.searchParams.set("redirect", pathname);
    if (pathname.startsWith("/m/")) url.searchParams.set("m", "1");
    return NextResponse.redirect(url);
  }

  if (isInvestorProtected && !investorSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("access", "INVESTOR");
    url.searchParams.set("redirect", pathname);
    if (pathname.startsWith("/m/")) url.searchParams.set("m", "1");
    return NextResponse.redirect(url);
  }

  if (isPortalLoginPage && portalSession) {
    return NextResponse.redirect(new URL("/portal/dashboard", req.url));
  }

  if (isInvestorLoginPage && investorSession) {
    return NextResponse.redirect(new URL("/investor", req.url));
  }

  if (isLoginPage && crmSession && !searchParams.get("access")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/portal/login",
    "/investor/login",

    "/portal",
    "/portal/:path*",
    "/investor",
    "/investor/:path*",

    "/dashboard",
    "/dashboard/:path*",
    "/clients",
    "/clients/:path*",
    "/orders",
    "/orders/:path*",
    "/finance",
    "/finance/:path*",
    "/rep",
    "/rep/:path*",
    "/products",
    "/products/:path*",
    "/regions",
    "/regions/:path*",
    "/stock",
    "/stock/:path*",
    "/exhibitors",
    "/exhibitors/:path*",
    "/investors",
    "/investors/:path*",
    "/sales-dashboard",
    "/sales-dashboard/:path*",

    "/m/admin",
    "/m/admin/:path*",
    "/m/rep",
    "/m/rep/:path*",
    "/m/client",
    "/m/client/:path*",
    "/m/investor",
    "/m/investor/:path*",
  ],
};
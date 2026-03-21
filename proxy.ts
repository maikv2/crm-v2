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
    pathname.startsWith("/m/rep/") ||
    pathname === "/m/investor" ||
    pathname.startsWith("/m/investor/")
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

export function proxy(req: NextRequest) {
  const crmSession = req.cookies.get("crm_session")?.value;
  const portalSession = req.cookies.get("portal_session")?.value;
  const investorSession = req.cookies.get("investor_session")?.value;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/login";
  const isPortalLoginPage = pathname === "/portal/login";
  const isInvestorLoginPage = pathname === "/investor/login";

  const isCrmProtected = isProtectedCrmRoute(pathname);
  const isPortalProtected = isProtectedPortalRoute(pathname);
  const isInvestorProtected =
    pathname === "/investor" ||
    pathname.startsWith("/investor/");

  if (isCrmProtected && !crmSession && !investorSession) {
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
    return NextResponse.redirect(url);
  }

  if (isPortalLoginPage && portalSession) {
    return NextResponse.redirect(new URL("/portal/dashboard", req.url));
  }

  if (isInvestorLoginPage && investorSession) {
    return NextResponse.redirect(new URL("/investor", req.url));
  }

  if (isLoginPage && crmSession && !req.nextUrl.searchParams.get("access")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/portal/login",
    "/investor/login",
    "/portal/:path*",
    "/investor/:path*",
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
    "/m/admin/:path*",
    "/m/rep/:path*",
    "/m/client/:path*",
    "/m/investor/:path*",
  ],
};
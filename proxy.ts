import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const crmSession = req.cookies.get("crm_session")?.value;
  const portalSession = req.cookies.get("portal_session")?.value;
  const { pathname } = req.nextUrl;

  const protectedRoutes = [
    "/dashboard",
    "/clients",
    "/orders",
    "/finance",
    "/rep",
    "/products",
    "/regions",
    "/stock",
    "/exhibitors",
    "/investors",
    "/sales-dashboard",
  ];

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isLoginPage = pathname === "/login";
  const isPortalLoginPage = pathname === "/portal/login";
  const isPortalProtected = pathname.startsWith("/portal/dashboard");

  if (isProtected && !crmSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage && crmSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isPortalProtected && !portalSession) {
    return NextResponse.redirect(new URL("/portal/login", req.url));
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
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasCrmSession(req: NextRequest) {
  return Boolean(req.cookies.get("crm_session")?.value);
}

function hasPortalSession(req: NextRequest) {
  return Boolean(req.cookies.get("portal_session")?.value);
}

function hasInvestorSession(req: NextRequest) {
  return Boolean(req.cookies.get("investor_session")?.value);
}

function isCrmChoiceRoute(pathname: string) {
  return pathname === "/choose/crm" || pathname.startsWith("/choose/crm/");
}

function isCrmMobileRoute(pathname: string) {
  return (
    pathname === "/m/admin" ||
    pathname.startsWith("/m/admin/") ||
    pathname === "/m/rep" ||
    pathname.startsWith("/m/rep/")
  );
}

function isPortalRoute(pathname: string) {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function isPortalMobileRoute(pathname: string) {
  return pathname === "/m/client" || pathname.startsWith("/m/client/");
}

function isInvestorRoute(pathname: string) {
  return pathname === "/investor" || pathname.startsWith("/investor/");
}

function isInvestorMobileRoute(pathname: string) {
  return pathname === "/m/investor" || pathname.startsWith("/m/investor/");
}

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
    pathname === "/sales-dashboard" ||
    pathname.startsWith("/sales-dashboard/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/prospects" ||
    pathname.startsWith("/prospects/") ||
    pathname === "/map" ||
    pathname.startsWith("/map/") ||
    pathname === "/alerts" ||
    pathname.startsWith("/alerts/") ||
    pathname === "/investors" ||
    pathname.startsWith("/investors/") ||
    pathname === "/representatives" ||
    pathname.startsWith("/representatives/") ||
    isCrmChoiceRoute(pathname) ||
    isCrmMobileRoute(pathname)
  );
}

function isPublicRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/site.webmanifest" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/assets/")
  );
}

function buildLoginUrl(
  req: NextRequest,
  access?: "CRM" | "CLIENT" | "INVESTOR"
) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";

  if (access) {
    url.searchParams.set("access", access);
  }

  return url;
}

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (isPublicRoute(pathname)) {
    if (pathname !== "/login") {
      return NextResponse.next();
    }

    const access = String(searchParams.get("access") || "").toUpperCase();
    const crmSession = hasCrmSession(req);
    const portalSession = hasPortalSession(req);
    const investorSession = hasInvestorSession(req);

    if (access === "CLIENT") {
      if (portalSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/portal";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (access === "INVESTOR") {
      if (investorSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/investor";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (access === "CRM") {
      if (crmSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/choose/crm";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (portalSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (investorSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/investor";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (crmSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/choose/crm";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (isPortalRoute(pathname) || isPortalMobileRoute(pathname)) {
    if (!hasPortalSession(req)) {
      return NextResponse.redirect(buildLoginUrl(req, "CLIENT"));
    }
    return NextResponse.next();
  }

  if (isInvestorRoute(pathname) || isInvestorMobileRoute(pathname)) {
    if (!hasInvestorSession(req)) {
      return NextResponse.redirect(buildLoginUrl(req, "INVESTOR"));
    }
    return NextResponse.next();
  }

  if (isProtectedCrmRoute(pathname)) {
    if (!hasCrmSession(req)) {
      return NextResponse.redirect(buildLoginUrl(req, "CRM"));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (hasPortalSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (hasInvestorSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/investor";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (hasCrmSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/choose/crm";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
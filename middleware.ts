import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isMobile(userAgent: string) {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(userAgent);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  if (!isMobile(userAgent)) {
    return NextResponse.next();
  }

  // evitar loop
  if (pathname.startsWith("/m")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (pathname.startsWith("/dashboard")) {
    url.pathname = "/m/admin";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/rep")) {
    url.pathname = "/m/rep";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/portal")) {
    url.pathname = "/m/client";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/investor")) {
    url.pathname = "/m/investor";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/rep/:path*",
    "/portal/:path*",
    "/investor/:path*",
  ],
};
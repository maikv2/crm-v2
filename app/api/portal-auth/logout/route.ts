// app/api/portal-auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("portal_session", "", {
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.json({ ok: true });
}
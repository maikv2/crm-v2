import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function expiredCookie(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set(expiredCookie("crm_session"));
    cookieStore.set(expiredCookie("portal_session"));
    cookieStore.set(expiredCookie("investor_session"));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao realizar logout." },
      { status: 500 }
    );
  }
}
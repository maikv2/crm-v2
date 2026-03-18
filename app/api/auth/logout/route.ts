import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set("crm_session", "", {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao realizar logout." },
      { status: 500 }
    );
  }
}
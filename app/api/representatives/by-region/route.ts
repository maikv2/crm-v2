import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = normalizeText(searchParams.get("regionId"));

    if (!regionId) {
      return NextResponse.json([]);
    }

    const representatives = await prisma.user.findMany({
      where: {
        role: "REPRESENTATIVE",
        active: true,
        regionId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        regionId: true,
      },
    });

    return NextResponse.json(representatives);
  } catch (error) {
    console.error("GET /api/representatives/by-region error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os representantes" },
      { status: 500 }
    );
  }
}
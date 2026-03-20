import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-settings-auth";

export const dynamic = "force-dynamic";

type ToggleTargetKind = "USER" | "INVESTOR" | "CLIENT";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();

    const kind = String(body.kind ?? "").trim() as ToggleTargetKind;
    const targetId = normalizeText(body.targetId);
    const active = Boolean(body.active);

    if (!targetId) {
      return NextResponse.json(
        { error: "O alvo da alteração é obrigatório." },
        { status: 400 }
      );
    }

    if (kind === "USER") {
      const existing = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      if (!existing) {
        return NextResponse.json(
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { exhibitorId } = await req.json();

  if (!exhibitorId) {
    return NextResponse.json({ error: "Expositor não informado" }, { status: 400 });
  }

  const exhibitor = await prisma.exhibitor.findUnique({
    where: { id: exhibitorId },
  });

  if (!exhibitor) {
    return NextResponse.json({ error: "Expositor não encontrado" }, { status: 404 });
  }

  const now = new Date();

  const nextVisit = new Date();
  nextVisit.setDate(now.getDate() + 45);

  const updated = await prisma.exhibitor.update({
    where: { id: exhibitorId },
    data: {
      lastVisitAt: now,
      nextVisitAt: nextVisit,
    },
  });

  return NextResponse.json(updated);
}
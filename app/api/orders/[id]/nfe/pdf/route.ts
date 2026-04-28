import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

function basicAuth(token: string) {
  return `Basic ${Buffer.from(`${token.trim()}:`).toString("base64")}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await context.params;

    const [company, order] = await Promise.all([
      prisma.companyProfile.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.order.findUnique({
        where: { id },
        select: { id: true, number: true, nfeKey: true, nfeStatus: true },
      }),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    if (!company?.nfeToken) {
      return NextResponse.json({ error: "Token Focus NFe não configurado." }, { status: 400 });
    }

    if (!order.nfeKey && order.nfeStatus !== "AUTHORIZED") {
      return NextResponse.json({ error: "NF-e ainda não autorizada." }, { status: 400 });
    }

    const ref = `crm-v2-order-${order.id}`;
    const focusBaseUrl =
      company.nfeEnvironment === "production"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    // Busca o DANFE (PDF da NF-e) diretamente do Focus
    const focusRes = await fetch(
      `${focusBaseUrl}/v2/nfe/${encodeURIComponent(ref)}/danfe`,
      {
        method: "GET",
        headers: {
          Authorization: basicAuth(company.nfeToken),
        },
      }
    );

    if (!focusRes.ok) {
      const text = await focusRes.text().catch(() => "");
      console.error("[NF-e PDF] Focus error:", focusRes.status, text);
      return NextResponse.json(
        { error: `Erro ao buscar DANFE no Focus NFe (${focusRes.status}).` },
        { status: 502 }
      );
    }

    const pdfBuffer = await focusRes.arrayBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="nfe-pedido-${order.number ?? order.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("GET /api/orders/[id]/nfe/pdf error:", error);
    const msg: string = error?.message ?? "";
    if (msg.includes("autenticado") || msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (msg.includes("administrador") || msg.includes("Acesso")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json({ error: msg || "Erro ao buscar PDF da NF-e." }, { status: 500 });
  }
}
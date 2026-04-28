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
        select: { id: true, number: true, nfeKey: true, nfeStatus: true, nfeXmlUrl: true },
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

    // Busca o XML da NF-e diretamente do Focus
    const focusRes = await fetch(
      `${focusBaseUrl}/v2/nfe/${encodeURIComponent(ref)}/xml`,
      {
        method: "GET",
        headers: {
          Authorization: basicAuth(company.nfeToken),
        },
      }
    );

    if (!focusRes.ok) {
      const text = await focusRes.text().catch(() => "");
      console.error("[NF-e XML] Focus error:", focusRes.status, text);
      return NextResponse.json(
        { error: `Erro ao buscar XML no Focus NFe (${focusRes.status}).` },
        { status: 502 }
      );
    }

    const xmlBuffer = await focusRes.arrayBuffer();
    const chave = order.nfeKey ?? `nfe-pedido-${order.number ?? order.id}`;

    return new Response(xmlBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${chave}.xml"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("GET /api/orders/[id]/nfe/xml error:", error);
    const msg: string = error?.message ?? "";
    if (msg.includes("autenticado") || msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (msg.includes("administrador") || msg.includes("Acesso")) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json({ error: msg || "Erro ao buscar XML da NF-e." }, { status: 500 });
  }
}
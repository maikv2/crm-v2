import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
function basicAuth(token: string) {
  return `Basic ${Buffer.from(`${token.trim()}:`).toString("base64")}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!order.nfeXmlUrl) {
      return NextResponse.json({ error: "NF-e ainda não autorizada ou URL não disponível." }, { status: 400 });
    }

    const focusBaseUrl =
      company.nfeEnvironment === "production"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    const focusRes = await fetch(`${focusBaseUrl}${order.nfeXmlUrl}`, {
      method: "GET",
      headers: {
        Authorization: basicAuth(company.nfeToken),
      },
    });

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
    return NextResponse.json({ error: msg || "Erro ao buscar XML da NF-e." }, { status: 500 });
  }
}
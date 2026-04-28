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

    // Monta URL do DANFE a partir da URL do XML
    // XML:   /arquivos_development/.../XMLs/{chave}-nfe.xml
    // DANFE: /arquivos_development/.../DANFEs/{chave}.pdf  (sem sufixo -danfe)
    const danfeUrl = order.nfeXmlUrl
      .replace("/XMLs/", "/DANFEs/")
      .replace("-nfe.xml", ".pdf");

    const focusRes = await fetch(`${focusBaseUrl}${danfeUrl}`, {
      method: "GET",
      headers: {
        Authorization: basicAuth(company.nfeToken),
      },
    });

    if (!focusRes.ok) {
      const text = await focusRes.text().catch(() => "");
      console.error("[NF-e PDF] Focus error:", focusRes.status, text, "URL:", danfeUrl);
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
    return NextResponse.json({ error: msg || "Erro ao buscar PDF da NF-e." }, { status: 500 });
  }
}
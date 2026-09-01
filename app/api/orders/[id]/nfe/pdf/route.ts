import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function basicAuth(token: string) {
  return `Basic ${Buffer.from(`${token.trim()}:`).toString("base64")}`;
}

function buildDanfeCandidates(xmlUrl: string) {
  const urls = new Set<string>();

  urls.add(
    xmlUrl
      .replace("/XMLs/", "/DANFEs/")
      .replace("-nfe.xml", ".pdf")
  );

  urls.add(
    xmlUrl
      .replace("/XMLs/", "/DANFEs/")
      .replace("-nfe.xml", "-danfe.pdf")
  );

  urls.add(
    xmlUrl
      .replace("/XMLs/", "/DANFEs/")
      .replace(".xml", ".pdf")
  );

  urls.add(
    xmlUrl
      .replace("/XMLs/", "/DANFEs/")
      .replace(".xml", "-danfe.pdf")
  );

  return Array.from(urls);
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
        select: {
          id: true,
          number: true,
          nfeKey: true,
          nfeStatus: true,
          nfeXmlUrl: true,
        },
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

    const danfeCandidates = buildDanfeCandidates(order.nfeXmlUrl);

    let pdfBuffer: ArrayBuffer | null = null;
    let lastStatus = 0;
    let lastText = "";
    let usedUrl = "";

    for (const danfeUrl of danfeCandidates) {
      const fullUrl = danfeUrl.startsWith("http")
        ? danfeUrl
        : `${focusBaseUrl}${danfeUrl}`;

      const focusRes = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: basicAuth(company.nfeToken),
        },
      });

      if (focusRes.ok) {
        pdfBuffer = await focusRes.arrayBuffer();
        usedUrl = danfeUrl;
        break;
      }

      lastStatus = focusRes.status;
      lastText = await focusRes.text().catch(() => "");
      console.error("[NF-e PDF] Focus error:", focusRes.status, lastText, "URL:", danfeUrl);
    }

    if (!pdfBuffer) {
      return NextResponse.json(
        {
          error: `Erro ao buscar DANFE no Focus NFe (${lastStatus || 502}).`,
          detalhes: lastText.slice(0, 400),
        },
        { status: 502 }
      );
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="nfe-pedido-${order.number ?? order.id}.pdf"`,
        "Cache-Control": "no-store",
        "X-DANFE-URL": usedUrl,
      },
    });
  } catch (error: any) {
    console.error("GET /api/orders/[id]/nfe/pdf error:", error);
    const msg: string = error?.message ?? "";
    return NextResponse.json({ error: msg || "Erro ao buscar PDF da NF-e." }, { status: 500 });
  }
}
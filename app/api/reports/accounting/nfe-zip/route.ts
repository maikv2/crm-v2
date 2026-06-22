import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { zipSync } from "fflate";
import { OrderType } from "@prisma/client";

function basicAuth(token: string) {
  return `Basic ${Buffer.from(`${token.trim()}:`).toString("base64")}`;
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json({ error: "Parâmetros 'from' e 'to' são obrigatórios." }, { status: 400 });
    }

    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const [company, orders] = await Promise.all([
      prisma.companyProfile.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.order.findMany({
        where: {
          issuedAt: { gte: from, lte: toEnd },
          type: OrderType.SALE,
          nfeXmlUrl: { not: null },
        },
        select: {
          id: true,
          number: true,
          nfeKey: true,
          nfeXmlUrl: true,
          nfeStatus: true,
          issuedAt: true,
        },
        orderBy: { issuedAt: "asc" },
      }),
    ]);

    if (!company?.nfeToken) {
      return NextResponse.json({ error: "Token Focus NFe não configurado no perfil da empresa." }, { status: 400 });
    }

    if (orders.length === 0) {
      return NextResponse.json({ error: "Nenhuma NF-e encontrada no período informado." }, { status: 404 });
    }

    const focusBaseUrl =
      company.nfeEnvironment === "production"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    const files: Record<string, Uint8Array> = {};
    const erros: string[] = [];

    // Fetch em lotes de 5 simultâneos para não sobrecarregar o Focus NFe
    const CONCURRENCY = 5;
    for (let i = 0; i < orders.length; i += CONCURRENCY) {
      const batch = orders.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (order) => {
          try {
            const res = await fetch(`${focusBaseUrl}${order.nfeXmlUrl}`, {
              headers: { Authorization: basicAuth(company.nfeToken!) },
            });

            if (!res.ok) {
              erros.push(`NF-${order.number ?? order.id}: status ${res.status}`);
              return;
            }

            const buf = await res.arrayBuffer();
            // Nome padrão de arquivo NF-e: chave de acesso (44 dígitos).xml
            const filename = order.nfeKey
              ? `${order.nfeKey}.xml`
              : `NF-${order.number ?? order.id}.xml`;
            files[filename] = new Uint8Array(buf);
          } catch {
            erros.push(`NF-${order.number ?? order.id}: falha na requisição`);
          }
        })
      );
    }

    if (Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: "Não foi possível baixar nenhum XML.", detalhes: erros },
        { status: 502 }
      );
    }

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const zipBuffer = zipSync(files, { level: 6 });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="nfe-xml-${fromStr}_${toStr}.zip"`,
        "X-NFe-Total": String(Object.keys(files).length),
        "X-NFe-Erros": String(erros.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/reports/accounting/nfe-zip error:", error);
    return NextResponse.json({ error: "Erro ao gerar ZIP das NF-e." }, { status: 500 });
  }
}

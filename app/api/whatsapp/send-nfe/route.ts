import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  sendDocument,
  sendText,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id?: string }> };

const ALLOWED_NFE_STATUS = new Set(["AUTHORIZED", "ISSUED"]);

function buildCaption(
  orderNumber: number,
  nfeNumber: string | null,
  clientName: string | null,
  accessKey: string | null
) {
  const num = String(orderNumber ?? "").padStart(6, "0");
  const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
  const nfeLabel = nfeNumber ? ` nº ${nfeNumber}` : "";
  const keyLine = accessKey ? `\n🔑 Chave de acesso:\n${accessKey}` : "";
  return (
    `${greeting} 😊\n\n` +
    `Segue a NF-e${nfeLabel} referente ao pedido *#${num}*.\n` +
    `Em anexo: PDF (DANFE) e XML.${keyLine}\n\n` +
    `Qualquer dúvida, estamos à disposição.`
  );
}

export async function POST(request: Request, _context: RouteContext) {
  try {
    await requireAdminUser();

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get("id");

    const body = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const orderId =
      (typeof body.orderId === "string" && body.orderId) ||
      idFromQuery ||
      "";

    const includeXml = body.includeXml !== false;

    if (!orderId) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        nfeStatus: true,
        nfeNumber: true,
        nfeKey: true,
        nfeXmlUrl: true,
        client: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (!ALLOWED_NFE_STATUS.has(String(order.nfeStatus))) {
      return NextResponse.json(
        {
          error:
            "NF-e ainda não está autorizada. Sincronize o status antes de enviar.",
          nfeStatus: order.nfeStatus,
        },
        { status: 400 }
      );
    }

    const phoneOverride =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const phone =
      phoneOverride ||
      order.client?.whatsapp ||
      order.client?.phone ||
      "";

    if (!phone) {
      return NextResponse.json(
        { error: "Cliente sem WhatsApp/telefone cadastrado." },
        { status: 400 }
      );
    }

    const origin = url.origin;
    const cookie = request.headers.get("cookie") ?? "";
    const headers = cookie ? { cookie } : undefined;

    const pdfRes = await fetch(`${origin}/api/orders/${order.id}/nfe/pdf`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!pdfRes.ok) {
      const text = await pdfRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Não foi possível obter o PDF da NF-e.",
          status: pdfRes.status,
          detalhes: text.slice(0, 400),
        },
        { status: 502 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    let xmlBuffer: Buffer | null = null;
    if (includeXml) {
      const xmlRes = await fetch(`${origin}/api/orders/${order.id}/nfe/xml`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!xmlRes.ok) {
        const text = await xmlRes.text().catch(() => "");
        console.error(
          "[send-nfe] Falha ao obter XML:",
          xmlRes.status,
          text.slice(0, 400)
        );
      } else {
        xmlBuffer = Buffer.from(await xmlRes.arrayBuffer());
      }
    }

    const baseName = order.nfeKey || `nfe-pedido-${order.number}`;
    const pdfFileName = `${baseName}.pdf`;
    const xmlFileName = `${baseName}.xml`;

    const caption = buildCaption(
      order.number,
      order.nfeNumber ?? null,
      order.client?.name ?? null,
      order.nfeKey ?? null
    );

    const pdfResult = await sendDocument({
      phone,
      document: pdfBuffer,
      extension: "pdf",
      fileName: pdfFileName,
      caption,
    });

    let xmlResult: unknown = null;
    let xmlError: string | null = null;
    if (xmlBuffer) {
      try {
        xmlResult = await sendDocument({
          phone,
          document: xmlBuffer,
          extension: "xml",
          fileName: xmlFileName,
        });
      } catch (err: any) {
        xmlError =
          err instanceof ZApiRequestError
            ? `${err.message} (${err.status})`
            : err?.message || "Erro ao enviar XML.";
        try {
          await sendText({
            phone,
            message:
              "⚠️ Não consegui enviar o XML da NF-e por aqui. Se precisar, " +
              "responda esta mensagem que envio em outro formato.",
          });
        } catch {
          /* ignore */
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        xmlError && includeXml
          ? "PDF enviado, mas o XML falhou."
          : includeXml && xmlBuffer
          ? "PDF e XML enviados pelo WhatsApp."
          : "PDF da NF-e enviado pelo WhatsApp.",
      phone,
      pdf: { fileName: pdfFileName, zapi: pdfResult },
      xml: xmlBuffer
        ? { fileName: xmlFileName, zapi: xmlResult, error: xmlError }
        : { skipped: !includeXml, error: xmlError },
    });
  } catch (error: any) {
    if (error instanceof ZApiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }
    console.error("POST /api/whatsapp/send-nfe error:", error);
    if (error?.message === "Usuário não autenticado") {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }
    if (error?.message?.includes("Acesso permitido")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao enviar NF-e por WhatsApp." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import {
  EfiChargesApiError,
  EfiChargesConfigError,
  processEfiChargesNotification,
} from "@/lib/efi-payment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request, url: URL) {
  const expected = process.env.EFI_WEBHOOK_SECRET?.trim();
  if (!expected) return true;

  const fromQuery = url.searchParams.get("secret") || "";
  const fromHeader = request.headers.get("x-efi-webhook-secret") || "";
  return fromQuery === expected || fromHeader === expected;
}

async function readNotificationToken(request: Request, url: URL) {
  const fromQuery =
    url.searchParams.get("notification") ||
    url.searchParams.get("token") ||
    "";
  if (fromQuery) return fromQuery;

  const text = await request.text();
  if (!text.trim()) return "";

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const value = json.notification || json.token;
    return typeof value === "string" ? value : "";
  } catch {
    const params = new URLSearchParams(text);
    return params.get("notification") || params.get("token") || "";
  }
}

async function handle(request: Request) {
  const url = new URL(request.url);

  if (!authorize(request, url)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const token = await readNotificationToken(request, url);
  if (!token) {
    return NextResponse.json(
      { error: "Token de notificação Efí não informado." },
      { status: 400 }
    );
  }

  try {
    const result = await processEfiChargesNotification(token);
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    if (error instanceof EfiChargesConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof EfiChargesApiError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    console.error("Webhook Efí Cobranças error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar notificação Efí." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

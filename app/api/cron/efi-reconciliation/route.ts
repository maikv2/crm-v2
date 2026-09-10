import { NextResponse } from "next/server";
import {
  EfiChargesConfigError,
  reconcileEfiCharges,
} from "@/lib/efi-payment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await reconcileEfiCharges();

    if (result.paidNow.length) {
      console.log(
        "Reconciliação Efí: baixa automática aplicada a cobranças que o webhook não havia notificado:",
        result.paidNow
      );
    }
    if (result.errors.length) {
      console.error("Reconciliação Efí: erros ao consultar cobranças:", result.errors);
    }

    return NextResponse.json({
      ok: true,
      checked: result.checked,
      updated: result.updated.length,
      paidNow: result.paidNow.length,
      errors: result.errors.length,
      details: result,
    });
  } catch (error: any) {
    if (error instanceof EfiChargesConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("GET /api/cron/efi-reconciliation error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro na reconciliação de cobranças Efí." },
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

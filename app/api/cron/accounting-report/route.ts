import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Dispara todo dia 5 às 09:00 BRT (12:00 UTC) — envia o relatório do mês anterior
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // Calcula o mês anterior
    const now = new Date();
    const firstOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastOfPrevMonth = new Date(firstOfCurrentMonth.getTime() - 1);
    const firstOfPrevMonth = new Date(Date.UTC(lastOfPrevMonth.getUTCFullYear(), lastOfPrevMonth.getUTCMonth(), 1));

    const from = firstOfPrevMonth.toISOString().split("T")[0];
    const to = lastOfPrevMonth.toISOString().split("T")[0];

    const origin = url.origin;

    const res = await fetch(`${origin}/api/reports/accounting/send-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[cron/accounting-report] Erro ao enviar:", json);
      return NextResponse.json({ ok: false, error: json.error, period: `${from} → ${to}` }, { status: res.status });
    }

    console.log("[cron/accounting-report] Enviado com sucesso:", json);
    return NextResponse.json({ ok: true, period: `${from} → ${to}`, ...json });
  } catch (error: any) {
    console.error("[cron/accounting-report] Erro:", error);
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}

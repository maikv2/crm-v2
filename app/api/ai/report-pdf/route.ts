import React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUser } from "@/lib/auth-user";
import { ASSISTANT_ROLES, type AssistantRole } from "@/lib/ai/assistant-tools";
import { AiReportPdfDocument, type AiReportPdfData, type AiReportTable } from "@/lib/pdf/ai-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gera o PDF de uma resposta do assistente (texto da analise + tabelas que o
// usuario ja esta vendo na tela). Nao consulta dados novos - so formata o
// que veio do proprio assistente, com limites de tamanho.

const MAX_TABLES = 6;
const MAX_ROWS = 500;
const MAX_COLUMNS = 8;
const MAX_CELL = 200;

function cleanText(value: unknown, max: number) {
  return String(value ?? "").slice(0, max);
}

function sanitizeTables(raw: unknown): AiReportTable[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_TABLES).flatMap((t) => {
    const columns = Array.isArray(t?.columns)
      ? t.columns.slice(0, MAX_COLUMNS).map((c: { key?: unknown; label?: unknown; align?: unknown }) => ({
          key: cleanText(c?.key, 40),
          label: cleanText(c?.label, 40),
          align: c?.align === "right" ? ("right" as const) : ("left" as const),
        }))
      : [];
    if (!columns.length) return [];
    const pick = (row: unknown) =>
      Object.fromEntries(columns.map((c: { key: string }) => [c.key, cleanText((row as Record<string, unknown>)?.[c.key], MAX_CELL)]));
    return [
      {
        title: cleanText(t?.title, 120),
        columns,
        rows: Array.isArray(t?.rows) ? t.rows.slice(0, MAX_ROWS).map(pick) : [],
        footer: t?.footer && typeof t.footer === "object" ? pick(t.footer) : undefined,
      },
    ];
  });
}

async function readLogoAsDataUrl() {
  for (const fileName of ["logo.png", "logo.jpg", "logo.jpeg"]) {
    try {
      const buffer = await fs.readFile(path.join(process.cwd(), "public", fileName));
      const mime = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!ASSISTANT_ROLES.includes(user.role as AssistantRole)) {
    return NextResponse.json({ error: "Indisponível para o seu perfil." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tables = sanitizeTables(body?.tables);
  const analysis = cleanText(body?.analysis, 6000);
  if (!tables.length && !analysis.trim()) {
    return NextResponse.json({ error: "Nada para gerar." }, { status: 400 });
  }

  const now = new Date();
  const data: AiReportPdfData = {
    title: cleanText(body?.title, 120) || tables[0]?.title || "Relatório",
    question: cleanText(body?.question, 500) || null,
    analysis,
    tables,
    generatedAt: now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    generatedBy: user.name,
    logoDataUrl: await readLogoAsDataUrl(),
  };

  try {
    const buffer = await renderToBuffer(
      React.createElement(AiReportPdfDocument as React.ComponentType<{ data: AiReportPdfData }>, { data }) as never
    );
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-v2-${day}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("AI report PDF error:", err);
    return NextResponse.json({ error: "Não foi possível gerar o PDF." }, { status: 500 });
  }
}

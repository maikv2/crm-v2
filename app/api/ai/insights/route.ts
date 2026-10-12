import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser } from "@/lib/auth-user";
import {
  buildScope,
  NAV_DESTINATIONS,
  resolvePath,
  runAssistantTool,
  type AssistantScope,
  type NavDestination,
} from "@/lib/ai/assistant-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-5-5";

// Insights do dashboard: monta um retrato do negocio com as mesmas consultas
// (somente leitura, com o escopo do usuario) que o assistente usa, e pede ao
// Claude de 3 a 5 dicas em JSON estruturado. Nada e gravado no banco.

const INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["alerta", "oportunidade", "tendencia", "resumo"] },
          titulo: { type: "string" },
          mensagem: { type: "string" },
          acao: { type: "string" },
          destino: { type: "string", enum: ["nenhum", ...NAV_DESTINATIONS] },
        },
        required: ["tipo", "titulo", "mensagem", "acao", "destino"],
        additionalProperties: false,
      },
    },
  },
  required: ["insights"],
  additionalProperties: false,
} as const;

type RawInsight = {
  tipo: "alerta" | "oportunidade" | "tendencia" | "resumo";
  titulo: string;
  mensagem: string;
  acao: string;
  destino: string;
};

function isoDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function periods() {
  const today = isoDay(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonth = new Date(Date.UTC(y, m - 2, 1));
  const prevY = prevMonth.getUTCFullYear();
  const prevM = prevMonth.getUTCMonth() + 1;
  const prevLastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    today,
    monthStart,
    prevStart: `${prevY}-${pad(prevM)}-01`,
    // Mesmo trecho do mes anterior (dia 1 ate o mesmo dia) pra comparar justo.
    prevSameDay: `${prevY}-${pad(prevM)}-${pad(Math.min(d, prevLastDay))}`,
    prevEnd: `${prevY}-${pad(prevM)}-${pad(prevLastDay)}`,
  };
}

async function snapshot(scope: AssistantScope) {
  const p = periods();
  const run = async (name: string, input: Record<string, unknown>) =>
    JSON.parse((await runAssistantTool(name, input, scope)).content);

  const [atual, anteriorMesmoTrecho, anteriorCompleto, produtosAtual, produtosAnterior, clientesAtual, regioes, vendedores, parados, vencidas, aVencer, financeiro] =
    await Promise.all([
      run("relatorio_vendas", { de: p.monthStart, ate: p.today, agrupar_por: "resumo" }),
      run("relatorio_vendas", { de: p.prevStart, ate: p.prevSameDay, agrupar_por: "resumo" }),
      run("relatorio_vendas", { de: p.prevStart, ate: p.prevEnd, agrupar_por: "resumo" }),
      run("relatorio_vendas", { de: p.monthStart, ate: p.today, agrupar_por: "produto", limite: 10 }),
      run("relatorio_vendas", { de: p.prevStart, ate: p.prevEnd, agrupar_por: "produto", limite: 10 }),
      run("relatorio_vendas", { de: p.monthStart, ate: p.today, agrupar_por: "cliente", limite: 10 }),
      run("relatorio_vendas", { de: p.monthStart, ate: p.today, agrupar_por: "regiao" }),
      run("relatorio_vendas", { de: p.monthStart, ate: p.today, agrupar_por: "vendedor" }),
      run("clientes_sem_comprar", { dias: 45, limite: 15 }),
      run("contas_a_receber", { situacao: "vencidas", limite: 15 }),
      run("contas_a_receber", { situacao: "a_vencer", dias: 7, limite: 15 }),
      scope.role === "REPRESENTATIVE"
        ? Promise.resolve(null)
        : run("resumo_financeiro", { de: p.monthStart, ate: p.today }),
    ]);

  return {
    hoje: p.today,
    mes_atual_ate_hoje: atual.resumo,
    mes_anterior_mesmo_trecho: anteriorMesmoTrecho.resumo,
    mes_anterior_completo: anteriorCompleto.resumo,
    produtos_mais_vendidos_mes_atual: produtosAtual.linhas,
    produtos_mais_vendidos_mes_anterior: produtosAnterior.linhas,
    maiores_clientes_mes_atual: clientesAtual.linhas,
    vendas_por_regiao_mes_atual: regioes.linhas,
    vendas_por_vendedor_mes_atual: vendedores.linhas,
    clientes_parados_45_dias: { total: parados.total_parados, principais: parados.clientes },
    parcelas_vencidas: { total_listado: vencidas.total_pendente_listado, lista: vencidas.lista },
    parcelas_a_vencer_7_dias: { total_listado: aVencer.total_pendente_listado, lista: aVencer.lista },
    financeiro_mes_atual: financeiro,
  };
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { pathname?: unknown } | null;
  const scope = buildScope(user, String(body?.pathname ?? "").slice(0, 200));
  if (!scope) return NextResponse.json({ error: "Indisponível para o seu perfil." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Assistente de IA ainda não configurado (falta a chave ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  try {
    const data = await snapshot(scope);
    const who =
      scope.role === "REPRESENTATIVE"
        ? `um representante comercial (${user.name}) - os dados são só da região e dos clientes dele; fale com ele na segunda pessoa`
        : `o gestor da empresa (${user.name})`;

    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: INSIGHT_SCHEMA as unknown as Record<string, unknown> },
      },
      system:
        "Você é o analista comercial da V2 Distribuidora (atacado de eletrônicos e acessórios vendidos em pontos de venda, com expositores e representantes por região). Gere insights curtos, concretos e acionáveis em português do Brasil, baseados SOMENTE nos dados fornecidos - nunca invente números.",
      messages: [
        {
          role: "user",
          content: `Dados do CRM (JSON) para ${who}:\n${JSON.stringify(data)}\n\nGere de 3 a 5 insights, do mais importante para o menos importante:
- "alerta": problema que pede ação já (cobrança vencida relevante, queda forte de vendas).
- "oportunidade": onde dá para vender mais (clientes parados que compravam bem, produtos em alta para oferecer a mais clientes, região/vendedor abaixo da média).
- "tendencia": comparação com o mês anterior no mesmo trecho de dias (não compare o mês incompleto com o mês anterior inteiro).
- "resumo": só se os números estiverem bons e não houver algo mais útil.
Cada um: "titulo" (até 60 caracteres), "mensagem" (1 a 2 frases com os números principais em **negrito**, citando nomes de clientes/produtos quando ajudar), "acao" (o que fazer, começando com verbo, até 90 caracteres) e "destino" (a tela do sistema mais útil para executar a ação, ou "nenhum").`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "A IA não conseguiu gerar insights agora." }, { status: 502 });
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = JSON.parse(text) as { insights: RawInsight[] };

    const insights = (parsed.insights ?? []).slice(0, 5).map((i) => {
      const dest = i.destino as NavDestination;
      const href = NAV_DESTINATIONS.includes(dest) ? resolvePath(dest, null, scope) : null;
      return { tipo: i.tipo, titulo: i.titulo, mensagem: i.mensagem, acao: i.acao, href };
    });

    return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("AI insights error:", err);
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Muitas consultas seguidas. Aguarde alguns segundos." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Chave da IA inválida. Verifique a ANTHROPIC_API_KEY." }, { status: 503 });
    }
    if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) {
      return NextResponse.json(
        { error: "IA sem créditos na conta da Anthropic. Adicione créditos em console.anthropic.com (Billing)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Não foi possível gerar os insights." }, { status: 500 });
  }
}

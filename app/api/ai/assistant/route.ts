import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser } from "@/lib/auth-user";
import {
  getAssistantTools,
  runAssistantTool,
  type AssistantRole,
  type AssistantScope,
  type AssistantTable,
} from "@/lib/ai/assistant-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 8;
const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 2000;

const ALLOWED_ROLES: AssistantRole[] = ["ADMIN", "ADMINISTRATIVE", "REPRESENTATIVE"];

// Instrucoes fixas (ficam em cache entre as chamadas). Dados do usuario e a
// data de hoje vao num bloco separado logo depois, pra nao quebrar o cache.
const SYSTEM_PROMPT = `Você é o Assistente V2, a inteligência artificial do CRM da V2 Distribuidora (atacado de eletrônicos, lanternas, acessórios e expositores em pontos de venda, com representantes por região).

O usuário fala com você por voz ou texto, em português do Brasil, enquanto usa o sistema. Muitas vezes a frase veio de reconhecimento de voz e pode ter palavras trocadas - interprete pelo contexto.

O que você faz:
- Consulta dados reais do CRM com as ferramentas (clientes, pedidos, vendas, financeiro, contas a receber, estoque, clientes parados).
- Gera relatórios por período. Converta períodos falados em datas: "este mês", "mês passado", "últimos 30 dias", "semana passada", "setembro", "primeiro trimestre", "ano passado". Se o usuário não disser o período, use o mês atual até hoje e diga isso.
- Abre telas do sistema com a ferramenta abrir_tela quando pedirem para abrir, ir ou mostrar uma tela. Ao achar um cliente ou pedido específico que o usuário quer ver, abra a tela dele.
- Dá insights e dicas práticas para vender mais: compare com o período anterior, aponte quedas e crescimentos, clientes parados que valem uma visita ou ligação, produtos que mais saem, regiões ou vendedores abaixo da média, parcelas vencidas a cobrar.

Regras:
- Nunca invente números. Tudo que você afirmar sobre o negócio tem que vir das ferramentas. Se a ferramenta não traz algo, diga que não tem essa informação.
- Você não altera nada no sistema: não cria, edita, aprova nem apaga registros. Se pedirem isso, explique que por enquanto só consulta e abre a tela certa para a pessoa fazer.
- Quando uma ferramenta devolve uma tabela, ela já aparece na tela do usuário - não repita a tabela inteira. Comente os destaques em poucas linhas.
- Respostas curtas e diretas, pensadas para serem lidas no celular ou ouvidas em voz alta: de 1 a 6 frases ou tópicos curtos. Use **negrito** só para os números principais. Sem tabelas em markdown.
- Valores em reais no formato R$ 1.234,56. Datas no formato dd/mm/aaaa.
- Se o usuário for representante, os dados já vêm limitados à região e aos clientes dele - fale como "seus clientes", "suas vendas".
- Comece a resposta visível imediatamente; o uso é sensível à demora.`;

type ClientMessage = { role: "user" | "assistant"; content: string };

function roleLabel(role: AssistantRole) {
  if (role === "ADMIN") return "administrador (vê todos os dados)";
  if (role === "ADMINISTRATIVE") return "financeiro/administrativo (vê todos os dados de vendas e financeiro)";
  return "representante (vê só a própria região e os próprios pedidos)";
}

function todayInfo() {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const weekday = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  return `${weekday}, ${date} (${iso})`;
}

function sanitizeHistory(raw: unknown): ClientMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const messages: ClientMessage[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    const role = (item as ClientMessage)?.role;
    const content = String((item as ClientMessage)?.content ?? "").slice(0, MAX_MESSAGE_CHARS).trim();
    if ((role !== "user" && role !== "assistant") || !content) continue;
    messages.push({ role, content });
  }
  // A conversa precisa comecar e terminar com o usuario.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;
  return messages;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const role = user.role as AssistantRole;
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "O assistente não está disponível para o seu perfil." }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Assistente de IA ainda não configurado (falta a chave ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown; pathname?: unknown } | null;
  const history = sanitizeHistory(body?.messages);
  if (!history) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }
  const pathname = String(body?.pathname ?? "").slice(0, 200);

  const scope: AssistantScope = {
    userId: user.id,
    role,
    regionId: user.regionId,
    stockLocationId: user.stockLocationId ?? user.region?.stockLocationId ?? null,
    mobile: pathname.startsWith("/m/"),
  };

  const context = [
    `Hoje é ${todayInfo()}.`,
    `Usuário: ${user.name} - perfil ${roleLabel(role)}.`,
    user.region?.name ? `Região do usuário: ${user.region.name}.` : null,
    pathname ? `Tela aberta agora: ${pathname}${scope.mobile ? " (versão celular)" : ""}.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic();
  const tools = getAssistantTools(scope);
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const tables: AssistantTable[] = [];
  let navigate: string | null = null;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: context },
        ],
        tools,
        messages,
      });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({
          reply: "Não consegui atender esse pedido. Tente reformular a pergunta.",
          tables,
          navigate,
        });
      }

      if (response.stop_reason !== "tool_use") {
        const reply = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({
          reply: reply || (navigate ? "Pronto, abrindo a tela." : "Não encontrei uma resposta."),
          tables,
          navigate,
        });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use"
      );
      const results = await Promise.all(
        toolUses.map(async (tool) => {
          const outcome = await runAssistantTool(tool.name, (tool.input ?? {}) as Record<string, unknown>, scope);
          if (outcome.table && outcome.table.rows.length) tables.push(outcome.table);
          if (outcome.navigate) navigate = outcome.navigate;
          return {
            type: "tool_result" as const,
            tool_use_id: tool.id,
            content: outcome.content,
            ...(outcome.isError ? { is_error: true } : {}),
          };
        })
      );
      messages.push({ role: "user", content: results });
    }

    return NextResponse.json({
      reply: "A consulta ficou muito longa. Tente pedir algo mais específico.",
      tables,
      navigate,
    });
  } catch (err) {
    console.error("AI assistant error:", err);
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Muitas consultas seguidas. Aguarde alguns segundos." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Chave da IA inválida. Verifique a ANTHROPIC_API_KEY." }, { status: 503 });
    }
    return NextResponse.json({ error: "Erro ao falar com a IA. Tente novamente." }, { status: 500 });
  }
}

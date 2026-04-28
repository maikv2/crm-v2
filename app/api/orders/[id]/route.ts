import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

function onlyDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function moneyFromCents(value?: number | null) {
  return Number(((value ?? 0) / 100).toFixed(2));
}

function numberOrDefault(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function basicAuth(token: string) {
  return `Basic ${Buffer.from(`${token.trim()}:`).toString("base64")}`;
}

function cleanText(value?: string | null, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

/**
 * Valida se uma Inscrição Estadual parece preenchida de verdade.
 * Regra simples: mínimo 8 dígitos numéricos.
 * Isso evita mandar IE em branco, "0", "ISENTO" ou inválida para a SEFAZ,
 * o que causa Rejeição 305 ("Destinatário bloqueado na UF").
 */
function ieValida(ie?: string | null): boolean {
  const digits = onlyDigits(ie);
  return digits.length >= 8;
}

/**
 * GET /api/orders/[id]/nfe
 * Consulta o status atual da NF-e no Focus NFe e sincroniza com o banco.
 * Retorna os dados fiscais atualizados para a UI.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await context.params;

    const [company, order] = await Promise.all([
      prisma.companyProfile.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.order.findUnique({ where: { id }, select: { id: true, nfeStatus: true, nfeNumber: true, nfeKey: true, nfeXmlUrl: true, updatedAt: true } }),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    if (!company?.nfeToken) {
      return NextResponse.json({ error: "Token Focus NFe não configurado." }, { status: 400 });
    }

    const ref = `crm-v2-order-${order.id}`;
    const focusBaseUrl =
      company.nfeEnvironment === "production"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    // Consulta status no Focus NFe
    const focusRes = await fetch(
      `${focusBaseUrl}/v2/nfe/${encodeURIComponent(ref)}?completa=0`,
      {
        method: "GET",
        headers: {
          Authorization: basicAuth(company.nfeToken),
          Accept: "application/json",
        },
      }
    );

    if (!focusRes.ok) {
      // Se a NF-e ainda não existe no Focus (404), retorna o estado atual do banco
      return NextResponse.json({
        nfeStatus: order.nfeStatus,
        nfeNumber: order.nfeNumber,
        nfeKey: order.nfeKey,
        nfeXmlUrl: order.nfeXmlUrl,
      });
    }

    const focusData: any = await focusRes.json();

    // Mapeamento do status do Focus para o status interno
    // Focus status: autorizado | processando_autorizacao | erro_autorizacao | cancelado | denegado
    function mapFocusStatus(s: string | undefined, fallback: string): string {
      switch (s) {
        case "autorizado":                return "AUTHORIZED";
        case "processando_autorizacao":   return "PROCESSING";
        case "erro_autorizacao":          return "ERROR";
        case "cancelado":                 return "ERROR";
        case "denegado":                  return "REJECTED";
        default:                          return fallback;
      }
    }

    const newStatus = mapFocusStatus(
      focusData?.status_sefaz ?? focusData?.status,
      order.nfeStatus ?? "PROCESSING"
    );
    const newNumber    = focusData?.numero ? String(focusData.numero) : order.nfeNumber;
    const newKey       = focusData?.chave_nfe ?? focusData?.chave ?? order.nfeKey;
    const newXmlUrl    = focusData?.caminho_xml_nota_fiscal ?? focusData?.url_xml ?? order.nfeXmlUrl;

    // Persiste no banco se mudou alguma coisa
    if (
      newStatus  !== order.nfeStatus  ||
      newNumber  !== order.nfeNumber  ||
      newKey     !== order.nfeKey     ||
      newXmlUrl  !== order.nfeXmlUrl
    ) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          nfeStatus:  newStatus,
          nfeNumber:  newNumber ?? undefined,
          nfeKey:     newKey    ?? undefined,
          nfeXmlUrl:  newXmlUrl ?? undefined,
        },
      });
    }

    return NextResponse.json({
      nfeStatus: newStatus,
      nfeNumber: newNumber,
      nfeKey:    newKey,
      nfeXmlUrl: newXmlUrl,
      focusStatus: focusData?.status_sefaz ?? focusData?.status,
    });
  } catch (error: any) {
    console.error("GET /api/orders/[id]/nfe error:", error);
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || "Erro ao consultar NF-e." }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await context.params;

    // ── 1. Dados da empresa emitente ────────────────────────────────────────
    const company = await prisma.companyProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Cadastre os dados da empresa antes de emitir NF-e." },
        { status: 400 }
      );
    }

    if (!company.nfeToken) {
      return NextResponse.json(
        { error: "Informe o token da Focus NFe no cadastro da empresa." },
        { status: 400 }
      );
    }

    if (!company.cnpj || !company.stateRegistration || !company.taxRegime) {
      return NextResponse.json(
        {
          error:
            "Complete CNPJ, Inscrição Estadual e Regime Tributário no cadastro da empresa.",
        },
        { status: 400 }
      );
    }

    // ── 2. Pedido com todos os relacionamentos ───────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        region: true,
        seller: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (!order.client) {
      return NextResponse.json(
        { error: "Pedido sem cliente vinculado." },
        { status: 400 }
      );
    }

    if (!order.items.length) {
      return NextResponse.json(
        { error: "Pedido sem itens." },
        { status: 400 }
      );
    }

    // ── 3. Validação de NCM em todos os itens ────────────────────────────────
    const missingFiscalItems = order.items.filter(
      (item) => !item.ncm && !item.product?.ncm
    );

    if (missingFiscalItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Existem produtos sem NCM. Corrija o cadastro dos produtos antes de emitir.",
          detalhes: missingFiscalItems.map((item) => ({
            produto: item.product?.name,
            sku: item.product?.sku,
          })),
        },
        { status: 400 }
      );
    }

    // ── 4. Validação de CEP do destinatário ──────────────────────────────────
    const client: any = order.client;

    const cepDestinatario = onlyDigits(
      client.zipCode || client.cep || client.postalCode
    );

    if (!cepDestinatario) {
      return NextResponse.json(
        {
          error:
            "Cliente sem CEP válido. Corrija o cadastro do cliente antes de emitir NF-e.",
        },
        { status: 400 }
      );
    }

    // ── 5. Determinar UFs e local de destino ─────────────────────────────────
    const emitenteUf = cleanText(company.state, "SC").toUpperCase();
    const destinatarioUf = cleanText(client.state, emitenteUf).toUpperCase();
    const localDestino = emitenteUf === destinatarioUf ? 1 : 2;

    // ── 6. Lógica corrigida de IE do destinatário ────────────────────────────
    //
    // CORREÇÃO PRINCIPAL — Rejeição 305 "Destinatário bloqueado na UF":
    //
    // O erro ocorre quando enviamos indicador_inscricao_estadual = 1 (contribuinte)
    // com uma IE que está cancelada, suspensa ou inválida na SEFAZ.
    //
    // Regra adotada:
    //   • Só enviamos a IE e marcamos como contribuinte (indicador = 1)
    //     se a IE tiver ao menos 8 dígitos numéricos.
    //   • Caso contrário, omitimos a IE e usamos indicador = 9
    //     (não contribuinte / consumidor final).
    //
    // Se mesmo assim rejeitar com erro 305, o campo "Inscrição Estadual"
    // do cadastro do cliente deve ser apagado — a IE pode estar bloqueada
    // na SEFAZ-SC. Consulte em: https://www.sintegra.gov.br
    //
    const destinatarioIeValida = ieValida(client.stateRegistration);
    const destinatarioIe = destinatarioIeValida
      ? onlyDigits(client.stateRegistration)
      : undefined;

    // ── 7. Valores monetários ────────────────────────────────────────────────
    const valorProdutos = moneyFromCents(order.subtotalCents);
    const valorDesconto = moneyFromCents(order.discountCents);
    const valorTotal = moneyFromCents(order.totalCents);

    // ── 8. Referência única por pedido ───────────────────────────────────────
    const ref = `crm-v2-order-${order.id}`;

    // ── 9. Payload NF-e ──────────────────────────────────────────────────────
    const payload = {
      natureza_operacao: "Venda de Mercadorias / Produtos",
      data_emissao: new Date().toISOString(),
      data_entrada_saida: new Date().toISOString(),
      tipo_documento: 1,
      local_destino: localDestino,
      finalidade_emissao: 1,

      // consumidor_final: 1 se NÃO tem IE válida (pessoa física ou não contribuinte)
      consumidor_final: destinatarioIeValida ? 0 : 1,

      presenca_comprador: 1,

      // ── Emitente ────────────────────────────────────────────────────────
      cnpj_emitente: onlyDigits(company.cnpj),
      nome_emitente: cleanText(company.legalName, company.tradeName),
      nome_fantasia_emitente: cleanText(
        company.tradeName,
        company.legalName || company.tradeName
      ),
      logradouro_emitente: cleanText(company.street),
      numero_emitente: cleanText(company.number, "S/N"),
      bairro_emitente: cleanText(company.district),
      municipio_emitente: cleanText(company.city),
      uf_emitente: emitenteUf,
      cep_emitente: onlyDigits(company.zipCode),
      telefone_emitente: onlyDigits(company.phone),
      inscricao_estadual_emitente: onlyDigits(company.stateRegistration),
      regime_tributario_emitente: numberOrDefault(company.taxRegime, 3),

      // ── Destinatário ────────────────────────────────────────────────────
      nome_destinatario: cleanText(client.legalName, client.name),
      cnpj_destinatario: client.cnpj ? onlyDigits(client.cnpj) : undefined,
      cpf_destinatario:
        !client.cnpj && client.cpf ? onlyDigits(client.cpf) : undefined,

      // CORRIGIDO: só envia IE se for válida
      inscricao_estadual_destinatario: destinatarioIe,

      // CORRIGIDO: 1 = contribuinte com IE válida | 9 = não contribuinte
      indicador_inscricao_estadual_destinatario: destinatarioIeValida ? 1 : 9,

      logradouro_destinatario: cleanText(client.street),
      numero_destinatario: cleanText(client.number, "S/N"),
      bairro_destinatario: cleanText(client.district),
      municipio_destinatario: cleanText(client.city),
      uf_destinatario: destinatarioUf,
      cep_destinatario: cepDestinatario,
      pais_destinatario: "Brasil",
      telefone_destinatario: onlyDigits(client.phone) || "0000000000",

      // ── Totais ──────────────────────────────────────────────────────────
      valor_frete: 0,
      valor_seguro: 0,
      valor_desconto: valorDesconto,
      valor_outras_despesas: 0,
      valor_produtos: valorProdutos,
      valor_total: valorTotal,
      modalidade_frete: 9,

      // ── Itens ───────────────────────────────────────────────────────────
      items: order.items.map((item, index) => {
        const unitValue = moneyFromCents(item.unitCents);
        const totalValue = moneyFromCents(item.qty * item.unitCents);
        const origem = numberOrDefault(item.product?.origem, 2);

        // Alíquota ICMS: 17% intra | 4% importado inter | 12% nacional inter
        const icmsRate =
          emitenteUf === destinatarioUf
            ? 17
            : [1, 2, 3, 8].includes(origem)
            ? 4
            : 12;

        // CST: regime Simples Nacional usa 2xx, Lucro Presumido/Real usa "00"
        const icmsCst =
          String(company.taxRegime) === "1"
            ? (item.cst || item.product?.cst || "200")
            : "00";

        return {
          numero_item: index + 1,
          codigo_produto: item.product?.sku || item.productId,
          descricao: item.product?.name || "Produto",
          codigo_ncm: item.ncm || item.product?.ncm,
          ...(item.product?.cest ? { cest: item.product.cest } : {}),
          cfop: emitenteUf === destinatarioUf ? "5102" : "6102",
          unidade_comercial:
            item.unit || item.product?.commercialUnit || "QU",
          quantidade_comercial: item.qty,
          valor_unitario_comercial: unitValue,
          valor_unitario_tributavel: unitValue,
          unidade_tributavel:
            item.unit || item.product?.commercialUnit || "QU",
          quantidade_tributavel: item.qty,
          valor_bruto: totalValue,

          icms_situacao_tributaria: icmsCst,
          icms_origem: origem,
          icms_modalidade_base_calculo: 3,
          icms_base_calculo: totalValue,
          icms_aliquota: icmsRate,
          icms_valor: Number(((totalValue * icmsRate) / 100).toFixed(2)),

          pis_situacao_tributaria: "01",
          pis_base_calculo: totalValue,
          pis_aliquota: 0.65,
          pis_valor: Number((totalValue * 0.0065).toFixed(2)),

          cofins_situacao_tributaria: "01",
          cofins_base_calculo: totalValue,
          cofins_aliquota: 3,
          cofins_valor: Number((totalValue * 0.03).toFixed(2)),
        };
      }),
    };

    // ── 10. Envio para Focus NFe ─────────────────────────────────────────────
    const focusBaseUrl =
      company.nfeEnvironment === "production"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

    const response = await fetch(
      `${focusBaseUrl}/v2/nfe?ref=${encodeURIComponent(ref)}`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuth(company.nfeToken),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await response.text();

    let data: any = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { raw: responseText };
    }

    // ── 11. Tratamento de erros da SEFAZ ────────────────────────────────────
    if (!response.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { nfeStatus: "ERROR" },
      });

      // Dica específica para Rejeição 305
      const mensagemSefaz: string =
        data?.erros?.[0]?.mensagem ||
        data?.mensagem_sefaz ||
        JSON.stringify(data);

      const dica305 = mensagemSefaz.toLowerCase().includes("bloqueado")
        ? " → Remova a Inscrição Estadual do cadastro do cliente (pode estar cancelada na SEFAZ). Consulte: sintegra.gov.br"
        : "";

      return NextResponse.json(
        {
          error: `Erro ao enviar NF-e para Focus NFe.${dica305}`,
          status: response.status,
          detalhes: data,
        },
        { status: 400 }
      );
    }

    // ── 12. Salvar resultado no pedido ───────────────────────────────────────
    await prisma.order.update({
      where: { id: order.id },
      data: {
        nfeStatus: response.status === 201 ? "AUTHORIZED" : "PROCESSING",
        nfeNumber: data?.numero
          ? String(data.numero)
          : String(company.nfeNextNumber || ""),
        nfeKey: data?.chave_nfe || data?.chave || null,
        nfeXmlUrl:
          data?.caminho_xml_nota_fiscal || data?.url_xml || null,
      },
    });

    await prisma.companyProfile.update({
      where: { id: company.id },
      data: {
        nfeNextNumber: (company.nfeNextNumber || 494) + 1,
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        response.status === 201
          ? "NF-e autorizada com sucesso."
          : "NF-e enviada para processamento.",
      status: response.status,
      ref,
      data,
    });
  } catch (error: any) {
    console.error("POST /api/orders/[id]/nfe error:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    return NextResponse.json(
      { error: error?.message || "Erro interno ao emitir NF-e." },
      { status: 500 }
    );
  }
}
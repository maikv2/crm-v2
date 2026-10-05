import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrderAccess, OrderAccessError } from "@/lib/order-auth";

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

function getFocusBaseUrl(environment?: string | null) {
  return environment === "production"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
}

function getNfeRef(orderId: string) {
  return `crm-v2-order-${orderId}`;
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return null;
}

function mapFocusStatus(data: any) {
  const raw = String(data?.status ?? data?.codigo_status ?? "").toLowerCase();
  const mensagem = String(
    data?.mensagem ?? data?.mensagem_sefaz ?? "",
  ).toLowerCase();

  if (raw.includes("autoriz") || mensagem.includes("autoriz"))
    return "AUTHORIZED";
  if (raw.includes("cancel")) return "CANCELLED";
  if (
    raw.includes("erro") ||
    raw.includes("rejeit") ||
    mensagem.includes("rejei")
  )
    return "REJECTED";
  if (raw.includes("process")) return "PROCESSING";

  if (
    data?.chave_nfe ||
    data?.chave ||
    data?.caminho_xml_nota_fiscal ||
    data?.url_xml
  ) {
    return "AUTHORIZED";
  }

  return "PROCESSING";
}

function buildOrderNfeUpdate(data: any, fallbackNumber?: string | null) {
  return {
    nfeStatus: mapFocusStatus(data),
    nfeNumber: pickFirstString(data?.numero, data?.numero_nfe, fallbackNumber),
    nfeKey: pickFirstString(data?.chave_nfe, data?.chave),
    nfeXmlUrl: pickFirstString(data?.caminho_xml_nota_fiscal, data?.url_xml),
  };
}

function ieValida(ie?: string | null): boolean {
  const digits = onlyDigits(ie);
  return digits.length >= 8;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOrderAccess(id);

    const [company, order] = await Promise.all([
      prisma.companyProfile.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          number: true,
          nfeStatus: true,
          nfeNumber: true,
          nfeKey: true,
          nfeXmlUrl: true,
        },
      }),
    ]);

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (!company?.nfeToken) {
      return NextResponse.json(
        { error: "Token Focus NFe não configurado." },
        { status: 400 },
      );
    }

    const ref = getNfeRef(order.id);
    const focusBaseUrl = getFocusBaseUrl(company.nfeEnvironment);

    const response = await fetch(
      `${focusBaseUrl}/v2/nfe/${encodeURIComponent(ref)}?completa=1`,
      {
        method: "GET",
        headers: {
          Authorization: basicAuth(company.nfeToken),
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const responseText = await response.text();

    let data: any = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Erro ao consultar NF-e na Focus NFe (${response.status}).`,
          status: response.status,
          detalhes: data,
        },
        { status: response.status === 404 ? 404 : 400 },
      );
    }

    const update = buildOrderNfeUpdate(data, order.nfeNumber);

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: update,
      select: {
        id: true,
        nfeStatus: true,
        nfeNumber: true,
        nfeKey: true,
        nfeXmlUrl: true,
      },
    });

    return NextResponse.json({
      ok: true,
      ref,
      ...updatedOrder,
      data,
    });
  } catch (error: any) {
    if (error instanceof OrderAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("GET /api/orders/[id]/nfe error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao consultar NF-e." },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOrderAccess(id);

    const company = await prisma.companyProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Cadastre os dados da empresa antes de emitir NF-e." },
        { status: 400 },
      );
    }

    if (!company.nfeToken) {
      return NextResponse.json(
        { error: "Informe o token da Focus NFe no cadastro da empresa." },
        { status: 400 },
      );
    }

    if (!company.cnpj || !company.stateRegistration || !company.taxRegime) {
      return NextResponse.json(
        {
          error:
            "Complete CNPJ, Inscrição Estadual e Regime Tributário no cadastro da empresa.",
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        region: true,
        seller: true,
        items: { include: { product: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (!order.client) {
      return NextResponse.json(
        { error: "Pedido sem cliente vinculado." },
        { status: 400 },
      );
    }

    if (!order.items.length) {
      return NextResponse.json({ error: "Pedido sem itens." }, { status: 400 });
    }

    const missingFiscalItems = order.items.filter(
      (item) => !item.ncm && !item.product?.ncm,
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
        { status: 400 },
      );
    }

    const client: any = order.client;

    const cepDestinatario = onlyDigits(
      client.zipCode || client.cep || client.postalCode,
    );

    if (!cepDestinatario) {
      return NextResponse.json(
        {
          error:
            "Cliente sem CEP válido. Corrija o cadastro do cliente antes de emitir NF-e.",
        },
        { status: 400 },
      );
    }

    const emitenteUf = cleanText(company.state, "SC").toUpperCase();
    const destinatarioUf = cleanText(client.state, emitenteUf).toUpperCase();
    const localDestino = emitenteUf === destinatarioUf ? 1 : 2;

    const destinatarioIeValida = ieValida(client.stateRegistration);
    const destinatarioIe = destinatarioIeValida
      ? onlyDigits(client.stateRegistration)
      : undefined;

    const valorProdutos = moneyFromCents(order.subtotalCents);
    const valorDesconto = moneyFromCents(order.discountCents);
    const valorTotal = moneyFromCents(order.totalCents);

    const ref = getNfeRef(order.id);

    // Reforma Tributaria (LC 214/2025 + NT 2025.002): regime normal precisa
    // informar o grupo IBS/CBS por item. Em 2026 valem as aliquotas-teste
    // (CBS 0,9% e IBS UF 0,1%, IBS municipal 0%). A base exclui ICMS, PIS e
    // COFINS e o desconto do item.
    const informarIbsCbs = String(company.taxRegime) !== "1";
    const CBS_ALIQUOTA = 0.9;
    const IBS_UF_ALIQUOTA = 0.1;
    const IBS_MUN_ALIQUOTA = 0;

    // Rateia o desconto do pedido entre os itens (o ultimo fica com a sobra)
    // para que a base do IBS/CBS de cada item bata com o desconto informado.
    const itemGrossCents = order.items.map((item) => item.qty * item.unitCents);
    const grossSumCents = itemGrossCents.reduce((s, v) => s + v, 0);
    const discountCents = Math.max(0, order.discountCents ?? 0);
    let discountLeftCents = discountCents;
    const itemDiscountCents = itemGrossCents.map((gross, index) => {
      if (index === itemGrossCents.length - 1) return discountLeftCents;
      const share = grossSumCents
        ? Math.round((discountCents * gross) / grossSumCents)
        : 0;
      discountLeftCents -= share;
      return share;
    });

    let ibsCbsBaseTotal = 0;
    let cbsValorTotal = 0;
    let ibsUfValorTotal = 0;
    let ibsMunValorTotal = 0;

    const payload = {
      natureza_operacao: "Venda de Mercadorias / Produtos",
      numero: company.nfeNextNumber || 1,
      serie: company.nfeSeries || "1",
      data_emissao: new Date().toISOString(),
      data_entrada_saida: new Date().toISOString(),
      tipo_documento: 1,
      local_destino: localDestino,
      finalidade_emissao: 1,
      consumidor_final: destinatarioIeValida ? 0 : 1,
      presenca_comprador: 1,
      cnpj_emitente: onlyDigits(company.cnpj),
      nome_emitente: cleanText(company.legalName, company.tradeName),
      nome_fantasia_emitente: cleanText(
        company.tradeName,
        company.legalName || company.tradeName,
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
      nome_destinatario: cleanText(client.legalName, client.name),
      cnpj_destinatario: client.cnpj ? onlyDigits(client.cnpj) : undefined,
      cpf_destinatario:
        !client.cnpj && client.cpf ? onlyDigits(client.cpf) : undefined,
      inscricao_estadual_destinatario: destinatarioIe,
      indicador_inscricao_estadual_destinatario: destinatarioIeValida ? 1 : 9,
      logradouro_destinatario: cleanText(client.street),
      numero_destinatario: cleanText(client.number, "S/N"),
      bairro_destinatario: cleanText(client.district),
      municipio_destinatario: cleanText(client.city),
      uf_destinatario: destinatarioUf,
      cep_destinatario: cepDestinatario,
      pais_destinatario: "Brasil",
      telefone_destinatario: onlyDigits(client.phone) || "0000000000",
      valor_frete: 0,
      valor_seguro: 0,
      valor_desconto: valorDesconto,
      valor_outras_despesas: 0,
      valor_produtos: valorProdutos,
      valor_total: valorTotal,
      modalidade_frete: 9,
      items: order.items.map((item, index) => {
        const unitValue = moneyFromCents(item.unitCents);
        const totalValue = moneyFromCents(item.qty * item.unitCents);
        const origem = numberOrDefault(item.product?.origem, 2);

        const icmsRate =
          emitenteUf === destinatarioUf
            ? 17
            : [1, 2, 3, 8].includes(origem)
              ? 4
              : 12;

        const icmsCst =
          String(company.taxRegime) === "1"
            ? item.cst || item.product?.cst || "200"
            : "00";

        const icmsValor = Number(((totalValue * icmsRate) / 100).toFixed(2));
        const pisValor = Number((totalValue * 0.0065).toFixed(2));
        const cofinsValor = Number((totalValue * 0.03).toFixed(2));
        const itemDesconto = moneyFromCents(itemDiscountCents[index]);

        let ibsCbsFields: Record<string, string | number> = {};
        if (informarIbsCbs) {
          const base = Math.max(
            0,
            Number(
              (
                totalValue -
                itemDesconto -
                icmsValor -
                pisValor -
                cofinsValor
              ).toFixed(2),
            ),
          );
          const cbsValor = Number(((base * CBS_ALIQUOTA) / 100).toFixed(2));
          const ibsUfValor = Number(((base * IBS_UF_ALIQUOTA) / 100).toFixed(2));
          const ibsMunValor = Number(
            ((base * IBS_MUN_ALIQUOTA) / 100).toFixed(2),
          );

          ibsCbsBaseTotal += base;
          cbsValorTotal += cbsValor;
          ibsUfValorTotal += ibsUfValor;
          ibsMunValorTotal += ibsMunValor;

          ibsCbsFields = {
            ibs_cbs_situacao_tributaria: "000",
            ibs_cbs_classificacao_tributaria: "000001",
            ibs_cbs_base_calculo: base,
            ibs_uf_aliquota: IBS_UF_ALIQUOTA,
            ibs_uf_valor: ibsUfValor,
            ibs_mun_aliquota: IBS_MUN_ALIQUOTA,
            ibs_mun_valor: ibsMunValor,
            ibs_valor_total: Number((ibsUfValor + ibsMunValor).toFixed(2)),
            cbs_aliquota: CBS_ALIQUOTA,
            cbs_valor: cbsValor,
          };
        }

        return {
          numero_item: index + 1,
          codigo_produto: item.product?.sku || item.productId,
          descricao: item.product?.name || "Produto",
          codigo_ncm: item.ncm || item.product?.ncm,
          ...(item.product?.cest ? { cest: item.product.cest } : {}),
          cfop: emitenteUf === destinatarioUf ? "5102" : "6102",
          unidade_comercial: item.unit || item.product?.commercialUnit || "QU",
          quantidade_comercial: item.qty,
          valor_unitario_comercial: unitValue,
          valor_unitario_tributavel: unitValue,
          unidade_tributavel: item.unit || item.product?.commercialUnit || "QU",
          quantidade_tributavel: item.qty,
          valor_bruto: totalValue,
          ...(itemDesconto > 0 ? { valor_desconto: itemDesconto } : {}),
          icms_situacao_tributaria: icmsCst,
          icms_origem: origem,
          icms_modalidade_base_calculo: 3,
          icms_base_calculo: totalValue,
          icms_aliquota: icmsRate,
          icms_valor: icmsValor,
          pis_situacao_tributaria: "01",
          pis_base_calculo: totalValue,
          pis_aliquota: 0.65,
          pis_valor: pisValor,
          cofins_situacao_tributaria: "01",
          cofins_base_calculo: totalValue,
          cofins_aliquota: 3,
          cofins_valor: cofinsValor,
          ...ibsCbsFields,
        };
      }),
    };

    if (informarIbsCbs) {
      Object.assign(payload, {
        ibs_cbs_base_calculo: Number(ibsCbsBaseTotal.toFixed(2)),
        cbs_valor_total: Number(cbsValorTotal.toFixed(2)),
        ibs_uf_valor_total: Number(ibsUfValorTotal.toFixed(2)),
        ibs_mun_valor_total: Number(ibsMunValorTotal.toFixed(2)),
        ibs_valor_total: Number((ibsUfValorTotal + ibsMunValorTotal).toFixed(2)),
      });
    }

    const focusBaseUrl = getFocusBaseUrl(company.nfeEnvironment);

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
      },
    );

    const responseText = await response.text();

    let data: any = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { nfeStatus: "ERROR" },
      });

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
        { status: 400 },
      );
    }

    const update = buildOrderNfeUpdate(
      data,
      String(company.nfeNextNumber || ""),
    );

    await prisma.order.update({
      where: { id: order.id },
      data: update,
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
    if (error instanceof OrderAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("POST /api/orders/[id]/nfe error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao emitir NF-e." },
      { status: 500 },
    );
  }
}

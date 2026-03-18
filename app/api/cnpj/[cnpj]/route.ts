import { NextResponse } from "next/server";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCNPJ(cnpj: string) {
  cnpj = onlyDigits(cnpj);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(1))) return false;

  return true;
}

export async function GET(
  _: Request,
  context: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj: rawCnpj } = await context.params;
    const cnpj = onlyDigits(rawCnpj);

    if (!isValidCNPJ(cnpj)) {
      return NextResponse.json(
        { error: "CNPJ inválido" },
        { status: 400 }
      );
    }

    // Exemplo usando BrasilAPI
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Não foi possível consultar o CNPJ agora" },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      cnpj: data.cnpj ?? "",
      razaoSocial: data.razao_social ?? "",
      nomeFantasia: data.nome_fantasia ?? "",
      cep: data.cep ?? "",
      logradouro: data.logradouro ?? "",
      numero: data.numero ?? "",
      complemento: data.complemento ?? "",
      bairro: data.bairro ?? "",
      municipio: data.municipio ?? "",
      uf: data.uf ?? "",
      email: data.email ?? "",
      telefone: data.ddd_telefone_1 ?? "",
      situacao: data.descricao_situacao_cadastral ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao consultar CNPJ" },
      { status: 500 }
    );
  }
}
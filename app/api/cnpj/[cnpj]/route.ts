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

type CnpjData = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  email: string;
  telefone: string;
  situacao: string;
};

type SourceResult = CnpjData | "NOT_FOUND" | null;

const str = (value: unknown) => (value == null ? "" : String(value).trim());

async function fetchJson(url: string): Promise<{ status: number; data: any } | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "v2-crm/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const data = response.ok ? await response.json() : null;
    return { status: response.status, data };
  } catch {
    return null;
  }
}

async function fromBrasilApi(cnpj: string): Promise<SourceResult> {
  const res = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (res?.status === 404) return "NOT_FOUND";
  const d = res?.data;
  if (!d?.razao_social) return null;
  return {
    cnpj: str(d.cnpj),
    razaoSocial: str(d.razao_social),
    nomeFantasia: str(d.nome_fantasia),
    cep: str(d.cep),
    logradouro: [str(d.descricao_tipo_de_logradouro), str(d.logradouro)].filter(Boolean).join(" "),
    numero: str(d.numero),
    complemento: str(d.complemento),
    bairro: str(d.bairro),
    municipio: str(d.municipio),
    uf: str(d.uf),
    email: str(d.email),
    telefone: str(d.ddd_telefone_1),
    situacao: str(d.descricao_situacao_cadastral),
  };
}

async function fromOpenCnpj(cnpj: string): Promise<SourceResult> {
  const res = await fetchJson(`https://api.opencnpj.org/${cnpj}`);
  if (res?.status === 404) return "NOT_FOUND";
  const d = res?.data;
  if (!d?.razao_social) return null;
  const phone = Array.isArray(d.telefones) ? d.telefones.find((t: any) => !t?.is_fax) : null;
  return {
    cnpj: str(d.cnpj),
    razaoSocial: str(d.razao_social),
    nomeFantasia: str(d.nome_fantasia),
    cep: str(d.cep),
    logradouro: [str(d.tipo_logradouro), str(d.logradouro)].filter(Boolean).join(" "),
    numero: str(d.numero),
    complemento: str(d.complemento),
    bairro: str(d.bairro),
    municipio: str(d.municipio),
    uf: str(d.uf),
    email: str(d.email),
    telefone: phone ? `${str(phone.ddd)}${str(phone.numero)}` : "",
    situacao: str(d.situacao_cadastral),
  };
}

async function fromCnpjWs(cnpj: string): Promise<SourceResult> {
  const res = await fetchJson(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  if (res?.status === 404) return "NOT_FOUND";
  const d = res?.data;
  const e = d?.estabelecimento;
  if (!d?.razao_social || !e) return null;
  return {
    cnpj: str(e.cnpj),
    razaoSocial: str(d.razao_social),
    nomeFantasia: str(e.nome_fantasia),
    cep: str(e.cep),
    logradouro: [str(e.tipo_logradouro), str(e.logradouro)].filter(Boolean).join(" "),
    numero: str(e.numero),
    complemento: str(e.complemento),
    bairro: str(e.bairro),
    municipio: str(e.cidade?.nome),
    uf: str(e.estado?.sigla),
    email: str(e.email),
    telefone: `${str(e.ddd1)}${str(e.telefone1)}`,
    situacao: str(e.situacao_cadastral),
  };
}

const CNPJ_SOURCES = [fromBrasilApi, fromOpenCnpj, fromCnpjWs];

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

    // Tenta as fontes gratuitas em ordem: se uma estiver fora do ar,
    // bloqueando o servidor ou sem o CNPJ, passa pra proxima.
    let notFound = false;
    for (const source of CNPJ_SOURCES) {
      const result = await source(cnpj);
      if (result === "NOT_FOUND") {
        notFound = true;
        continue;
      }
      if (result) return NextResponse.json(result);
    }

    if (notFound) {
      return NextResponse.json(
        { error: "CNPJ não encontrado na Receita Federal" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível consultar o CNPJ agora. Tente de novo em alguns segundos." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao consultar CNPJ" },
      { status: 500 }
    );
  }
}
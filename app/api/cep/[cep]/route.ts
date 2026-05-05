import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  erro?: boolean;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ cep: string }> }
) {
  try {
    const { cep: rawCep } = await context.params;
    const cep = onlyDigits(rawCep);

    if (cep.length !== 8) {
      return NextResponse.json(
        { error: "CEP inválido. Informe 8 dígitos." },
        { status: 400 }
      );
    }

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Não foi possível consultar o CEP." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as ViaCepResponse;

    if (data?.erro) {
      return NextResponse.json(
        { error: "CEP não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cep: data.cep ?? null,
      street: data.logradouro ?? null,
      complement: data.complemento ?? null,
      district: data.bairro ?? null,
      city: data.localidade ?? null,
      state: (data.uf ?? null)?.toUpperCase() ?? null,
      ibge: data.ibge ?? null,
    });
  } catch (error) {
    console.error("GET /api/cep error:", error);
    return NextResponse.json(
      { error: "Erro ao consultar CEP." },
      { status: 500 }
    );
  }
}

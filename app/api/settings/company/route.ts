import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

function onlyDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function normalizeInt(value?: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();

    const item = await prisma.companyProfile.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      item: item ?? null,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    console.error("GET /api/settings/company error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os dados da empresa." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();

    const tradeName = normalizeText(body.tradeName);
    const legalName = normalizeText(body.legalName);
    const cnpj = onlyDigits(body.cnpj) || null;
    const phone = onlyDigits(body.phone) || null;
    const email = normalizeText(body.email)?.toLowerCase() ?? null;
    const street = normalizeText(body.street);
    const number = normalizeText(body.number);
    const district = normalizeText(body.district);
    const city = normalizeText(body.city);
    const state = normalizeText(body.state)?.toUpperCase() ?? null;
    const zipCode = onlyDigits(body.zipCode) || null;
    const country = normalizeText(body.country) ?? "Brasil";
    const logoUrl = normalizeText(body.logoUrl);
    const primaryColor = normalizeText(body.primaryColor);
    const notes = normalizeText(body.notes);

    const stateRegistration = onlyDigits(body.stateRegistration) || null;
    const taxRegime = normalizeText(body.taxRegime);
    const nfeSeries = normalizeText(body.nfeSeries) ?? "1";
    const nfeNextNumber = normalizeInt(body.nfeNextNumber);
    const nfeEnvironment = normalizeText(body.nfeEnvironment) ?? "homologation";
    const nfeToken = normalizeText(body.nfeToken);

    if (!tradeName) {
      return NextResponse.json(
        { error: "O nome fantasia da empresa é obrigatório." },
        { status: 400 }
      );
    }

    const existing = await prisma.companyProfile.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    let item;

    if (!existing) {
      item = await prisma.companyProfile.create({
        data: {
          tradeName,
          legalName,
          cnpj,
          phone,
          email,
          street,
          number,
          district,
          city,
          state,
          zipCode,
          country,
          logoUrl,
          primaryColor,
          notes,

          stateRegistration,
          taxRegime,
          nfeSeries,
          nfeNextNumber,
          nfeEnvironment,
          nfeToken,
        },
      });
    } else {
      item = await prisma.companyProfile.update({
        where: {
          id: existing.id,
        },
        data: {
          tradeName,
          legalName,
          cnpj,
          phone,
          email,
          street,
          number,
          district,
          city,
          state,
          zipCode,
          country,
          logoUrl,
          primaryColor,
          notes,

          stateRegistration,
          taxRegime,
          nfeSeries,
          nfeNextNumber,
          nfeEnvironment,
          nfeToken,
        },
      });
    }

    return NextResponse.json({
      item,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    console.error("PUT /api/settings/company error:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar os dados da empresa." },
      { status: 500 }
    );
  }
}
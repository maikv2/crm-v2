import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { buildAddress, geocodeAddress } from "@/lib/geocoding";

function getIdFromRequest(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  return parts[parts.length - 1];
}

function onlyDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function isValidCPF(cpf: string) {
  cpf = onlyDigits(cpf);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf.charAt(i)) * (10 - i);
  }

  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  if (firstDigit !== Number(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf.charAt(i)) * (11 - i);
  }

  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;

  return secondDigit === Number(cpf.charAt(10));
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
  return result === Number(digits.charAt(1));
}

export async function GET(request: Request) {
  try {
    const id = getIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { error: "ID do cliente não informado" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        region: true,
        otherContacts: true,
        orders: {
          orderBy: {
            issuedAt: "desc",
          },
        },
        visits: {
          orderBy: {
            visitedAt: "desc",
          },
        },
        exhibitors: {
          orderBy: {
            installedAt: "desc",
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error("ERRO GET CLIENT BY ID:", error);

    return NextResponse.json(
      {
        error: "Erro interno ao buscar cliente",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const id = getIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { error: "ID do cliente não informado" },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findUnique({
      where: { id },
      include: {
        otherContacts: true,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const personType = body.personType === "FISICA" ? "FISICA" : "JURIDICA";

    const tradeName = normalizeText(body.tradeName);
    const legalName = normalizeText(body.legalName);

    const cpf = onlyDigits(body.cpf);
    const cnpj = onlyDigits(body.cnpj);

    const roleClient = Boolean(body.roleClient);
    const roleSupplier = Boolean(body.roleSupplier);
    const roleCarrier = Boolean(body.roleCarrier);

    const registrationCode = normalizeText(body.registrationCode);

    const billingEmail = normalizeText(body.billingEmail)?.toLowerCase() ?? null;
    const whatsapp = onlyDigits(body.whatsapp);

    const simpleTaxOption =
      typeof body.simpleTaxOption === "boolean" ? body.simpleTaxOption : null;

    const publicAgency =
      typeof body.publicAgency === "boolean" ? body.publicAgency : null;

    const stateRegistrationIndicator =
      normalizeText(body.stateRegistrationIndicator) ?? "CONTRIBUINTE";

    const stateRegistration = normalizeText(body.stateRegistration);
    const municipalRegistration = normalizeText(body.municipalRegistration);
    const suframaRegistration = normalizeText(body.suframaRegistration);

    const country = normalizeText(body.country) ?? "Brasil";
    const cep = onlyDigits(body.cep);
    const street = normalizeText(body.street);
    const number = normalizeText(body.number);
    const district = normalizeText(body.district);
    const city = normalizeText(body.city);
    const state = normalizeText(body.state)?.toUpperCase() ?? null;
    const complement = normalizeText(body.complement);

    const regionId = normalizeText(body.regionId);
    const notes = normalizeText(body.notes);
    const active =
      typeof body.active === "boolean" ? body.active : existingClient.active;

    const name =
      normalizeText(body.name) ||
      (personType === "JURIDICA"
        ? legalName || tradeName
        : tradeName || legalName);

    const otherContacts = Array.isArray(body.otherContacts)
      ? body.otherContacts
          .map((item: any) => ({
            person: normalizeText(item?.person),
            email: normalizeText(item?.email)?.toLowerCase() ?? null,
            phone: onlyDigits(item?.phone) || null,
            mobile: onlyDigits(item?.mobile) || null,
            role: normalizeText(item?.role),
          }))
          .filter(
            (item: any) =>
              item.person || item.email || item.phone || item.mobile || item.role
          )
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "O nome do cliente é obrigatório" },
        { status: 400 }
      );
    }

    if (personType === "FISICA") {
      if (!cpf) {
        return NextResponse.json(
          { error: "CPF é obrigatório para pessoa física" },
          { status: 400 }
        );
      }

      if (!isValidCPF(cpf)) {
        return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
      }
    }

    if (personType === "JURIDICA" && cnpj) {
      if (!isValidCNPJ(cnpj)) {
        return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
      }
    }

    if (!regionId) {
      return NextResponse.json(
        { error: "A região do cliente é obrigatória." },
        { status: 400 }
      );
    }

    const regionExists = await prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });

    if (!regionExists) {
      return NextResponse.json({ error: "Região inválida" }, { status: 400 });
    }

    if (cpf) {
      const existingClientByCpf = await prisma.client.findFirst({
        where: {
          cpf,
          NOT: {
            id,
          },
        },
        select: { id: true, name: true },
      });

      if (existingClientByCpf) {
        return NextResponse.json(
          { error: "Já existe um cliente cadastrado com este CPF" },
          { status: 409 }
        );
      }
    }

    if (cnpj) {
      const existingClientByCnpj = await prisma.client.findFirst({
        where: {
          cnpj,
          NOT: {
            id,
          },
        },
        select: { id: true, name: true },
      });

      if (existingClientByCnpj) {
        return NextResponse.json(
          { error: "Já existe um cliente cadastrado com este CNPJ" },
          { status: 409 }
        );
      }
    }

    const finalCode = existingClient.code || "0001";
    const portalPasswordHash = await bcrypt.hash(finalCode, 10);

    const fullAddress = buildAddress([
      street,
      number,
      district,
      city,
      state,
      cep,
      country,
    ]);

    let geocoded: { latitude?: number | null; longitude?: number | null } | null =
      null;

    try {
      geocoded = await geocodeAddress(fullAddress);
    } catch (error) {
      console.error("Geocoding error on client update:", error);
      geocoded = null;
    }

    await prisma.clientOtherContact.deleteMany({
      where: {
        clientId: id,
      },
    });

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name,
        tradeName,
        legalName,

        personType,
        cpf: personType === "FISICA" ? cpf || null : null,
        cnpj: personType === "JURIDICA" ? cnpj || null : null,

        roleClient,
        roleSupplier,
        roleCarrier,

        registrationCode,

        billingEmail,
        whatsapp: whatsapp || null,

        simpleTaxOption,
        publicAgency,

        stateRegistrationIndicator,
        stateRegistration:
          stateRegistrationIndicator === "ISENTO" ? null : stateRegistration,
        municipalRegistration,
        suframaRegistration,

        country,
        cep: cep || null,
        street,
        number,
        district,
        city,
        state,
        complement,

        latitude:
          typeof geocoded?.latitude === "number" ? geocoded.latitude : null,
        longitude:
          typeof geocoded?.longitude === "number" ? geocoded.longitude : null,

        regionId,
        notes,
        active,

        portalEnabled: true,
        portalPasswordHash,

        otherContacts: otherContacts.length
          ? {
              create: otherContacts,
            }
          : undefined,
      },
      include: {
        region: true,
        otherContacts: true,
      },
    });

    return NextResponse.json({
      ...updatedClient,
      portalUsername: tradeName || name,
      portalInitialPassword: finalCode,
    });
  } catch (error: any) {
    console.error("ERRO PUT CLIENT:", error);

    return NextResponse.json(
      {
        error: "Não foi possível salvar o cliente",
        details: error?.message || String(error),
        code: error?.code || null,
        meta: error?.meta || null,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = getIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { error: "ID do cliente não informado" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        orders: true,
        visits: true,
        exhibitors: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const hasHistory =
      client.orders.length > 0 ||
      client.visits.length > 0 ||
      client.exhibitors.length > 0;

    if (hasHistory) {
      const updated = await prisma.client.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        message: "Cliente inativado, pois possui histórico.",
        client: updated,
        action: "inactivated",
      });
    }

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Cliente excluído com sucesso.",
      action: "deleted",
    });
  } catch (error: any) {
    console.error("ERRO DELETE CLIENT:", error);

    return NextResponse.json(
      {
        error: "Erro interno ao excluir cliente",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
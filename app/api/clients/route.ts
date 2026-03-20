import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { buildAddress, geocodeAddress } from "@/lib/geocoding";
import { cookies } from "next/headers";

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

async function generateNextClientCode() {
  const clientsWithCode = await prisma.client.findMany({
    where: {
      code: {
        not: null,
      },
    },
    select: {
      code: true,
    },
  });

  const numericCodes = clientsWithCode
    .map((client) => Number(String(client.code ?? "").replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  const nextNumber =
    numericCodes.length > 0 ? Math.max(...numericCodes) + 1 : 1;

  return String(nextNumber).padStart(4, "0");
}

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: {
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        region: true,
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("crm_session")?.value?.trim();

    if (!session) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const loggedUser = await prisma.user.findUnique({
      where: { id: session },
      select: {
        id: true,
        role: true,
        active: true,
        regionId: true,
      },
    });

    if (!loggedUser || !loggedUser.active) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (loggedUser.role !== "ADMIN" && loggedUser.role !== "REPRESENTATIVE") {
      return NextResponse.json(
        { error: "Usuário sem permissão para cadastrar clientes." },
        { status: 403 }
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

    const requestedRegionId = normalizeText(body.regionId);
    const notes = normalizeText(body.notes);

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

    let regionId: string | null = requestedRegionId;

    if (loggedUser.role === "REPRESENTATIVE") {
      if (!loggedUser.regionId) {
        return NextResponse.json(
          { error: "O representante logado não possui região vinculada." },
          { status: 400 }
        );
      }

      regionId = loggedUser.regionId;
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
      return NextResponse.json(
        { error: "Região inválida." },
        { status: 400 }
      );
    }

    if (cpf) {
      const existingClientByCpf = await prisma.client.findFirst({
        where: { cpf },
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
        where: { cnpj },
        select: { id: true, name: true },
      });

      if (existingClientByCnpj) {
        return NextResponse.json(
          { error: "Já existe um cliente cadastrado com este CNPJ" },
          { status: 409 }
        );
      }
    }

    const hasEnoughAddressForGeocoding =
      Boolean(street) &&
      Boolean(number) &&
      Boolean(district) &&
      Boolean(city) &&
      Boolean(state) &&
      Boolean(cep);

    let geocoded: { latitude?: number | null; longitude?: number | null } | null =
      null;

    if (hasEnoughAddressForGeocoding) {
      const fullAddress = buildAddress([
        street,
        number,
        district,
        city,
        state,
        cep,
        country,
      ]);

      try {
        geocoded = await geocodeAddress(fullAddress);
      } catch (error) {
        console.error("POST /api/clients geocoding error:", error);
        geocoded = null;
      }
    }

    const latitude =
      geocoded && typeof geocoded.latitude === "number"
        ? geocoded.latitude
        : null;

    const longitude =
      geocoded && typeof geocoded.longitude === "number"
        ? geocoded.longitude
        : null;

    let generatedCode = await generateNextClientCode();

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const portalUsername = tradeName || name;
        const portalPasswordHash = await bcrypt.hash(generatedCode, 10);

        const client = await prisma.client.create({
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
              stateRegistrationIndicator === "ISENTO"
                ? null
                : stateRegistration,
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

            regionId,
            notes,
            active: true,
            code: generatedCode,

            portalEnabled: true,
            portalPasswordHash,

            latitude,
            longitude,
            mapStatus: "CLIENT",
            needsReturn: false,

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

        return NextResponse.json(
          {
            ...client,
            portalUsername,
            portalInitialPassword: generatedCode,
          },
          { status: 201 }
        );
      } catch (error: any) {
        if (error?.code === "P2002") {
          generatedCode = String(Number(generatedCode) + 1).padStart(4, "0");
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      { error: "Não foi possível gerar um código único para o cliente" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("POST /api/clients error:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um registro com esses dados únicos" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível salvar o cliente" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAddress, geocodeAddress } from "@/lib/geocoding";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function onlyDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = normalizeText(searchParams.get("regionId"));
    const representativeId = normalizeText(searchParams.get("representativeId"));

    const prospects = await prisma.prospect.findMany({
      where: {
        ...(regionId ? { regionId } : {}),
        ...(representativeId ? { representativeId } : {}),
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        region: {
          select: {
            id: true,
            name: true,
          },
        },
        representative: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(prospects);
  } catch (error) {
    console.error("GET /api/prospects error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os prospectos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = normalizeText(body.name);
    const tradeName = normalizeText(body.tradeName);
    const cnpj = onlyDigits(body.cnpj) || null;
    const phone = onlyDigits(body.phone) || null;
    const email = normalizeText(body.email)?.toLowerCase() ?? null;
    const contactName = normalizeText(body.contactName);
    const cep = onlyDigits(body.cep) || null;
    const street = normalizeText(body.street);
    const number = normalizeText(body.number);
    const district = normalizeText(body.district);
    const city = normalizeText(body.city);
    const state = normalizeText(body.state)?.toUpperCase() ?? null;
    const notes = normalizeText(body.notes);
    const status = normalizeText(body.status) ?? "PENDING";
    const regionId = normalizeText(body.regionId);
    const representativeId = normalizeText(body.representativeId);

    if (!name) {
      return NextResponse.json(
        { error: "O nome do prospecto é obrigatório" },
        { status: 400 }
      );
    }

    if (!regionId) {
      return NextResponse.json(
        { error: "A região é obrigatória" },
        { status: 400 }
      );
    }

    const regionExists = await prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });

    if (!regionExists) {
      return NextResponse.json(
        { error: "Região inválida" },
        { status: 400 }
      );
    }

    if (representativeId) {
      const representative = await prisma.user.findUnique({
        where: { id: representativeId },
        select: {
          id: true,
          role: true,
          regionId: true,
        },
      });

      if (!representative || representative.role !== "REPRESENTATIVE") {
        return NextResponse.json(
          { error: "Representante inválido" },
          { status: 400 }
        );
      }

      if (representative.regionId && representative.regionId !== regionId) {
        return NextResponse.json(
          { error: "O representante não pertence à região selecionada" },
          { status: 400 }
        );
      }
    }

    const allowedStatuses = ["PENDING", "RETURN", "NO_RETURN", "CONVERTED"];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      );
    }

    const fullAddress = buildAddress([
      street,
      number,
      district,
      city,
      state,
      cep,
      "Brasil",
    ]);

    const geocoded = await geocodeAddress(fullAddress);

    const prospect = await prisma.prospect.create({
      data: {
        name,
        tradeName,
        cnpj,
        phone,
        email,
        contactName,
        cep,
        street,
        number,
        district,
        city,
        state,
        notes,
        status: status as any,
        regionId,
        representativeId,
        latitude: geocoded?.latitude ?? null,
        longitude: geocoded?.longitude ?? null,
      },
      include: {
        region: {
          select: {
            id: true,
            name: true,
          },
        },
        representative: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(prospect, { status: 201 });
  } catch (error) {
    console.error("POST /api/prospects error:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar o prospecto" },
      { status: 500 }
    );
  }
}
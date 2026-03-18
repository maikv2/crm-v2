import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAddress, geocodeAddress } from "@/lib/geocoding";
import { ProspectStatus } from "@prisma/client";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function onlyDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const rawName =
      body.name === undefined ? undefined : normalizeText(body.name);
    const rawTradeName =
      body.tradeName === undefined ? undefined : normalizeText(body.tradeName);
    const rawCnpj =
      body.cnpj === undefined ? undefined : onlyDigits(body.cnpj) || null;
    const rawPhone =
      body.phone === undefined ? undefined : onlyDigits(body.phone) || null;
    const rawEmail =
      body.email === undefined
        ? undefined
        : normalizeText(body.email)?.toLowerCase() ?? null;
    const rawContactName =
      body.contactName === undefined ? undefined : normalizeText(body.contactName);
    const rawCep =
      body.cep === undefined ? undefined : onlyDigits(body.cep) || null;
    const rawStreet =
      body.street === undefined ? undefined : normalizeText(body.street);
    const rawNumber =
      body.number === undefined ? undefined : normalizeText(body.number);
    const rawDistrict =
      body.district === undefined ? undefined : normalizeText(body.district);
    const rawCity =
      body.city === undefined ? undefined : normalizeText(body.city);
    const rawState =
      body.state === undefined
        ? undefined
        : normalizeText(body.state)?.toUpperCase() ?? null;
    const rawNotes =
      body.notes === undefined ? undefined : normalizeText(body.notes);
    const rawStatus =
      body.status === undefined ? undefined : normalizeText(body.status);

    if (rawName === null) {
      return NextResponse.json(
        { error: "O nome do prospecto não pode ficar vazio" },
        { status: 400 }
      );
    }

    let parsedStatus: ProspectStatus | undefined = undefined;

    if (rawStatus !== undefined) {
      const allowedStatuses: ProspectStatus[] = [
        "PENDING",
        "RETURN",
        "NO_RETURN",
        "CONVERTED",
      ];

      if (!allowedStatuses.includes(rawStatus as ProspectStatus)) {
        return NextResponse.json(
          { error: "Status inválido" },
          { status: 400 }
        );
      }

      parsedStatus = rawStatus as ProspectStatus;
    }

    let geocoded:
      | {
          latitude: number;
          longitude: number;
        }
      | null
      | undefined = undefined;

    const addressTouched =
      body.street !== undefined ||
      body.number !== undefined ||
      body.district !== undefined ||
      body.city !== undefined ||
      body.state !== undefined ||
      body.cep !== undefined;

    if (addressTouched) {
      const current = await prisma.prospect.findUnique({
        where: { id },
      });

      if (!current) {
        return NextResponse.json(
          { error: "Prospecto não encontrado" },
          { status: 404 }
        );
      }

      const fullAddress = buildAddress([
        rawStreet !== undefined ? rawStreet : current.street,
        rawNumber !== undefined ? rawNumber : current.number,
        rawDistrict !== undefined ? rawDistrict : current.district,
        rawCity !== undefined ? rawCity : current.city,
        rawState !== undefined ? rawState : current.state,
        rawCep !== undefined ? rawCep : current.cep,
        "Brasil",
      ]);

      geocoded = await geocodeAddress(fullAddress);
    }

    const data: {
      name?: string;
      tradeName?: string | null;
      cnpj?: string | null;
      phone?: string | null;
      email?: string | null;
      contactName?: string | null;
      cep?: string | null;
      street?: string | null;
      number?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      notes?: string | null;
      status?: ProspectStatus;
      latitude?: number | null;
      longitude?: number | null;
    } = {};

    if (rawName !== undefined) data.name = rawName;
    if (rawTradeName !== undefined) data.tradeName = rawTradeName;
    if (rawCnpj !== undefined) data.cnpj = rawCnpj;
    if (rawPhone !== undefined) data.phone = rawPhone;
    if (rawEmail !== undefined) data.email = rawEmail;
    if (rawContactName !== undefined) data.contactName = rawContactName;
    if (rawCep !== undefined) data.cep = rawCep;
    if (rawStreet !== undefined) data.street = rawStreet;
    if (rawNumber !== undefined) data.number = rawNumber;
    if (rawDistrict !== undefined) data.district = rawDistrict;
    if (rawCity !== undefined) data.city = rawCity;
    if (rawState !== undefined) data.state = rawState;
    if (rawNotes !== undefined) data.notes = rawNotes;
    if (parsedStatus !== undefined) data.status = parsedStatus;

    if (geocoded) {
      data.latitude = geocoded.latitude;
      data.longitude = geocoded.longitude;
    }

    const updated = await prisma.prospect.update({
      where: { id },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/prospects/[id] error:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o prospecto" },
      { status: 500 }
    );
  }
}
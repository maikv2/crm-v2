import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {

  const movements = await prisma.stockMovement.findMany({
    include:{
      product:true,
      stockLocation:true
    },
    orderBy:{
      createdAt:"desc"
    },
    take:100
  });

  const data = movements.map(m => ({
    id:m.id,
    productName:m.product?.name ?? "Produto",
    locationName:m.stockLocation?.name ?? "Local",
    type:m.type,
    quantity:m.quantity,
    note:m.note,
    createdAt:m.createdAt
  }));

  return NextResponse.json(data);

}
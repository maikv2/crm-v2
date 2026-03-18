import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("crm_session")?.value;

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      regionId: true,
      stockLocationId: true,
      region: {
        select: {
          id: true,
          name: true,
          active: true,
          stockLocationId: true,
          stockLocation: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
        },
      },
      stockLocation: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
  });

  if (!user || !user.active) {
    return null;
  }

  return user;
}
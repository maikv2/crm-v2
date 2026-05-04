import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MobileFinancePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("crm_session")?.value?.trim();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session },
    select: { id: true, active: true, role: true },
  });

  if (!user || !user.active) {
    redirect("/login");
  }

  if (user.role !== "ADMINISTRATIVE" && user.role !== "ADMIN") {
    redirect("/login");
  }

  redirect("/m/admin/finance");
}

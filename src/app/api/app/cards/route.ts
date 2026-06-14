import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ok } from "@/lib/api";
import { CompanyStatus } from "@prisma/client";

export async function GET() {
  const user = await requireUser();
  const cards = await getDb().customerMembership.findMany({
    where: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } },
    include: { company: { include: { loyaltyProgram: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return ok({ cards });
}

import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ok } from "@/lib/api";
import { CompanyStatus } from "@prisma/client";

export async function GET() {
  const user = await requireUser();
  const history = await getDb().loyaltyTransaction.findMany({
    where: { membership: { userId: user.id, company: { status: { not: CompanyStatus.DELETED } } } },
    include: {
      company: true,
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({ history });
}

import { requireApiCompanyUser, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const clients = await getDb().customerMembership.findMany({
    where: { companyId: access!.companyId },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });
  return ok({ clients });
}

import { requireApiSuperadmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  const { error } = await requireApiSuperadmin();
  if (error) return error;
  const companies = await getDb().company.findMany({
    include: { memberships: true, transactions: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return ok({ companies });
}

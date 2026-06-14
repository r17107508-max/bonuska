import { requireApiSuperadmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { CompanyStatus } from "@prisma/client";

export async function GET(request: Request) {
  const { error } = await requireApiSuperadmin();
  if (error) return error;
  const status = new URL(request.url).searchParams.get("status");
  const selectedStatus = Object.values(CompanyStatus).includes(status as CompanyStatus) ? (status as CompanyStatus) : null;
  const companies = await getDb().company.findMany({
    where: selectedStatus ? { status: selectedStatus } : { status: { not: CompanyStatus.DELETED } },
    include: { memberships: true, transactions: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return ok({ companies });
}

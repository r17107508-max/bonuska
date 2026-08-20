import { getDb } from "@/lib/db";
import { apiError, ok, publicCompanySelect } from "@/lib/api";
import { CompanyStatus } from "@prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getDb().company.findUnique({
    where: { slug },
    select: { ...publicCompanySelect, isBlocked: true, loyaltyProgram: true },
  });
  if (!company || company.status === CompanyStatus.DELETED || company.isBlocked) {
    return apiError("Компания не найдена", 404);
  }
  return ok({ company });
}

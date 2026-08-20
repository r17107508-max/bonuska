import { CompanyStatus } from "@prisma/client";
import { requireApiSuperadmin, ok, safeCompanySelect } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireApiSuperadmin();
  if (error) return error;
  const { id } = await params;
  const company = await getDb().company.update({
    where: { id },
    data: { status: CompanyStatus.BLOCKED, isBlocked: true, auditLogs: { create: { actorUserId: user!.id, action: "COMPANY_BLOCKED_API", entityType: "Company", entityId: id } } },
    select: safeCompanySelect,
  });
  return ok({ company });
}

import { CompanyStatus } from "@prisma/client";
import { requireApiSuperadmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireApiSuperadmin();
  if (error) return error;
  const { id } = await params;
  const company = await getDb().company.update({
    where: { id },
    data: {
      status: CompanyStatus.PAYMENT_REQUIRED,
      isBlocked: false,
      ratingLowSince: null,
      ratingBlockedAt: null,
      auditLogs: { create: { actorUserId: user!.id, action: "COMPANY_UNBLOCKED_API", entityType: "Company", entityId: id } },
    },
  });
  return ok({ company });
}

import { CompanyStatus } from "@prisma/client";
import { requireApiSuperadmin, ok, safeCompanySelect } from "@/lib/api";
import { getDb } from "@/lib/db";
import { notifyCompanyApproved } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireApiSuperadmin();
  if (error) return error;
  const { id } = await params;
  const settings = await getSettings();
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + settings.trialDays);
  const company = await getDb().company.update({
    where: { id },
    data: {
      status: CompanyStatus.ACTIVE_TRIAL,
      trialStartedAt: now,
      trialEndsAt,
      isBlocked: false,
      auditLogs: { create: { actorUserId: user!.id, action: "COMPANY_APPROVED_API", entityType: "Company", entityId: id } },
    },
    select: safeCompanySelect,
  });
  await notifyCompanyApproved(company, new URL(request.url).origin);
  return ok({ company });
}

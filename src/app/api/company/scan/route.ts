import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { findMembershipForScan } from "@/lib/loyalty";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;
  const body = await request.json();
  const membership = await findMembershipForScan(access!.companyId, String(body.token ?? ""));
  if (!membership) return apiError("Клиент не найден в этой компании", 404);
  return ok({ membership });
}

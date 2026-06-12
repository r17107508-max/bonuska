import { requireApiCompanyUser, apiError, ok } from "@/lib/api";
import { resolveCompanyScan } from "@/lib/company-scan";

export async function POST(request: Request) {
  const { error, access } = await requireApiCompanyUser();
  if (error) return error;

  const body = await request.json();
  const result = await resolveCompanyScan(access!.companyId, String(body.token ?? ""));

  if (result.status === "not_found") {
    return apiError("Клиент не найден", 404);
  }

  return ok(result);
}

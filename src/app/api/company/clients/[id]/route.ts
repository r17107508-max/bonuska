import { requireApiCompanyAdmin, apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;
  const { id } = await params;
  const client = await getDb().customerMembership.findFirst({
    where: { id, companyId: access!.companyId },
    include: { user: true, transactions: { include: { cashier: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!client) return apiError("Клиент не найден", 404);
  return ok({ client });
}

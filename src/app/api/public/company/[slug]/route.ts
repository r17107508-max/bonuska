import { getDb } from "@/lib/db";
import { apiError, ok } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getDb().company.findUnique({
    where: { slug },
    include: { loyaltyProgram: true },
  });
  if (!company) {
    return apiError("Компания не найдена", 404);
  }
  return ok({ company });
}

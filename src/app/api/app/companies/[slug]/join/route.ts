import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, ok } from "@/lib/api";
import { ensureGlobalQrToken, joinCompanyProgram } from "@/lib/loyalty";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await requireUser();
  const { slug } = await params;
  const company = await getDb().company.findUnique({
    where: { slug },
    include: { loyaltyProgram: true },
  });

  if (!company || !company.loyaltyProgram) {
    return apiError("Компания не найдена", 404);
  }

  await ensureGlobalQrToken(user);
  const membership = await joinCompanyProgram(company.id, user.id);

  return ok({ membership });
}

import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, ok } from "@/lib/api";
import { ensureGlobalQrToken, joinCompanyProgram } from "@/lib/loyalty";
import { CompanyStatus } from "@prisma/client";

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

  if (!company || company.status === CompanyStatus.DELETED || company.isBlocked || !company.loyaltyProgram) {
    return apiError("Компания не найдена", 404);
  }

  await ensureGlobalQrToken(user);
  let membership: Awaited<ReturnType<typeof joinCompanyProgram>>;
  try {
    membership = await joinCompanyProgram(company.id, user.id);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Компания сейчас недоступна", 403);
  }

  return ok({ membership });
}

import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, ok } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const user = await requireUser();
  const { membershipId } = await params;
  const card = await getDb().customerMembership.findFirst({
    where: { id: membershipId, userId: user.id },
    include: {
      company: { include: { loyaltyProgram: true } },
      transactions: {
        include: { cashier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!card) {
    return apiError("Карта не найдена", 404);
  }

  return ok({ card });
}

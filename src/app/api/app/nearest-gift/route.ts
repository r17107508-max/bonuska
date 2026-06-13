import { requireUser } from "@/lib/auth";
import { getClientMemberships, pickNearestGift } from "@/lib/customer-app";
import { ok } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  const memberships = await getClientMemberships(user.id);
  const nearestGift = pickNearestGift(memberships);

  return ok({ nearestGift });
}

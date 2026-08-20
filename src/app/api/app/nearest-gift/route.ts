import { getClientMemberships, pickNearestGift } from "@/lib/customer-app";
import { ok, requireApiUser } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const memberships = await getClientMemberships(user!.id);
  const nearestGift = pickNearestGift(memberships);

  return ok({ nearestGift });
}

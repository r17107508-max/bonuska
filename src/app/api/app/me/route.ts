import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureGlobalQrToken } from "@/lib/loyalty";
import { ok } from "@/lib/api";

export async function GET() {
  const currentUser = await requireUser();
  const user = await getDb().user.findUniqueOrThrow({
    where: { id: currentUser.id },
    select: { id: true, name: true, phone: true, email: true, globalQrToken: true },
  });
  const globalQrToken = await ensureGlobalQrToken(user);

  return ok({ user: { ...user, globalQrToken } });
}

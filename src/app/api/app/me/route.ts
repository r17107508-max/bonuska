import { getDb } from "@/lib/db";
import { ok, requireApiUser } from "@/lib/api";

export async function GET() {
  const { error, user: currentUser } = await requireApiUser();
  if (error) return error;
  const user = await getDb().user.findUniqueOrThrow({
    where: { id: currentUser!.id },
    select: { id: true, name: true, phone: true, email: true, city: true },
  });

  return ok({ user });
}

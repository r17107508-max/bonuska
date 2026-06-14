import { getCurrentUser, getUserHomePath } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  return ok({ user, redirectTo: user ? await getUserHomePath(user) : null });
}

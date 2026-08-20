import { ok, requireApiUser } from "@/lib/api";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";

export async function GET() {
  const { error, user } = await requireApiUser();
  if (error) return error;
  const qr = await createDynamicCustomerQr(user!.id);

  return ok(qr);
}

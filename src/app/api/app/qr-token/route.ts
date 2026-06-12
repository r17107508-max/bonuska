import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/api";
import { createDynamicCustomerQr } from "@/lib/dynamic-qr";

export async function GET() {
  const user = await requireUser();
  const qr = await createDynamicCustomerQr(user.id);

  return ok(qr);
}

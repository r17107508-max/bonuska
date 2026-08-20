import { requireUser } from "@/lib/auth";
import { ok } from "@/lib/api";
import { getAppleWalletStatus } from "@/lib/apple-wallet";

export async function GET() {
  await requireUser("/company/login");
  const status = getAppleWalletStatus();

  return ok({
    enabled: status.enabled,
    missing: status.missing,
  });
}

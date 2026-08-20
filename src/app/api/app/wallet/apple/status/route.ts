import { ok, requireApiUser } from "@/lib/api";
import { getAppleWalletStatus } from "@/lib/apple-wallet";

export async function GET() {
  const { error } = await requireApiUser();
  if (error) return error;
  const status = getAppleWalletStatus();

  return ok({
    enabled: status.enabled,
    missing: status.missing,
  });
}

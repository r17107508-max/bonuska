import { requireApiSuperadmin, ok } from "@/lib/api";
import { getWebPushConfigStatus } from "@/lib/web-push";

export async function GET() {
  const { error } = await requireApiSuperadmin();
  if (error) return error;

  const status = getWebPushConfigStatus();
  return ok({
    enabled: status.ready,
    publicKey: status.publicKey,
    missing: status.missing,
  });
}

import { requireApiCompanyAdmin, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { createPosApiKey, hashPosApiKey, posApiKeyPrefix } from "@/lib/pos";

export async function POST() {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;

  const apiKey = createPosApiKey();
  const now = new Date();

  await getDb().company.update({
    where: { id: access!.companyId },
    data: {
      posApiKeyHash: hashPosApiKey(apiKey),
      posApiKeyPrefix: posApiKeyPrefix(apiKey),
      posApiKeyCreatedAt: now,
      posApiKeyLastUsedAt: null,
      auditLogs: {
        create: {
          actorUserId: access!.userId,
          action: "POS_API_KEY_ROTATED",
          entityType: "Company",
          entityId: access!.companyId,
        },
      },
    },
  });

  return ok({ apiKey, prefix: posApiKeyPrefix(apiKey), createdAt: now.toISOString() });
}

export async function DELETE() {
  const { error, access } = await requireApiCompanyAdmin();
  if (error) return error;

  await getDb().company.update({
    where: { id: access!.companyId },
    data: {
      posApiKeyHash: null,
      posApiKeyPrefix: null,
      posApiKeyCreatedAt: null,
      posApiKeyLastUsedAt: null,
      auditLogs: {
        create: {
          actorUserId: access!.userId,
          action: "POS_API_KEY_DISABLED",
          entityType: "Company",
          entityId: access!.companyId,
        },
      },
    },
  });

  return ok({ ok: true });
}

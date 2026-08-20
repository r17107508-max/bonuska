import { requireApiSuperadmin, apiError, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

type PushBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const { error, user } = await requireApiSuperadmin();
  if (error) return error;

  const body = (await request.json()) as PushBody;
  const endpoint = String(body.endpoint ?? "");
  const p256dh = String(body.keys?.p256dh ?? "");
  const auth = String(body.keys?.auth ?? "");

  if (!endpoint || !p256dh || !auth) {
    return apiError("Некорректная push-подписка");
  }

  await getDb().webPushSubscription.upsert({
    where: { endpoint },
    update: {
      userId: user!.id,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent"),
      failedAt: null,
    },
    create: {
      userId: user!.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent"),
    },
  });

  return ok({ ok: true });
}

export async function DELETE(request: Request) {
  const { error, user } = await requireApiSuperadmin();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = String(body.endpoint ?? "");

  if (endpoint) {
    await getDb().webPushSubscription.deleteMany({
      where: { endpoint, userId: user!.id },
    });
  }

  return ok({ ok: true });
}

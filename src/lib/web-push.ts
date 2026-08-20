import webpush, { type PushSubscription } from "web-push";
import { GlobalRole, type Company } from "@prisma/client";
import { getDb } from "@/lib/db";

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export function getWebPushConfigStatus() {
  const missing = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"].filter((key) => !process.env[key]);
  return {
    ready: missing.length === 0,
    missing,
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  };
}

function configureWebPush() {
  const status = getWebPushConfigStatus();
  if (!status.ready || !status.publicKey || !process.env.VAPID_PRIVATE_KEY) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:rf173@bk.ru",
    status.publicKey,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
}

export async function sendPushToSuperadmins(payload: PushPayload) {
  if (!configureWebPush()) {
    await getDb().auditLog.create({
      data: {
        action: "WEB_PUSH_SKIPPED",
        entityType: "WebPushNotification",
        metadataJson: JSON.stringify({
          reason: "VAPID не настроен",
          missing: getWebPushConfigStatus().missing,
          payload,
        }),
      },
    });
    return;
  }

  const subscriptions = await getDb().webPushSubscription.findMany({
    where: { failedAt: null, user: { globalRole: GlobalRole.SUPERADMIN } },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            ...payload,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
          }),
        );
        await getDb().webPushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await getDb().webPushSubscription.update({
            where: { id: subscription.id },
            data: { failedAt: new Date() },
          });
          return;
        }

        await getDb().auditLog.create({
          data: {
            action: "WEB_PUSH_FAILED",
            entityType: "WebPushNotification",
            entityId: subscription.id,
            metadataJson: JSON.stringify({
              statusCode,
              reason: error instanceof Error ? error.message : "Неизвестная ошибка Web Push",
              payload,
            }),
          },
        });
      }
    }),
  );
}

export async function notifySuperadminsAboutCompanyPush(
  company: Pick<Company, "id" | "name" | "city">,
) {
  await sendPushToSuperadmins({
    title: "Новая заявка компании",
    body: `${company.name}${company.city ? `, ${company.city}` : ""}`,
    url: `/superadmin/companies/${company.id}`,
    tag: `company-application-${company.id}`,
  });
}

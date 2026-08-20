import { requireApiSuperadmin, ok } from "@/lib/api";
import { sendPushToSuperadmins } from "@/lib/web-push";

export async function POST() {
  const { error } = await requireApiSuperadmin();
  if (error) return error;

  await sendPushToSuperadmins({
    title: "ПроПлюшка",
    body: "Тестовое push-уведомление суперадмина работает",
    url: "/superadmin",
    tag: "superadmin-push-test",
  });

  return ok({ ok: true });
}

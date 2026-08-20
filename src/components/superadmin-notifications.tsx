"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";

type PushStatus = {
  enabled: boolean;
  publicKey: string | null;
  missing: string[];
};

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function getExistingSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function SuperadminNotifications({ pendingCount }: { pendingCount: number }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    canUseNotifications() ? Notification.permission : "unsupported",
  );
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!canUseNotifications()) {
      return;
    }

    fetch("/api/superadmin/push/public-key", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PushStatus | null) => setPushStatus(data))
      .catch(() => setPushStatus(null));

    getExistingSubscription()
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => setSubscribed(false));
  }, []);

  const statusText = useMemo(() => {
    if (permission === "unsupported") return "Этот браузер не поддерживает push-уведомления PWA";
    if (pushStatus && !pushStatus.enabled) return `Web Push не настроен на сервере: ${pushStatus.missing.join(", ")}`;
    if (permission === "denied") return "Уведомления запрещены в настройках устройства";
    if (subscribed) return "Push-уведомления включены для этого устройства";
    if (permission === "granted") return "Разрешение есть, осталось подписать это устройство";
    return "Включите уведомления, чтобы получать новые заявки при закрытом приложении";
  }, [permission, pushStatus, subscribed]);

  async function enableNotifications() {
    setMessage("");
    if (!canUseNotifications()) {
      setPermission("unsupported");
      return;
    }

    const statusResponse = await fetch("/api/superadmin/push/public-key", { cache: "no-store" });
    const status = (await statusResponse.json()) as PushStatus;
    setPushStatus(status);

    if (!status.enabled || !status.publicKey) {
      setMessage(`На сервере не хватает переменных: ${status.missing.join(", ")}`);
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") {
      setMessage("Разрешение не выдано. Проверьте настройки браузера или iPhone.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(status.publicKey),
      }));

    const response = await fetch("/api/superadmin/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      setMessage("Не удалось сохранить подписку устройства.");
      return;
    }

    setSubscribed(true);
    setMessage("Готово. Теперь новые заявки будут приходить push-уведомлением на это устройство.");
  }

  async function disableNotifications() {
    const subscription = await getExistingSubscription().catch(() => null);
    if (subscription) {
      await fetch("/api/superadmin/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined);
      await subscription.unsubscribe().catch(() => undefined);
    }

    setSubscribed(false);
    setMessage("Push-уведомления отключены для этого устройства.");
  }

  async function sendTestNotification() {
    setMessage("");
    const response = await fetch("/api/superadmin/push/test", { method: "POST" });
    if (!response.ok) {
      setMessage("Не удалось отправить тестовое уведомление.");
      return;
    }

    setMessage("Тестовое уведомление отправлено на подключенные устройства суперадминов.");
  }

  const canEnable = permission !== "unsupported" && permission !== "denied" && Boolean(pushStatus?.enabled);

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            {subscribed ? <BellRing aria-hidden className="size-5" /> : <Bell aria-hidden className="size-5" />}
          </div>
          <div>
            <p className="font-semibold text-slate-950">Push-уведомления супер-админа</p>
            <p className="mt-1 text-sm text-slate-600">{statusText}</p>
            <p className="mt-1 text-sm text-slate-600">Заявок на проверку сейчас: {pendingCount}</p>
            {message && <p className="mt-2 text-sm font-semibold text-[var(--brand-ink)]">{message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {subscribed ? (
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={sendTestNotification}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white"
              >
                Отправить тест
              </button>
              <button
                type="button"
                onClick={disableNotifications}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Отключить
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={!canEnable}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Включить push
            </button>
          )}
          <Link href="/superadmin/companies?status=PENDING" className="text-sm font-semibold text-[var(--brand)]">
            Открыть заявки
          </Link>
        </div>
      </div>
    </section>
  );
}

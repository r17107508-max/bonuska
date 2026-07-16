"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";

type PendingCompany = {
  id: string;
  name: string;
  city: string;
  status: string;
  createdAt: string;
};

const STORAGE_KEY = "proplushki_seen_pending_companies";

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function saveSeenIds(ids: Iterable<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids).slice(0, 200)));
}

async function showNotification(title: string, options: NotificationOptions) {
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return;
  }

  new Notification(title, options);
}

export function SuperadminNotifications({ pendingCount }: { pendingCount: number }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    canUseNotifications() ? Notification.permission : "unsupported",
  );
  const [message, setMessage] = useState("");

  const statusText = useMemo(() => {
    if (permission === "unsupported") return "Уведомления не поддерживаются этим браузером";
    if (permission === "granted") return "Уведомления включены";
    if (permission === "denied") return "Уведомления запрещены в настройках устройства";
    return "Включите уведомления, чтобы видеть новые заявки";
  }, [permission]);

  useEffect(() => {
    if (permission !== "granted") return;

    let stopped = false;
    const seen = readSeenIds();

    async function poll() {
      try {
        const response = await fetch("/api/superadmin/companies", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { companies?: PendingCompany[] };
        const pending = (data.companies ?? []).filter((company) => company.status === "PENDING");
        const nextSeen = new Set(seen);

        for (const company of pending) {
          if (!seen.has(company.id)) {
            await showNotification("Новая заявка компании", {
              body: `${company.name}${company.city ? `, ${company.city}` : ""}`,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: `company-application-${company.id}`,
              data: { url: `/superadmin/companies/${company.id}` },
            });
          }
          nextSeen.add(company.id);
        }

        seen.clear();
        nextSeen.forEach((id) => seen.add(id));
        saveSeenIds(seen);
      } catch {
        // Notification polling should never interrupt the admin dashboard.
      }
    }

    poll();
    const timer = window.setInterval(() => {
      if (!stopped) poll();
    }, 45_000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [permission]);

  async function enableNotifications() {
    if (!canUseNotifications()) {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      setMessage("Готово. Если приложение установлено на iPhone, оно появится в настройках уведомлений.");
    } else if (result === "denied") {
      setMessage("Разрешение отклонено. Включите уведомления в настройках браузера или iPhone.");
    }
  }

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            {permission === "granted" ? <BellRing aria-hidden className="size-5" /> : <Bell aria-hidden className="size-5" />}
          </div>
          <div>
            <p className="font-semibold text-slate-950">Уведомления супер-админа</p>
            <p className="mt-1 text-sm text-slate-600">{statusText}</p>
            <p className="mt-1 text-sm text-slate-600">Заявок на проверку сейчас: {pendingCount}</p>
            {message && <p className="mt-2 text-sm font-semibold text-[var(--brand-ink)]">{message}</p>}
          </div>
        </div>
        {permission === "default" ? (
          <button
            type="button"
            onClick={enableNotifications}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white"
          >
            Включить уведомления
          </button>
        ) : (
          <Link href="/superadmin/companies?status=PENDING" className="text-sm font-semibold text-[var(--brand)]">
            Открыть заявки
          </Link>
        )}
      </div>
    </section>
  );
}

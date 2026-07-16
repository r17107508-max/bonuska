import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { SupportShareButton } from "@/components/support-share-button";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

const supportPhone = "+79278370717";
const supportPhoneLabel = "8 927 837-07-17";

export default async function SupportPage() {
  await requireUser("/client/login");
  const settings = await getSettings();
  const subject = encodeURIComponent("Поддержка ПроПлюшка");
  const body = encodeURIComponent("Здравствуйте. Нужна помощь с приложением ПроПлюшка.");

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <Link href="/app/account" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
          <ArrowLeft aria-hidden className="size-4" />
          Назад
        </Link>

        <section className="warm-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
              <MessageCircle aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text)]">Поддержка</h1>
              <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">Выберите удобный способ связи.</p>
            </div>
          </div>
        </section>

        <section className="panel p-4">
          <div className="space-y-3">
            <a
              href={`mailto:${settings.supportEmail}?subject=${subject}&body=${body}`}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
            >
              <Mail aria-hidden className="size-5 text-[var(--brand)]" />
              <span className="min-w-0">
                <span className="block">Написать на почту</span>
                <span className="block truncate text-xs font-medium text-slate-500">{settings.supportEmail}</span>
              </span>
            </a>

            <SupportShareButton />

            <a
              href={`sms:${supportPhone}?body=${body}`}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
            >
              <MessageCircle aria-hidden className="size-5 text-[var(--brand)]" />
              <span className="min-w-0">
                <span className="block">SMS на номер поддержки</span>
                <span className="block truncate text-xs font-medium text-slate-500">{supportPhoneLabel}</span>
              </span>
            </a>

            <a
              href={`tel:${supportPhone}`}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
            >
              <Phone aria-hidden className="size-5 text-[var(--brand)]" />
              Позвонить: {supportPhoneLabel}
            </a>
          </div>
        </section>

        <section className="warm-card p-4 text-sm leading-5 text-[var(--text-muted)]">
          В MAX откройте поиск контакта по номеру {supportPhoneLabel}. Кнопка «Написать в MAX» откроет меню телефона, где можно выбрать MAX, если он установлен.
        </section>
      </section>
    </main>
  );
}

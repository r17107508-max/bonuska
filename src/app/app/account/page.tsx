import Link from "next/link";
import { HelpCircle, LogOut, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { deleteCustomerAccount, logout } from "@/app/actions";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [currentUser, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const [user, settings] = await Promise.all([
    getDb().user.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: { name: true, phone: true, email: true },
    }),
    getSettings(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-4">
      <section className="mx-auto max-w-md space-y-4">
        <ClientBrandHeader />

        <section className="panel p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <UserRound aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Аккаунт</h1>
              <p className="mt-1 text-sm leading-5 text-slate-600">Настройки клиентского профиля.</p>
            </div>
          </div>
        </section>

        {params.error && <p className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">{params.error}</p>}

        <section className="panel divide-y divide-slate-100">
          <AccountRow label="Имя" value={user.name} />
          <AccountRow label="Телефон" value={formatPhone(user.phone)} />
          <AccountRow label="Email" value={user.email || "Не указан"} />
        </section>

        <section className="panel p-4">
          <div className="space-y-3">
            <Link href="/privacy" className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700">
              <ShieldCheck aria-hidden className="size-5 text-teal-700" />
              Политика персональных данных
            </Link>
            <a
              href={`mailto:${settings.supportEmail}`}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700"
            >
              <HelpCircle aria-hidden className="size-5 text-teal-700" />
              Поддержка
            </a>
          </div>
        </section>

        <section className="panel p-4">
          <form action={logout}>
            <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700">
              <LogOut aria-hidden className="size-5" />
              Выйти из аккаунта
            </button>
          </form>
        </section>

        <section className="panel border-red-200 p-4">
          <div className="mb-3 flex items-start gap-3">
            <Trash2 aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-slate-600">
              Удаление уберёт клиентский аккаунт, карты и историю участия. Действие нельзя отменить.
            </p>
          </div>
          <form action={deleteCustomerAccount}>
            <ConfirmSubmit
              danger
              title="Удалить аккаунт?"
              confirmText="Будут удалены клиентский аккаунт, бонусные карты и история участия. Если аккаунт связан с компанией, удаление будет остановлено."
              buttonText="Удалить аккаунт"
            />
          </form>
        </section>
      </section>
    </main>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function formatPhone(phone: string) {
  if (phone.length === 11 && phone.startsWith("7")) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
  }

  return phone;
}

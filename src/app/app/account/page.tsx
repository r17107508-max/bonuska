import Link from "next/link";
import { HelpCircle, LogOut, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { changeCustomerPassword, deleteCustomerAccount, logout, updateCustomerProfile } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { requireUser } from "@/lib/auth";
import { getPartnerCities } from "@/lib/customer-app";
import { getDb } from "@/lib/db";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [currentUser, params] = await Promise.all([requireUser("/company/login"), searchParams]);
  const [user, cities] = await Promise.all([
    getDb().user.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: { name: true, phone: true, email: true, city: true },
    }),
    getPartnerCities(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-28 pt-3">
      <section className="mx-auto max-w-md space-y-3">
        <ClientBrandHeader />

        <section className="panel p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
              <UserRound aria-hidden className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">Аккаунт</h1>
              <p className="mt-0.5 text-sm leading-5 text-slate-600">Профиль клиента.</p>
            </div>
          </div>
        </section>

        {params.error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{params.error}</p>}
        {params.success === "profile" && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Данные сохранены.</p>}
        {params.success === "password" && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Пароль изменён.</p>}

        <section className="panel p-4">
          <form action={updateCustomerProfile} className="space-y-3.5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Имя</span>
              <input
                name="name"
                defaultValue={user.name}
                required
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
            </label>
            <ReadonlyField label="Телефон" value={formatPhone(user.phone)} />
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={user.email ?? ""}
                placeholder="email@example.ru"
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Город</span>
              <input
                name="city"
                list="account-city-options"
                defaultValue={user.city ?? ""}
                required
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
              <datalist id="account-city-options">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </label>
            <SubmitButton>Сохранить</SubmitButton>
          </form>
        </section>

        <section className="panel p-4">
          <form action={changeCustomerPassword} className="space-y-3.5">
            <h2 className="text-lg font-semibold text-slate-950">Сменить пароль</h2>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Текущий пароль</span>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">Новый пароль</span>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(255,106,61,0.15)]"
              />
            </label>
            <SubmitButton variant="secondary">Сменить пароль</SubmitButton>
          </form>
        </section>

        <section className="panel p-4">
          <div className="space-y-3">
            <Link href="/privacy" className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <ShieldCheck aria-hidden className="size-5 text-[var(--brand)]" />
              Политика персональных данных
            </Link>
            <Link
              href="/app/support"
              className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <HelpCircle aria-hidden className="size-5 text-[var(--brand)]" />
              Поддержка
            </Link>
          </div>
        </section>

        <section className="panel p-4">
          <form action={logout}>
            <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
              <LogOut aria-hidden className="size-5" />
              Выйти из аккаунта
            </button>
          </form>
        </section>

        <section className="panel border-red-200 p-4">
          <div className="mb-3 flex items-start gap-3">
            <Trash2 aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" />
            <p className="text-sm leading-5 text-slate-600">
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-normal text-slate-600">{label}</span>
      <div className="mt-1.5 flex min-h-10 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function formatPhone(phone: string) {
  if (phone.length === 11 && phone.startsWith("7")) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
  }

  return phone;
}

import Link from "next/link";
import { Bell, HelpCircle, History, KeyRound, LogOut, ShieldCheck, Smartphone, Trash2, UserRound, WalletCards } from "lucide-react";
import { changeCustomerPassword, deleteCustomerAccount, logout, updateCustomerProfile } from "@/app/actions";
import { SubmitButton } from "@/components/buttons";
import { ClientBrandHeader } from "@/components/client-brand-header";
import { ClientCard, ClientShell } from "@/components/client-ui";
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
    <ClientShell>
      <ClientBrandHeader greeting="Профиль" />

      <section>
        <h1 className="text-3xl font-extrabold leading-tight text-[var(--text)]">Профиль</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Личные данные, безопасность и быстрые ссылки.</p>
      </section>

      {params.error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{params.error}</p>}
      {params.success === "profile" && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-[var(--success)]">Данные сохранены.</p>}
      {params.success === "password" && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-[var(--success)]">Пароль изменён.</p>}

      <ClientCard>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
            <UserRound aria-hidden className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold text-[var(--text)]">{user.name}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{formatPhone(user.phone)}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <ReadonlyField label="Email" value={user.email || "Не указан"} />
          <ReadonlyField label="Город" value={user.city || "Не указан"} />
        </dl>

        <details className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-3">
          <summary className="cursor-pointer text-sm font-extrabold text-[var(--brand-strong)]">Изменить личные данные</summary>
          <form action={updateCustomerProfile} className="mt-4 space-y-3.5">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Имя</span>
              <input
                name="name"
                defaultValue={user.name}
                required
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
              />
            </label>
            <ReadonlyField label="Телефон" value={formatPhone(user.phone)} />
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={user.email ?? ""}
                placeholder="email@example.ru"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Город</span>
              <input
                name="city"
                list="account-city-options"
                defaultValue={user.city ?? ""}
                required
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
              />
              <datalist id="account-city-options">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </label>
            <SubmitButton>Сохранить</SubmitButton>
          </form>
        </details>
      </ClientCard>

      <ClientCard>
        <nav className="space-y-2" aria-label="Разделы профиля">
          <ProfileLink href="/app/cards" icon={WalletCards} label="Мои карты" />
          <ProfileLink href="/app/history" icon={History} label="История" />
          <ProfileStatic icon={Bell} label="Уведомления" note="Появятся после подключения backend уведомлений" />
          <ProfileStatic icon={Smartphone} label="Установить приложение" note="Предложение установки показывается только в поддерживаемом браузере" />
          <ProfileLink href="/app/support" icon={HelpCircle} label="Помощь" />
          <ProfileLink href="/privacy" icon={ShieldCheck} label="Политика персональных данных" />
        </nav>
      </ClientCard>

      <ClientCard>
        <details className="rounded-2xl border border-[var(--border)] bg-white p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-[var(--text)]">
            <KeyRound aria-hidden className="size-4" />
            Безопасность
          </summary>
          <form action={changeCustomerPassword} className="mt-4 space-y-3.5">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Текущий пароль</span>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Новый пароль</span>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.16)]"
              />
            </label>
            <SubmitButton variant="secondary">Сменить пароль</SubmitButton>
          </form>
        </details>
      </ClientCard>

      <ClientCard>
        <form action={logout}>
          <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 text-sm font-extrabold text-[var(--text)]">
            <LogOut aria-hidden className="size-5" />
            Выйти
          </button>
        </form>
      </ClientCard>

      <ClientCard className="border-red-200">
        <div className="mb-3 flex items-start gap-3">
          <Trash2 aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" />
          <div>
            <h2 className="font-extrabold text-[var(--text)]">Опасная зона</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              Удаление уберёт клиентский аккаунт, карты и историю участия. Действие нельзя отменить.
            </p>
          </div>
        </div>
        <form action={deleteCustomerAccount}>
          <ConfirmSubmit
            danger
            title="Удалить аккаунт?"
            confirmText="Будут удалены клиентский аккаунт, бонусные карты и история участия. Если аккаунт связан с компанией, удаление будет остановлено."
            buttonText="Удалить аккаунт"
          />
        </form>
      </ClientCard>
    </ClientShell>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1.5 flex min-h-11 w-full items-center rounded-2xl border border-[var(--border)] bg-[var(--inactive)] px-3 text-sm font-bold text-[var(--text)]">
        {value}
      </dd>
    </div>
  );
}

function ProfileLink({ href, icon: Icon, label }: { href: string; icon: typeof UserRound; label: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)]">
      <Icon aria-hidden className="size-5 text-[var(--brand-strong)]" />
      {label}
    </Link>
  );
}

function ProfileStatic({ icon: Icon, label, note }: { icon: typeof UserRound; label: string; note: string }) {
  return (
    <div className="flex min-h-12 items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--inactive)] px-3 py-3 text-sm text-[var(--text-muted)]">
      <Icon aria-hidden className="size-5 shrink-0 text-[var(--brand-strong)]" />
      <span>
        <span className="block font-bold text-[var(--text)]">{label}</span>
        <span className="mt-0.5 block text-xs leading-5">{note}</span>
      </span>
    </div>
  );
}

function formatPhone(phone: string) {
  if (phone.length === 11 && phone.startsWith("7")) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
  }

  return phone;
}

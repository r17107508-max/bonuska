import Link from "next/link";
import { Check } from "lucide-react";
import { registerCompany } from "@/app/actions";
import { BrandMark } from "@/components/brand";
import { SubmitButton } from "@/components/buttons";
import { FormField, SelectField } from "@/components/form-field";

const businessTypes = ["☕ Кофейня", "🌯 Шаурмичная", "🥐 Пекарня", "🧋 Напитки", "🍔 Фастфуд", "🍕 Пиццерия", "🍩 Кондитерская", "💈 Барбершоп", "🎁 Другое"];

export default async function CompanyRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-100 py-8">
      <div className="page-shell max-w-5xl">
        <Link href="/" className="inline-block">
          <BrandMark />
        </Link>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="panel p-6">
            {params.success ? (
              <div className="mx-auto max-w-xl py-8 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-semibold text-emerald-700">
                  ✓
                </div>
                <p className="mt-6 text-sm font-semibold uppercase text-emerald-700">Заявка отправлена</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950">Спасибо за регистрацию</h1>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  После подтверждения вам придёт уведомление на email, и вы сможете воспользоваться сервисом.
                </p>
                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">Что дальше</p>
                  <p className="mt-2">Суперадмин проверит заявку. После одобрения откроется кабинет, 14 дней trial и QR-плакат для регистрации клиентов.</p>
                </div>
                <Link href="/company/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 font-semibold text-white">
                  Перейти ко входу
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase text-teal-700">14 дней бесплатно</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950">Создайте заявку компании</h1>
                <p className="mt-2 text-slate-600">Заполните короткую форму. После подтверждения сможете настроить акцию, распечатать QR и добавить кассиров.</p>
                {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}

                <form action={registerCompany} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Название компании" name="name" />
                  <SelectField label="Тип бизнеса" name="businessType" options={businessTypes.map((item) => ({ value: item.replace(/^.\s/, ""), label: item }))} />
                  <FormField label="Город" name="city" autoComplete="address-level2" />
                  <FormField label="Адрес" name="address" required={false} autoComplete="street-address" />
                  <FormField label="ФИО владельца/управляющего" name="ownerName" />
                  <FormField label="Телефон" name="phone" autoComplete="tel" />
                  <FormField label="Email для уведомлений" name="email" type="email" autoComplete="email" />
                  <div className="sm:col-span-2">
                    <FormField label="Пароль для кабинета" name="password" type="password" autoComplete="new-password" />
                  </div>

                  <input type="hidden" name="inn" value="" />
                  <input type="hidden" name="slug" value="" />
                  <input type="hidden" name="comment" value="" />

                  <div className="space-y-3 rounded-lg bg-slate-50 p-4 sm:col-span-2">
                    <label className="flex gap-3 text-sm font-medium text-slate-700">
                      <input name="offerAccepted" type="checkbox" className="mt-1 size-4" required />
                      <span>Я принимаю условия договора-оферты. <Link className="font-semibold text-teal-700" href="/offer" target="_blank">Открыть оферту</Link></span>
                    </label>
                    <label className="flex gap-3 text-sm font-medium text-slate-700">
                      <input name="privacyAccepted" type="checkbox" className="mt-1 size-4" required />
                      <span>Я согласен на обработку персональных данных. <Link className="font-semibold text-teal-700" href="/privacy" target="_blank">Политика</Link></span>
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <SubmitButton pendingText="Отправляем заявку...">Отправить заявку</SubmitButton>
                  </div>
                </form>
              </>
            )}
          </div>

          {!params.success && (
            <aside className="space-y-4">
              <div className="panel p-5">
                <h2 className="text-xl font-semibold text-slate-950">Что входит</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {["14 дней бесплатно после одобрения", "499 ₽/мес после trial", "QR-плакат для стойки", "Сканер для кассира", "Личные QR-карты клиентов"].map((item) => (
                    <p key={item} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="panel p-5">
                <h2 className="text-xl font-semibold text-slate-950">Почему форма короткая</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Адрес, ИНН, slug и детали акции можно заполнить после подтверждения. Сейчас нужна только заявка, чтобы открыть пробный период.
                </p>
              </div>
            </aside>
          )}
        </section>
      </div>
    </main>
  );
}

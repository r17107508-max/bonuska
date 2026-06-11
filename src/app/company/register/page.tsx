import Link from "next/link";
import { registerCompany } from "@/app/actions";
import { BrandMark } from "@/components/brand";
import { SubmitButton } from "@/components/buttons";
import { FormField, SelectField, TextAreaField } from "@/components/form-field";

const businessTypes = ["☕ Кофейня", "🌯 Шаурмичная", "🥐 Пекарня", "🧋 Напитки", "🍔 Фастфуд", "🍕 Пиццерия", "🍩 Кондитерская", "💈 Барбершоп", "🎁 Другое"];

export default async function CompanyRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-100 py-8">
      <div className="page-shell max-w-3xl">
        <Link href="/" className="inline-block">
          <BrandMark />
        </Link>

        <section className="panel mt-8 p-6">
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
                <p className="mt-2">
                  Суперадмин проверит заявку компании. После одобрения откроется кабинет, пробный период и QR для регистрации клиентов.
                </p>
              </div>
              <Link href="/company/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 font-semibold text-white">
                Перейти ко входу
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-slate-950">Регистрация компании</h1>
              <p className="mt-2 text-slate-600">Заявка попадёт в кабинет глобального админа. После подтверждения начнётся trial на 14 дней.</p>
              {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p>}

              <form action={registerCompany} className="mt-6 grid gap-4 sm:grid-cols-2">
                <FormField label="Название компании" name="name" />
                <SelectField label="Тип бизнеса" name="businessType" options={businessTypes.map((item) => ({ value: item.replace(/^.\s/, ""), label: item }))} />
                <FormField label="Город" name="city" />
                <FormField label="Адрес точки" name="address" />
                <FormField label="ФИО владельца/управляющего" name="ownerName" />
                <FormField label="Телефон" name="phone" autoComplete="tel" />
                <FormField label="Email" name="email" type="email" autoComplete="email" />
                <FormField label="Пароль" name="password" type="password" autoComplete="new-password" />
                <FormField label="ИНН компании или ИП, если есть" name="inn" required={false} />
                <FormField label="Slug компании" name="slug" placeholder="tega" required={false} />
                <div className="sm:col-span-2">
                  <TextAreaField label="Комментарий" name="comment" rows={3} />
                </div>

                <div className="space-y-3 rounded-lg bg-slate-50 p-4 sm:col-span-2">
                  <label className="flex gap-3 text-sm font-medium text-slate-700">
                    <input name="offerAccepted" type="checkbox" className="mt-1 size-4" required />
                    <span>Я принимаю условия договора-оферты. <Link className="font-semibold text-teal-700" href="/offer" target="_blank">Открыть договор-оферту</Link></span>
                  </label>
                  <label className="flex gap-3 text-sm font-medium text-slate-700">
                    <input name="privacyAccepted" type="checkbox" className="mt-1 size-4" required />
                    <span>Я согласен на обработку персональных данных. <Link className="font-semibold text-teal-700" href="/privacy" target="_blank">Политика обработки персональных данных</Link></span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <SubmitButton>Отправить заявку</SubmitButton>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

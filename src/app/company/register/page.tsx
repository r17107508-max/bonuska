import Link from "next/link";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { CompanyRegisterForm } from "@/components/company-register-form";

export default function CompanyRegisterPage() {
  return (
    <main className="min-h-screen bg-slate-100 py-8">
      <div className="page-shell max-w-5xl">
        <Link href="/" className="inline-block">
          <BrandMark />
        </Link>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="panel p-6">
            <p className="text-sm font-semibold uppercase text-[var(--brand)]">14 дней бесплатно</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Создайте компанию</h1>
            <p className="mt-2 text-slate-600">После регистрации вы сразу войдёте в кабинет и сможете настроить программу, распечатать QR и добавить кассиров.</p>
            <CompanyRegisterForm />
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <h2 className="text-xl font-semibold text-slate-950">Что входит</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                {["14 дней бесплатно сразу после регистрации", "4990 ₽/мес после пробного периода", "QR-плакат для стойки", "Сканер для кассира", "Личные QR-карты клиентов"].map((item) => (
                  <p key={item} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />{item}</p>
                ))}
              </div>
            </div>
            <div className="panel p-5">
              <h2 className="text-xl font-semibold text-slate-950">Без ожидания подтверждения</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Пробный период начнётся автоматически. После 14 дней доступ приостановится, если подписка не оплачена; данные компании сохранятся.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

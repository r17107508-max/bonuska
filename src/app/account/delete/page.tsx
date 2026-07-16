import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AccountDeletePage() {
  const settings = await getSettings();

  return (
    <main className="min-h-screen bg-slate-100 py-8">
      <article className="page-shell max-w-4xl">
        <Link href="/" className="inline-block">
          <BrandMark />
        </Link>
        <section className="panel mt-8 p-6">
          <p className="badge bg-[var(--brand-soft)] text-[var(--brand-ink)]">Удаление аккаунта</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-950">Как удалить аккаунт и данные</h1>
          <div className="mt-6 space-y-5 leading-7 text-slate-700">
            <p>
              Клиент может удалить аккаунт самостоятельно в приложении: откройте раздел <strong>Аккаунт</strong> и нажмите{" "}
              <strong>Удалить аккаунт</strong>. После подтверждения будут удалены клиентский профиль, бонусные карты,
              история участия и QR-токены клиента.
            </p>
            <p>
              Если аккаунт связан с компанией, кассой, платежами или служебными операциями, автоматическое удаление может
              быть остановлено. В этом случае напишите в поддержку, чтобы мы помогли передать доступы и обработали запрос
              вручную.
            </p>
            <p>
              Компании и сотрудники компаний могут запросить удаление или блокировку данных через поддержку. В запросе
              укажите телефон аккаунта, название компании и действие, которое нужно выполнить.
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">Поддержка</p>
              <a className="mt-1 inline-block font-semibold text-[var(--brand)]" href={`mailto:${settings.supportEmail}`}>
                {settings.supportEmail}
              </a>
            </div>
            <p className="text-sm text-slate-500">
              Часть сведений может сохраняться на срок, требуемый законом, договором-офертой или обязанностями по
              безопасности сервиса. Подробности описаны в политике обработки персональных данных.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-4 font-semibold text-white"
                href="/app/account"
              >
                Открыть аккаунт
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700"
                href="/privacy"
              >
                Политика данных
              </Link>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}

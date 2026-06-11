import { saveServiceSettings } from "@/app/actions";
import { AdminShell, superadminNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField, TextAreaField } from "@/components/form-field";
import { requireSuperadmin } from "@/lib/auth";
import { getMailConfigStatus } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";

export default async function SuperadminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  await requireSuperadmin();
  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  const mailStatus = getMailConfigStatus();

  return (
    <AdminShell title="Настройки сервиса" subtitle="Тариф, trial, реквизиты, оферта, политика и версия документов." nav={superadminNav}>
      {params.success && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Настройки сохранены.</p>}

      <section className={`mb-5 rounded-lg p-4 ${mailStatus.ready ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
        <p className="font-semibold">{mailStatus.ready ? "Email-уведомления настроены" : "Email-уведомления не настроены"}</p>
        {mailStatus.ready ? (
          <p className="mt-1 text-sm">SMTP: {mailStatus.host}:{mailStatus.port ?? "587"}, отправитель: {mailStatus.from}</p>
        ) : (
          <p className="mt-1 text-sm">
            На сервере нужно добавить SMTP-настройки в `.env`. Сейчас не хватает: {mailStatus.missing.join(", ")}.
          </p>
        )}
      </section>

      <form action={saveServiceSettings} className="panel grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Стоимость подписки, ₽" name="subscriptionPrice" type="number" defaultValue={settings.subscriptionPrice} />
          <FormField label="Дней trial" name="trialDays" type="number" defaultValue={settings.trialDays} />
          <FormField label="Версия оферты" name="offerVersion" defaultValue={settings.offerVersion} />
          <FormField label="Версия политики" name="privacyVersion" defaultValue={settings.privacyVersion} />
          <FormField label="Email поддержки" name="supportEmail" type="email" defaultValue={settings.supportEmail} />
        </div>
        <TextAreaField label="Реквизиты для оплаты" name="paymentRequisites" rows={4} defaultValue={settings.paymentRequisites} />
        <TextAreaField label="Текст договора-оферты" name="offerText" rows={14} defaultValue={settings.offerText} required />
        <TextAreaField label="Политика персональных данных" name="privacyText" rows={10} defaultValue={settings.privacyText} required />
        <SubmitButton>Сохранить настройки</SubmitButton>
      </form>
    </AdminShell>
  );
}

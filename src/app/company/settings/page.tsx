import Link from "next/link";
import QRCode from "qrcode";
import { saveCompanySettings, showCompanyOnboardingChecklist } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { RegistrationQrPoster } from "@/components/registration-qr-poster";
import { SubmitButton } from "@/components/buttons";
import { FormField, SelectField, TextAreaField } from "@/components/form-field";
import { requireCompanyAdmin } from "@/lib/auth";
import { findLoyaltyTemplate, loyaltyTemplates } from "@/lib/loyalty-templates";
import { getCompanyRegistrationUrl } from "@/lib/request-url";

const businessTypes = ["Кофейня", "Шаурмичная", "Пекарня", "Напитки", "Фастфуд", "Пиццерия", "Кондитерская", "Барбершоп", "Другое"];
const icons = ["☕ кофе", "🌯 шаурма", "🥐 круассан", "🧋 напиток", "🍔 бургер", "🍕 пицца", "🍩 пончик", "🍦 мороженое", "⭐ звезда", "🎁 подарок"];
const programTypes = [
  { value: "CLASSIC_REWARD", label: "Классический подарок" },
  { value: "COLLECT_AND_REWARD", label: "Накопи и получи подарок" },
  { value: "GIFT_BOX", label: "Коробка с подарком" },
  { value: "DISCOUNT_AFTER_N", label: "Скидка после N покупок" },
  { value: "CUSTOMER_LEVELS", label: "Постоянный уровень клиента" },
];

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; template?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const params = await searchParams;
  const program = access.company.loyaltyProgram;
  const selectedTemplate = findLoyaltyTemplate(params.template);
  const clientUrl = await getCompanyRegistrationUrl(access.company.slug);
  const qrDataUrl = await QRCode.toDataURL(clientUrl, {
    width: 420,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const defaults = {
    businessType: selectedTemplate?.business ?? access.company.businessType,
    icon: selectedTemplate?.icon ?? program?.icon ?? access.company.icon,
    themeColor: selectedTemplate?.themeColor ?? program?.themeColor ?? access.company.themeColor,
    goalCount: selectedTemplate?.goalCount ?? program?.goalCount ?? 6,
    rewardTitle: selectedTemplate?.rewardTitle ?? program?.rewardTitle ?? "Подарок",
    rewardDescription: selectedTemplate?.rewardDescription ?? program?.rewardDescription ?? "",
  };

  return (
    <AdminShell title="Настройки акции" subtitle="Ссылка для клиентов, QR-плакат, шаблон программы лояльности и подарок." nav={companyNav}>
      {params.success && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Настройки сохранены.</p>}

      {access.company.onboardingChecklistHidden && (
        <form action={showCompanyOnboardingChecklist} className="mb-6 rounded-lg bg-slate-50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-slate-700">Чек-лист запуска скрыт.</p>
            <button type="submit" className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
              Показать чек-лист запуска снова
            </button>
          </div>
        </form>
      )}

      <div id="registration-qr" className="mb-6 scroll-mt-6">
        <RegistrationQrPoster
          companyName={access.company.name}
          clientUrl={clientUrl}
          qrDataUrl={qrDataUrl}
          rewardTitle={defaults.rewardTitle}
        />
      </div>

      <section className="panel mb-6 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">Готовые шаблоны</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Выберите акцию для своей ниши</h2>
            <p className="mt-2 text-slate-600">Шаблон подставит количество покупок, подарок, иконку и текст для клиента. Всё можно изменить перед сохранением.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {loyaltyTemplates.map((template) => (
            <Link
              key={template.id}
              href={`/company/settings?template=${template.id}`}
              className={`rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${selectedTemplate?.id === template.id ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-3xl">{template.icon}</span>
                <span className="text-xs font-semibold uppercase text-slate-500">{template.business}</span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-950">{template.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{template.goalCount} покупок · {template.rewardTitle}</p>
            </Link>
          ))}
        </div>
      </section>

      <form action={saveCompanySettings} className="panel grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Название компании" name="name" defaultValue={access.company.name} />
          <FormField label="Slug компании" name="slug" defaultValue={access.company.slug} />
          <SelectField label="Тип бизнеса" name="businessType" defaultValue={defaults.businessType} options={businessTypes.map((item) => ({ value: item, label: item }))} />
          <SelectField label="Иконка прогресса" name="icon" defaultValue={defaults.icon} options={icons.map((item) => ({ value: item.split(" ")[0] ?? "🎁", label: item }))} />
          <FormField label="Цветовая тема" name="themeColor" type="color" defaultValue={defaults.themeColor} />
          <FormField label="Телефон" name="phone" defaultValue={access.company.ownerPhone} />
          <FormField label="Город" name="city" defaultValue={access.company.city} />
          <FormField label="Адрес" name="address" defaultValue={access.company.address} required={false} />
          <FormField label="Количество покупок до подарка" name="goalCount" type="number" defaultValue={defaults.goalCount} />
          <SelectField label="Тип программы" name="programType" defaultValue={program?.programType ?? "CLASSIC_REWARD"} options={programTypes} />
          <FormField label="Название подарка" name="rewardTitle" defaultValue={defaults.rewardTitle} />
        </div>
        <TextAreaField label="Описание компании" name="description" defaultValue={access.company.description} rows={3} required={false} />
        <TextAreaField label="Текст для клиента" name="rewardDescription" defaultValue={defaults.rewardDescription} rows={3} />
        <TextAreaField
          label="Подарки для коробки, по одному в строке"
          name="giftOptions"
          rows={5}
          defaultValue={"кофе\nдесерт\nскидка 10%\nскидка 20%\nсироп бесплатно\nапгрейд размера"}
        />
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">Ссылка для клиентов: {clientUrl}</p>
          <p className="mt-1">После изменения slug сохраните настройки, чтобы QR обновился под новую ссылку.</p>
        </div>
        <SubmitButton>Сохранить настройки</SubmitButton>
      </form>
    </AdminShell>
  );
}

import { saveCompanySettings } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { SubmitButton } from "@/components/buttons";
import { FormField, SelectField, TextAreaField } from "@/components/form-field";
import { requireCompanyAdmin } from "@/lib/auth";

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
  searchParams: Promise<{ success?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const params = await searchParams;
  const program = access.company.loyaltyProgram;

  return (
    <AdminShell title="Настройки акции" subtitle="Компания, ссылка для клиентов, программа лояльности и подарки." nav={companyNav}>
      {params.success && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Настройки сохранены.</p>}
      <form action={saveCompanySettings} className="panel grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Название компании" name="name" defaultValue={access.company.name} />
          <FormField label="Slug компании" name="slug" defaultValue={access.company.slug} />
          <SelectField label="Тип бизнеса" name="businessType" defaultValue={access.company.businessType} options={businessTypes.map((item) => ({ value: item, label: item }))} />
          <SelectField label="Иконка прогресса" name="icon" defaultValue={program?.icon ?? access.company.icon} options={icons.map((item) => ({ value: item.split(" ")[0] ?? "🎁", label: item }))} />
          <FormField label="Цветовая тема" name="themeColor" type="color" defaultValue={program?.themeColor ?? access.company.themeColor} />
          <FormField label="Телефон" name="phone" defaultValue={access.company.ownerPhone} />
          <FormField label="Адрес" name="address" defaultValue={access.company.address} />
          <FormField label="Количество покупок до подарка" name="goalCount" type="number" defaultValue={program?.goalCount ?? 6} />
          <SelectField label="Тип программы" name="programType" defaultValue={program?.programType ?? "CLASSIC_REWARD"} options={programTypes} />
          <FormField label="Название подарка" name="rewardTitle" defaultValue={program?.rewardTitle ?? "Подарок"} />
        </div>
        <TextAreaField label="Описание компании" name="description" defaultValue={access.company.description} rows={3} />
        <TextAreaField label="Описание подарка" name="rewardDescription" defaultValue={program?.rewardDescription ?? ""} rows={3} />
        <TextAreaField
          label="Подарки для коробки, по одному в строке"
          name="giftOptions"
          rows={5}
          defaultValue={"кофе\nдесерт\nскидка 10%\nскидка 20%\nсироп бесплатно\nапгрейд размера"}
        />
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">Ссылка для клиентов: /c/{access.company.slug}</p>
          <p className="mt-1">QR-плакат для печати можно сделать из этой ссылки. В MVP ссылка отображается текстом.</p>
        </div>
        <SubmitButton>Сохранить настройки</SubmitButton>
      </form>
    </AdminShell>
  );
}

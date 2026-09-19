import Link from "next/link";
import QRCode from "qrcode";
import { Gift } from "lucide-react";
import { saveCompanySettings, showCompanyOnboardingChecklist } from "@/app/actions";
import { AdminShell, companyNav } from "@/components/admin-shell";
import { RegistrationQrPoster } from "@/components/registration-qr-poster";
import { SubmitButton } from "@/components/buttons";
import { FormField, SelectField, TextAreaField } from "@/components/form-field";
import { ProgramTypeSettings } from "@/components/program-type-settings";
import { CompanyAppearanceSettings } from "@/components/company-appearance-settings";
import { CompanyLogoUpload } from "@/components/company-logo-upload";
import { StatusPill, WorkspaceCard } from "@/components/company-ui";
import { PosIntegrationCard } from "@/components/pos-integration-card";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findLoyaltyTemplate, loyaltyTemplates } from "@/lib/loyalty-templates";
import { getCompanyRegistrationUrl } from "@/lib/request-url";

const businessTypes = ["Кофейня", "Шаурмичная", "Пекарня", "Напитки", "Фастфуд", "Пиццерия", "Кондитерская", "Барбершоп", "Другое"];
const icons = [
  { value: "☕", label: "Кофе" },
  { value: "🌯", label: "Шаурма" },
  { value: "🥐", label: "Круассан" },
  { value: "🧋", label: "Напиток" },
  { value: "🍔", label: "Бургер" },
  { value: "🍕", label: "Пицца" },
  { value: "🍩", label: "Десерт" },
  { value: "🍦", label: "Мороженое" },
  { value: "⭐", label: "Звезда" },
  { value: "🎁", label: "Подарок" },
];
export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; template?: string }>;
}) {
  const access = await requireCompanyAdmin();
  const params = await searchParams;
  const program = access.company.loyaltyProgram;
  const selectedTemplate = findLoyaltyTemplate(params.template);
  const clientUrl = await getCompanyRegistrationUrl(access.company.slug);
  const giftOptions = await getCompanyGiftOptions(access.companyId);
  const qrDataUrl = await QRCode.toDataURL(clientUrl, {
    width: 420,
    margin: 1,
    color: { dark: "#1F1B18", light: "#ffffff" },
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
    <AdminShell title="Настройки компании" subtitle="Компания, программа лояльности, оформление, карта и служебные параметры." nav={companyNav}>
      {params.success && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Настройки сохранены.</p>}
      {params.error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">{params.error}</p>}

      {access.company.onboardingChecklistHidden && (
        <form action={showCompanyOnboardingChecklist} className="mb-6 rounded-xl border border-[var(--border)] bg-white p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-[var(--text)]">Чек-лист запуска скрыт.</p>
            <button type="submit" className="min-h-11 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--text)]">
              Показать чек-лист запуска снова
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white p-1">
        {[
          ["#company", "Компания"],
          ["#program", "Программа лояльности"],
          ["#appearance", "Оформление"],
          ["#map", "Точка на карте"],
          ["#pos", "Интеграции"],
          ["#advanced", "Дополнительно"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex min-h-10 shrink-0 items-center rounded-xl px-3 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--inactive)] hover:text-[var(--text)]">
            {label}
          </a>
        ))}
      </div>

      <div id="registration-qr" className="mb-6 scroll-mt-24">
        <RegistrationQrPoster
          companyName={access.company.name}
          clientUrl={clientUrl}
          qrDataUrl={qrDataUrl}
          rewardTitle={defaults.rewardTitle}
        />
      </div>

      <WorkspaceCard className="mb-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--brand-strong)]">Шаблоны</p>
            <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">Выберите основу акции</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Шаблон подставляет реальные поля формы перед сохранением.</p>
          </div>
          {selectedTemplate && <StatusPill tone="brand">Шаблон выбран</StatusPill>}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {loyaltyTemplates.map((template) => (
            <Link
              key={template.id}
              href={`/company/settings?template=${template.id}`}
              className={`rounded-2xl border p-4 transition hover:shadow-md ${selectedTemplate?.id === template.id ? "border-[var(--brand-strong)] bg-[var(--brand-soft)]" : "border-[var(--border)] bg-white"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Gift aria-hidden className="size-5" />
                </span>
                <span className="text-xs font-bold uppercase text-[var(--text-muted)]">{template.business}</span>
              </div>
              <h3 className="mt-3 font-extrabold text-[var(--text)]">{template.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{template.goalCount} покупок · {template.rewardTitle}</p>
            </Link>
          ))}
        </div>
      </WorkspaceCard>

      <form action={saveCompanySettings} className="space-y-6">
        <WorkspaceCard id="company">
          <SectionHead title="Компания" text="Эти данные клиенты видят в карточке компании и списке партнёров." />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Название" name="name" defaultValue={access.company.name} />
              <FormField label="Телефон" name="phone" defaultValue={access.company.ownerPhone} autoComplete="tel" />
              <FormField label="Город" name="city" defaultValue={access.company.city} />
              <FormField label="Адрес" name="address" defaultValue={access.company.address} required={false} />
              <FormField label="Сайт" name="website" defaultValue={access.company.website} required={false} placeholder="example.ru" />
              <SelectField label="Тип бизнеса" name="businessType" defaultValue={defaults.businessType} options={businessTypes.map((item) => ({ value: item, label: item }))} />
              <div className="sm:col-span-2">
                <TextAreaField label="Описание" name="description" defaultValue={access.company.description} rows={3} required={false} />
              </div>
            </div>
            <CompanyLogoUpload companyName={access.company.name} defaultLogoUrl={access.company.logoUrl} />
          </div>
        </WorkspaceCard>

        <WorkspaceCard id="program">
          <SectionHead title="Программа лояльности" text="Выберите механику и заполните только поля, которые реально поддерживает сервер." />
          <div className="mt-5 grid gap-4">
            <ProgramTypeSettings
              defaultProgramType={program?.programType ?? "CLASSIC_REWARD"}
              giftOptionsDefaultValue={giftOptions.length > 0 ? giftOptions.map((gift) => gift.title).join("\n") : ""}
              cashbackPercentDefaultValue={String((program?.cashbackPercentBasisPoints ?? 200) / 100)}
              loyaltyLevelsDefaultValue={[]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="sm:col-span-2 rounded-xl bg-[var(--background)] p-3 text-xs font-semibold leading-5 text-[var(--text-muted)]">
                Поля ниже используются для подарочных программ. В режиме «Кешбэк» расчёт идёт по проценту, указанному выше.
              </p>
              <FormField label="Количество шагов" name="goalCount" type="number" defaultValue={defaults.goalCount} />
              <FormField label="Название подарка" name="rewardTitle" defaultValue={defaults.rewardTitle} />
              <div className="sm:col-span-2">
                <TextAreaField label="Краткий текст акции" name="rewardDescription" defaultValue={defaults.rewardDescription} rows={2} placeholder="Например: 7-й кофе бесплатно" />
              </div>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard id="appearance">
          <SectionHead title="Оформление" text="Загрузите фон, выберите цвета и шрифт — результат сразу появится в предпросмотре." />
          <CompanyAppearanceSettings
            companyName={access.company.name}
            rewardTitle={defaults.rewardTitle}
            rewardDescription={defaults.rewardDescription}
            goalCount={Number(defaults.goalCount) || 6}
            icons={icons}
            defaultIcon={defaults.icon}
            defaultThemeColor={defaults.themeColor}
            defaultBackgroundMode={access.company.cardBackgroundMode}
            defaultBackgroundUrl={access.company.cardBackgroundUrl}
            defaultSurfaceColor={access.company.cardSurfaceColor}
            defaultTextColor={access.company.cardTextColor}
            defaultFontFamily={access.company.cardFontFamily}
          />
        </WorkspaceCard>

        <WorkspaceCard id="map">
          <SectionHead title="Точка на карте" text="Обычный пользователь работает с адресом. Координаты сохранены скрыто для совместимости." />
          <input type="hidden" name="latitude" value={access.company.latitude ?? ""} />
          <input type="hidden" name="longitude" value={access.company.longitude ?? ""} />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="font-bold text-[var(--text)]">Адрес точки</p>
              <p className="mt-2 text-[var(--text-muted)]">{access.company.city}, {access.company.address}</p>
              <a
                href={`https://yandex.ru/maps/?text=${encodeURIComponent(`${access.company.city}, ${access.company.address}`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--text)]"
              >
                Открыть карту
              </a>
            </div>
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-muted)]">
              <p className="font-bold text-[var(--text)]">Выбор точки на карте</p>
              <p className="mt-2">Интерактивный выбор координат и автоматическое геокодирование адреса требуют API карт. Сейчас сохраняются существующие координаты.</p>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard id="pos">
          <SectionHead title="Интеграции" text="Подключение кассы через защищённый POS API." />
          <div className="mt-5">
            <PosIntegrationCard
              prefix={access.company.posApiKeyPrefix}
              createdAt={access.company.posApiKeyCreatedAt?.toISOString() ?? null}
              lastUsedAt={access.company.posApiKeyLastUsedAt?.toISOString() ?? null}
            />
          </div>
        </WorkspaceCard>

        <WorkspaceCard id="advanced">
          <SectionHead title="Дополнительно" text="Служебные настройки, которые влияют на ссылки и QR-код." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Slug компании" name="slug" defaultValue={access.company.slug} />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Изменение slug поменяет ссылку клиента и QR-код. После сохранения скачайте QR-плакат заново.
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--text-muted)]">
            <p className="font-bold text-[var(--text)]">Ссылка для клиентов</p>
            <p className="mt-1 break-all">{clientUrl}</p>
          </div>
        </WorkspaceCard>

        <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-[var(--border)] bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[var(--text-muted)]">Есть несохранённые изменения после редактирования формы.</p>
            <SubmitButton>Сохранить</SubmitButton>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}

function SectionHead({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[var(--text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

async function getCompanyGiftOptions(companyId: string) {
  return getDb().giftOption.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { title: true },
  });
}

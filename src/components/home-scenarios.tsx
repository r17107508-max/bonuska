"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Gift,
  LogIn,
  QrCode,
  ScanLine,
  Smartphone,
  Store,
  UserRound,
  WalletCards,
} from "lucide-react";
import { InstallPwaButton } from "@/components/install-pwa-button";

export type PartnerPreview = {
  id: string;
  name: string;
  type: string;
  address: string;
  promo: string;
  href: string;
  icon: string;
};

type Props = {
  businessHref: string;
  businessLoginHref: string;
  clientHref: string;
  clientLoginHref: string;
  superadminHref: string | null;
  partners: PartnerPreview[];
};

const businessTypes = [
  "☕ Кофейни",
  "🌯 Шаурмичные",
  "🥐 Пекарни",
  "🧋 Напитки",
  "🍔 Фастфуд",
  "🍕 Пиццерии",
  "💈 Барбершопы",
  "🎁 Любой бизнес с повторными покупками",
];

const businessSteps = [
  "Компания регистрируется.",
  "Супер-админ подтверждает компанию.",
  "Компания получает 14 дней бесплатно.",
  "Компания настраивает акцию.",
  "Клиенты показывают QR.",
  "Кассир начисляет покупки.",
  "Приложение само считает подарки.",
];

const companyBenefits = [
  "цифровые бонусные карты",
  "QR-код клиента",
  "сканер для кассира",
  "настройка акций",
  "список клиентов",
  "история начислений",
  "статистика",
  "замена бумажных карточек",
  "PWA-приложение без App Store и Google Play",
];

const clientBenefits = [
  "один QR-код для разных компаний",
  "не нужно носить бумажные карточки",
  "бонусы не теряются",
  "видно, сколько осталось до подарка",
  "все бонусные карты в одном месте",
  "можно находить партнёров",
  "приложение можно установить на главный экран телефона",
  "пользоваться бесплатно",
];

const clientSteps = [
  "Регистрируетесь один раз.",
  "Получаете личный QR-код.",
  "Показываете QR на кассе у партнёров.",
  "Кассир начисляет покупку.",
  "Вы видите прогресс до подарка.",
  "Получаете подарок, когда накопите нужное количество покупок.",
];

const priceItems = [
  "14 дней бесплатно",
  "без комиссии с покупок",
  "без сложной CRM",
  "без кассовой интеграции на MVP",
  "можно начать за 15 минут",
];

export function HomeScenarios({
  businessHref,
  businessLoginHref,
  clientHref,
  clientLoginHref,
  superadminHref,
  partners,
}: Props) {
  const [scenario, setScenario] = useScenario();
  const isBusiness = scenario === "business";

  return (
    <main className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      <header className="page-shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
            <Gift aria-hidden className="size-5" />
          </span>
          <span className="text-xl font-semibold text-slate-950">ПроПлюшка</span>
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {superadminHref && <NavLink href={superadminHref}>Супер-админка</NavLink>}
          <NavLink href={clientLoginHref}>Вход для клиента</NavLink>
          <NavLink href={businessLoginHref}>Вход для компании</NavLink>
        </nav>
      </header>

      <section className="border-y border-slate-200 bg-white">
        <div className="page-shell py-10 text-center md:py-14">
          <p className="text-sm font-semibold uppercase text-teal-700">Главная страница</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">ПроПлюшка</h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            Один QR-код для бонусов, подарков и программ лояльности
          </p>

          <div className="mx-auto mt-8 grid max-w-md grid-cols-2 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200">
            <TabButton active={isBusiness} onClick={() => setScenario("business")}>
              <Building2 aria-hidden className="size-4" />
              Для бизнеса
            </TabButton>
            <TabButton active={!isBusiness} onClick={() => setScenario("client")}>
              <UserRound aria-hidden className="size-4" />
              Для клиентов
            </TabButton>
          </div>
        </div>
      </section>

      {isBusiness ? (
        <BusinessScenario businessHref={businessHref} />
      ) : (
        <ClientScenario clientHref={clientHref} partners={partners} />
      )}

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="page-shell flex flex-col gap-4 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
          <p>ПроПлюшка. QR-программы лояльности для бизнеса и клиентов.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
            <Link className="hover:text-teal-700" href="/offer">Договор-оферта</Link>
            <Link className="hover:text-teal-700" href="/privacy">Политика обработки персональных данных</Link>
            <a className="hover:text-teal-700" href="mailto:rf173@bk.ru">Контакты</a>
            <Link className="hover:text-teal-700" href={businessLoginHref}>Вход для компании</Link>
            <Link className="hover:text-teal-700" href={clientLoginHref}>Вход для клиента</Link>
          </div>
        </div>
      </footer>
      <InstallPwaButton placement="floating" />
    </main>
  );
}

function BusinessScenario({ businessHref }: { businessHref: string }) {
  return (
    <>
      <section className="hero-media text-white">
        <div className="page-shell grid min-h-[620px] items-center gap-10 py-14 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="inline-flex rounded-full bg-white/14 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">
              14 дней бесплатно. Далее 499 ₽/мес.
            </p>
            <h2 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight md:text-5xl xl:text-6xl">
              Цифровая программа лояльности для кафе, кофеен и шаурмичных
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/86 md:text-xl">
              Замените бумажные бонусные карточки на QR-систему. Клиент показывает QR-код, кассир начисляет покупку, приложение само считает подарки.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href={businessHref}>Зарегистрировать компанию <ArrowRight aria-hidden className="size-4" /></PrimaryLink>
              <SecondaryLink href="/demo">Посмотреть демо</SecondaryLink>
            </div>
          </div>

          <div className="rounded-lg border border-white/20 bg-white p-5 text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Рабочий экран кассира</p>
                <h3 className="mt-1 text-2xl font-semibold">Начисление по QR</h3>
              </div>
              <ScanLine aria-hidden className="size-10 text-teal-700" />
            </div>
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <QrCode className="mx-auto size-36 text-teal-700" strokeWidth={1.4} />
              <p className="mt-3 text-center text-sm font-semibold">Клиент показывает один QR-код</p>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Покупки" value="+1" />
              <Metric label="До подарка" value="3" />
              <Metric label="Статус" value="OK" />
            </div>
          </div>
        </div>
      </section>

      <Section title="Для кого">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {businessTypes.map((item) => (
            <div key={item} className="panel p-4 text-lg font-semibold text-slate-900">{item}</div>
          ))}
        </div>
      </Section>

      <Band>
        <SectionInner title="Как это работает для бизнеса">
          <NumberedList items={businessSteps} />
        </SectionInner>
      </Band>

      <Section title="Что получает компания">
        <IconGrid items={companyBenefits} icon={<BadgeCheck aria-hidden className="size-5" />} />
      </Section>

      <Band>
        <div className="page-shell grid gap-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">Стоимость</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">Стоимость</h2>
            <p className="mt-5 text-5xl font-semibold text-slate-950">499 ₽ <span className="text-xl text-slate-500">/ месяц</span></p>
            <div className="mt-7">
              <PrimaryLink href={businessHref}>Подключить компанию</PrimaryLink>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {priceItems.map((item) => (
              <div key={item} className="panel flex items-start gap-3 p-4">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-teal-700" />
                <p className="font-medium text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Band>
    </>
  );
}

function ClientScenario({ clientHref, partners }: { clientHref: string; partners: PartnerPreview[] }) {
  return (
    <>
      <section className="bg-slate-950 text-white">
        <div className="page-shell grid min-h-[620px] items-center gap-10 py-14 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="inline-flex rounded-full bg-emerald-400/16 px-3 py-1 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
              Для клиентов бесплатно
            </p>
            <h2 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight md:text-5xl xl:text-6xl">
              Копите плюшки в любимых местах
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/78 md:text-xl">
              Один аккаунт и один QR-код для бонусов в кофейнях, кафе, шаурмичных, пекарнях и других компаниях.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href={clientHref}>Стать клиентом <ArrowRight aria-hidden className="size-4" /></PrimaryLink>
              <SecondaryLink href="/partners">Посмотреть партнёров</SecondaryLink>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Ваш QR-код</p>
                <h3 className="mt-1 text-2xl font-semibold">Один для всех партнёров</h3>
              </div>
              <WalletCards aria-hidden className="size-10 text-teal-700" />
            </div>
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <QrCode className="mx-auto size-36 text-teal-700" strokeWidth={1.4} />
              <p className="mt-3 text-center text-sm font-semibold">Покажите QR на кассе</p>
            </div>
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              В приложении видно, сколько осталось до подарка
            </p>
          </div>
        </div>
      </section>

      <Section title="Что даёт приложение клиенту">
        <IconGrid items={clientBenefits} icon={<Smartphone aria-hidden className="size-5" />} />
      </Section>

      <Band>
        <SectionInner title="Как это работает для клиента">
          <NumberedList items={clientSteps} />
        </SectionInner>
      </Band>

      <Section title="Где можно копить плюшки">
        {partners.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {partners.map((partner) => (
              <article key={partner.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold text-slate-950">
                      <span className="mr-2">{partner.icon}</span>
                      {partner.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">{partner.type}</p>
                  </div>
                  <Store aria-hidden className="size-5 shrink-0 text-teal-700" />
                </div>
                {partner.address && <p className="mt-3 text-sm leading-6 text-slate-700">{partner.address}</p>}
                <p className="mt-2 text-sm font-semibold text-slate-800">{partner.promo}</p>
                <Link
                  href={partner.href}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Открыть
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel p-5 text-slate-600">
            Скоро здесь появятся первые партнёры. Пока можно зарегистрироваться и ждать подключения заведений.
          </div>
        )}
      </Section>
    </>
  );
}

function useScenario() {
  return useState<"business" | "client">("business");
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
        active ? "bg-teal-700 text-white shadow-sm" : "text-slate-700 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
      <LogIn aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50">
      {children}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="page-shell py-14">
      <h2 className="text-3xl font-semibold text-slate-950 md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Band({ children }: { children: ReactNode }) {
  return <section className="bg-white">{children}</section>;
}

function SectionInner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-shell py-14">
      <h2 className="text-3xl font-semibold text-slate-950 md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <div key={item} className="panel flex items-start gap-4 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">{index + 1}</span>
          <p className="pt-1 font-medium leading-6 text-slate-700">{item}</p>
        </div>
      ))}
    </div>
  );
}

function IconGrid({ items, icon }: { items: string[]; icon: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item} className="panel flex items-start gap-3 p-4">
          <span className="mt-0.5 text-teal-700">{icon}</span>
          <p className="font-medium leading-6 text-slate-700">{item}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

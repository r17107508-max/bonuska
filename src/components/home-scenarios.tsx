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
  Sparkles,
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
  "Кофейни",
  "Шаурмичные",
  "Кафе",
  "Пекарни",
  "Локальные магазины",
  "Салоны",
  "Барбершопы",
  "Любой бизнес с повторными визитами",
];

const companyBenefits = [
  "Клиенты копят покупки по QR без бумажных карточек",
  "Кассир видит одну понятную кнопку после сканирования",
  "Владелец видит клиентов, операции и выданные подарки",
  "Подарки и условия можно менять без сложной CRM",
  "QR-плакат можно распечатать и поставить на стойку",
  "Приложение работает как PWA на телефоне",
];

const clientBenefits = [
  "Один QR для разных партнёров",
  "Видно, сколько покупок осталось до подарка",
  "Подарок открывается прямо в кабинете",
  "Карты не теряются и не мнутся",
  "История покупок хранится в приложении",
  "Для клиента сервис бесплатный",
];

const businessSteps = [
  "Зарегистрируйте компанию и дождитесь подтверждения.",
  "Выберите шаблон: кофейня, шаурмичная, кафе, салон или магазин.",
  "Распечатайте QR-плакат и поставьте его на стойку.",
  "Кассир сканирует QR клиента и начисляет покупку.",
  "Клиент видит прогресс и забирает подарок, когда он готов.",
];

const clientSteps = [
  "Зарегистрируйтесь один раз.",
  "Откройте общий QR-код в приложении.",
  "Покажите QR на кассе у партнёра.",
  "Следите за прогрессом до подарка.",
  "Откройте подарок и покажите его кассиру.",
];

const priceItems = [
  "14 дней бесплатно",
  "499 ₽ в месяц после trial",
  "Без комиссии с покупок",
  "Без сложной CRM",
  "Запуск без кассовой интеграции",
  "Подходит для одной точки и небольшой сети",
];

export function HomeScenarios({
  businessHref,
  businessLoginHref,
  clientHref,
  clientLoginHref,
  superadminHref,
  partners,
}: Props) {
  const [scenario, setScenario] = useState<"business" | "client">("business");
  const isBusiness = scenario === "business";

  return (
    <main className="min-h-screen bg-[#fff8ed] pb-24 text-[#2f1d13] md:pb-0">
      <header className="page-shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm">
            <Gift aria-hidden className="size-5" />
          </span>
          <span>
            <span className="block text-xl font-semibold text-[#2f1d13]">ПроПлюшка</span>
            <span className="block text-xs font-semibold text-[#7b6a5b]">QR-лояльность для малого бизнеса</span>
          </span>
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {superadminHref && <NavLink href={superadminHref}>Супер-админка</NavLink>}
          <NavLink href={clientLoginHref}>Вход клиента</NavLink>
          <NavLink href={businessLoginHref}>Вход компании</NavLink>
        </nav>
      </header>

      <section className="hero-media text-white">
        <div className="page-shell grid min-h-[calc(100svh-92px)] items-center gap-8 py-12 lg:grid-cols-[1fr_380px]">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full bg-white/16 px-3 py-1 text-sm font-semibold ring-1 ring-white/30">
              Простая QR-программа лояльности без тяжёлой CRM
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              ПроПлюшка
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/88 md:text-xl">
              Клиент копит покупки, открывает подарки и показывает QR. Владелец видит клиентов, кассиров и эффективность программы в понятном кабинете.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href={businessHref}>Подключить компанию <ArrowRight aria-hidden className="size-4" /></PrimaryLink>
              <SecondaryLink href={clientHref}>Стать клиентом</SecondaryLink>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroMetric value="5 мин" label="на старт QR-плаката" />
              <HeroMetric value="1 QR" label="для клиента" />
              <HeroMetric value="0%" label="комиссии с покупок" />
            </div>
          </div>

          <div className="warm-card p-5 text-[#2f1d13] soft-rise">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#7b6a5b]">Живая карта клиента</p>
                <h2 className="mt-1 text-2xl font-semibold">До подарка 3 покупки</h2>
              </div>
              <span className="flex size-12 items-center justify-center rounded-lg bg-amber-100 text-2xl">🥯</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-amber-100">
              <div className="animated-progress h-full w-[70%] rounded-full bg-green-700" />
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className={`flex aspect-square items-center justify-center rounded-lg text-sm font-bold ${
                    index < 7 ? "bg-green-700 text-white" : "bg-white text-amber-700 ring-1 ring-amber-200"
                  }`}
                >
                  {index < 7 ? "✓" : "•"}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-amber-50 p-4">
              <p className="font-semibold">Плюшка почти готова</p>
              <p className="mt-1 text-sm text-[#7b6a5b]">Клиент видит понятный прогресс, а не сухое «7/10».</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-amber-100 bg-[#fffdf8]">
        <div className="page-shell py-8">
          <div className="mx-auto grid max-w-md grid-cols-2 rounded-lg bg-amber-50 p-1 ring-1 ring-amber-100">
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

      <footer className="border-t border-amber-100 bg-[#fffdf8] py-6">
        <div className="page-shell flex flex-col gap-4 text-sm text-[#7b6a5b] lg:flex-row lg:items-center lg:justify-between">
          <p>ПроПлюшка. QR-программы лояльности для бизнеса и клиентов.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
            <Link className="hover:text-green-800" href="/offer">Договор-оферта</Link>
            <Link className="hover:text-green-800" href="/privacy">Политика данных</Link>
            <a className="hover:text-green-800" href="mailto:rf173@bk.ru">Контакты</a>
            <Link className="hover:text-green-800" href={businessLoginHref}>Вход компании</Link>
            <Link className="hover:text-green-800" href={clientLoginHref}>Вход клиента</Link>
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
      <Section eyebrow="Для кого" title="Подходит точкам, где гости возвращаются">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {businessTypes.map((item) => (
            <div key={item} className="warm-card p-4 text-lg font-semibold">{item}</div>
          ))}
        </div>
      </Section>

      <Band>
        <SectionInner eyebrow="Как это работает" title="Запуск без сложной настройки">
          <NumberedList items={businessSteps} />
        </SectionInner>
      </Band>

      <Section eyebrow="Владелец" title="Что получает компания">
        <IconGrid items={companyBenefits} icon={<BadgeCheck aria-hidden className="size-5" />} />
      </Section>

      <Band>
        <div className="page-shell grid gap-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-green-800">Понятная цена</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">499 ₽ <span className="text-xl text-[#7b6a5b]">/ месяц</span></h2>
            <p className="mt-4 text-[#7b6a5b]">Без комиссии с покупок и без платы за каждого клиента.</p>
            <div className="mt-7">
              <PrimaryLink href={businessHref}>Подключить компанию</PrimaryLink>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {priceItems.map((item) => (
              <div key={item} className="warm-card flex items-start gap-3 p-4">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" />
                <p className="font-medium text-[#4a3528]">{item}</p>
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
      <Section eyebrow="Клиент" title="Копить плюшки должно быть приятно">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <IconGrid items={clientBenefits} icon={<Sparkles aria-hidden className="size-5" />} />
          <div className="warm-card p-5">
            <WalletCards aria-hidden className="size-10 text-green-700" />
            <h3 className="mt-4 text-2xl font-semibold">Один кабинет для подарков</h3>
            <p className="mt-2 text-[#7b6a5b]">Клиент видит QR, прогресс, доступный подарок и историю без лишних экранов.</p>
            <div className="mt-5">
              <PrimaryLink href={clientHref}>Стать клиентом <ArrowRight aria-hidden className="size-4" /></PrimaryLink>
            </div>
          </div>
        </div>
      </Section>

      <Band>
        <SectionInner eyebrow="Как это работает" title="Пять понятных шагов">
          <NumberedList items={clientSteps} />
        </SectionInner>
      </Band>

      <Section eyebrow="Партнёры" title="Где можно копить плюшки">
        {partners.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {partners.map((partner) => (
              <article key={partner.id} className="warm-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold">
                      <span className="mr-2">{partner.icon}</span>
                      {partner.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#7b6a5b]">{partner.type}</p>
                  </div>
                  <Store aria-hidden className="size-5 shrink-0 text-green-700" />
                </div>
                {partner.address && <p className="mt-3 text-sm leading-6 text-[#4a3528]">{partner.address}</p>}
                <p className="mt-2 text-sm font-semibold">{partner.promo}</p>
                <Link
                  href={partner.href}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Открыть
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="warm-card p-5 text-[#7b6a5b]">
            Пока нет активных партнёров. Когда компании подключатся, здесь появятся места, где можно копить плюшки.
          </div>
        )}
      </Section>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
        active ? "bg-green-700 text-white shadow-sm" : "text-[#5c3521] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#5c3521] hover:bg-amber-50">
      <LogIn aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-green-800">
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 bg-white/12 px-5 text-sm font-semibold text-white backdrop-blur hover:bg-white/18">
      {children}
    </Link>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="page-shell py-14">
      <p className="text-sm font-semibold uppercase text-green-800">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Band({ children }: { children: ReactNode }) {
  return <section className="bg-[#fffdf8]">{children}</section>;
}

function SectionInner({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="page-shell py-14">
      <p className="text-sm font-semibold uppercase text-green-800">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <div key={item} className="warm-card flex items-start gap-4 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">{index + 1}</span>
          <p className="pt-1 font-medium leading-6 text-[#4a3528]">{item}</p>
        </div>
      ))}
    </div>
  );
}

function IconGrid({ items, icon }: { items: string[]; icon: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item} className="warm-card flex items-start gap-3 p-4">
          <span className="mt-0.5 text-green-700">{icon}</span>
          <p className="font-medium leading-6 text-[#4a3528]">{item}</p>
        </div>
      ))}
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/14 p-4 ring-1 ring-white/24 backdrop-blur">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-white/78">{label}</p>
    </div>
  );
}

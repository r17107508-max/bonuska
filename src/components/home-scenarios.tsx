"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Coffee,
  Croissant,
  Gift,
  LogIn,
  Menu,
  Repeat2,
  Sandwich,
  Scissors,
  Settings2,
  ShoppingBag,
  Store,
  UserCog,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

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

const navItems = [
  { label: "Как работает", href: "#how-it-works" },
  { label: "Возможности", href: "#features" },
  { label: "Для кого", href: "#audience" },
  { label: "Тариф", href: "#pricing" },
  { label: "Партнёры", href: "/partners" },
];

const heroProofs = [
  "499 ₽/мес после пробного периода",
  "0% комиссии с покупок",
  "Без кассовой интеграции",
];

const steps = [
  {
    title: "Настройте подарок",
    text: "Выберите количество покупок и награду для постоянного клиента.",
  },
  {
    title: "Разместите QR",
    text: "Распечатайте готовый QR-плакат и поставьте его на стойку.",
  },
  {
    title: "Начисляйте покупки",
    text: "Кассир сканирует QR клиента, а клиент сразу видит прогресс до подарка.",
  },
];

const ownerBenefits: Array<{ title: string; text: string; Icon: LucideIcon }> = [
  {
    title: "Клиентская база",
    text: "Информация о зарегистрированных клиентах и их активности.",
    Icon: UsersRound,
  },
  {
    title: "История операций",
    text: "Начисленные покупки, открытые награды и выданные подарки.",
    Icon: ClipboardList,
  },
  {
    title: "Управление кассирами",
    text: "Отдельный понятный сценарий для сотрудников без лишнего доступа.",
    Icon: UserCog,
  },
  {
    title: "Гибкие условия",
    text: "Можно менять подарок и необходимое количество покупок.",
    Icon: Settings2,
  },
];

const customerBenefits = [
  "карта работает в браузере и как PWA",
  "не нужно носить бумажные карточки",
  "прогресс до подарка понятен с первого взгляда",
];

const audiences: Array<{ title: string; Icon: LucideIcon }> = [
  { title: "Кофейни", Icon: Coffee },
  { title: "Кафе и пекарни", Icon: Croissant },
  { title: "Шаурмичные и фастфуд", Icon: Sandwich },
  { title: "Салоны красоты", Icon: Scissors },
  { title: "Барбершопы", Icon: Store },
  { title: "Локальные магазины", Icon: ShoppingBag },
  { title: "Небольшие сети", Icon: Building2 },
  { title: "Другие компании с повторными визитами", Icon: Repeat2 },
];

const tariffItems = [
  "14 дней бесплатно",
  "цифровые карты клиентов",
  "QR-плакат",
  "сканер кассира",
  "кабинет владельца",
  "история клиентов и операций",
  "отсутствие комиссии с покупок",
];

const faqItems = [
  {
    question: "Нужна ли интеграция с кассой?",
    answer:
      "Нет. Покупка пробивается в вашей кассе как обычно, а ПроПлюшка отдельно фиксирует покупку в программе лояльности после сканирования QR-кода клиента.",
  },
  {
    question: "Нужно ли клиенту скачивать приложение?",
    answer:
      "Нет. Клиент открывает сервис в браузере. На телефоне его можно добавить на главный экран как PWA, но это не обязательный шаг.",
  },
  {
    question: "Как кассир начисляет покупку?",
    answer:
      "Клиент показывает QR-код, кассир открывает сканер в своём сценарии, сканирует код и начисляет покупку в карточку клиента.",
  },
  {
    question: "Когда начинается оплата?",
    answer:
      "Сначала доступен бесплатный пробный период на 14 дней. Оплата начинается только после пробного периода, если компания продолжает пользоваться сервисом.",
  },
  {
    question: "Можно ли использовать сервис в нескольких точках?",
    answer:
      "Можно подключать сотрудников-кассиров и работать с одной программой компании. Если нужны отдельные адреса и карточки для разных точек, их лучше оформить отдельно или согласовать подключение с администратором.",
  },
  {
    question: "Как клиент получает подарок?",
    answer:
      "Когда клиент набирает нужное количество покупок, подарок становится доступен. Кассир выдаёт подарок через сервис, а операция сохраняется в истории.",
  },
];

export function HomeScenarios({
  businessHref,
  businessLoginHref,
  clientHref,
  clientLoginHref,
  superadminHref,
  partners,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const partnerPreview = partners.slice(0, 6);

  return (
    <main className="landing-page min-h-screen bg-[#171717] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#171717]/92 backdrop-blur">
        <div className="landing-shell flex min-h-[76px] items-center justify-between gap-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="ПроПлюшка, главная">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF6846] text-white shadow-[0_14px_30px_rgba(255,104,70,0.28)]">
              <Gift aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold leading-tight tracking-normal text-white">ПроПлюшка</span>
              <span className="block text-xs font-semibold leading-snug text-white/62">QR-лояльность для малого бизнеса</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
            {navItems.map((item) => (
              <HeaderNavLink key={item.href} href={item.href}>
                {item.label}
              </HeaderNavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LoginMenu businessLoginHref={businessLoginHref} clientLoginHref={clientLoginHref} />
            <CompanyCta href={businessHref}>Попробовать бесплатно</CompanyCta>
          </div>

          <button
            type="button"
            aria-controls="mobile-landing-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setIsMenuOpen((value) => !value)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white transition hover:bg-white/14 lg:hidden"
          >
            {isMenuOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div id="mobile-landing-menu" className="border-t border-white/10 bg-[#171717] lg:hidden">
            <div className="landing-shell grid gap-2 py-4">
              {navItems.map((item) => (
                <MobileNavLink key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                  {item.label}
                </MobileNavLink>
              ))}
              <div className="mt-2 grid gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
                <span className="px-2 text-xs font-bold uppercase text-white/48">Войти</span>
                <MobileNavLink href={businessLoginHref} onClick={() => setIsMenuOpen(false)}>
                  Компания
                </MobileNavLink>
                <MobileNavLink href={clientLoginHref} onClick={() => setIsMenuOpen(false)}>
                  Клиент
                </MobileNavLink>
              </div>
              <CompanyCta href={businessHref} className="mt-2 w-full">
                Попробовать бесплатно
              </CompanyCta>
            </div>
          </div>
        )}
      </header>

      <section className="landing-shell py-4 sm:py-6 lg:py-8">
        <div className="landing-hero-shell relative overflow-hidden rounded-[30px] bg-[#171717] ring-1 ring-white/10">
          <picture className="landing-hero-picture">
            <source media="(max-width: 767px)" srcSet="/images/landing/proplushka-hero-mobile.webp" width={920} height={1024} />
            <source media="(min-width: 768px)" srcSet="/images/landing/proplushka-hero.webp" width={1536} height={1024} />
            <img
              src="/images/landing/proplushka-hero.webp"
              width={1536}
              height={1024}
              alt="Клиент показывает цифровую карту лояльности на телефоне в кофейне"
              fetchPriority="high"
              decoding="async"
              className="landing-hero-img"
            />
          </picture>
          <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(23,23,23,0.96)_0%,rgba(23,23,23,0.9)_36%,rgba(23,23,23,0.22)_64%,rgba(23,23,23,0)_100%)] md:block" />

          <div className="relative z-10 max-w-2xl px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-16 lg:px-14 lg:py-20">
            <p className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs font-extrabold uppercase leading-none text-white/82">
              QR-лояльность для кафе, салонов и магазинов
            </p>
            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.03] tracking-normal text-white sm:text-[40px] md:text-[58px] lg:text-[64px]">
              Возвращайте клиентов — без бумажных карт и сложной CRM
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-white/78 sm:text-lg sm:leading-8">
              Клиент показывает один QR-код, кассир начисляет покупку, а вы видите повторные визиты и выданные подарки в понятном кабинете.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CompanyCta href={businessHref} className="landing-company-cta">
                Попробовать 14 дней бесплатно
                <ArrowRight aria-hidden className="size-4" />
              </CompanyCta>
              <SecondaryCta href="#how-it-works" className="landing-secondary-cta">
                Посмотреть, как работает
              </SecondaryCta>
            </div>
            <div className="mt-7 grid gap-2 sm:grid-cols-3">
              {heroProofs.map((item) => (
                <div key={item} className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-bold leading-snug text-white/84">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TrustSection partners={partnerPreview} />

      <section id="how-it-works" className="bg-[#FFF6EC] text-[#171717]">
        <div className="landing-shell grid gap-10 py-16 lg:grid-cols-[0.9fr_1fr] lg:items-center lg:py-24">
          <div>
            <SectionEyebrow>Как работает ПроПлюшка</SectionEyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
              Запустите программу лояльности без сложного внедрения
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-[#5f554c]">
              Настройка занимает около 5 минут после подтверждения компании.
            </p>
            <div className="mt-8 grid gap-4">
              {steps.map((step, index) => (
                <article key={step.title} className="grid grid-cols-[48px_1fr] gap-4 rounded-3xl border border-[#eadfce] bg-white p-5 shadow-[0_18px_50px_rgba(23,23,23,0.06)]">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF6846] text-lg font-extrabold text-white">
                    {index + 1}
                  </span>
                  <span>
                    <h3 className="text-xl font-extrabold tracking-normal text-[#171717]">{step.title}</h3>
                    <p className="mt-2 text-base font-medium leading-7 text-[#63594f]">{step.text}</p>
                  </span>
                </article>
              ))}
            </div>
          </div>

          <ImageFrame tone="cream">
            <Image
              src="/images/landing/proplushka-how-it-works.webp"
              alt="QR-плакат, телефон с прогрессом покупок и подарок для клиента"
              width={1200}
              height={900}
              sizes="(min-width: 1024px) 560px, 100vw"
              className="h-full w-full object-cover"
            />
          </ImageFrame>
        </div>
      </section>

      <section id="features" className="bg-[#171717] text-white">
        <div className="landing-shell grid gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
          <ImageFrame tone="dark">
            <Image
              src="/images/landing/proplushka-business-analytics.webp"
              alt="Экран кабинета владельца с клиентами, операциями и показателями программы"
              width={1200}
              height={900}
              sizes="(min-width: 1024px) 560px, 100vw"
              className="h-full w-full object-cover"
            />
          </ImageFrame>

          <div>
            <SectionEyebrow dark>Выгоды для владельца</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
              Не просто штампы — вы видите, кто возвращается
            </h2>
            <p className="mt-5 text-base font-medium leading-7 text-white/66">
              Вместо бумажных карточек владелец получает понятный кабинет: клиенты, операции, кассиры и условия программы в одном месте.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {ownerBenefits.map((item) => (
                <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF6846] text-white">
                    <item.Icon aria-hidden className="size-6" />
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold tracking-normal text-white">{item.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/64">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FFF6EC] text-[#171717]">
        <div className="landing-shell py-16 lg:py-24">
          <div className="grid overflow-hidden rounded-[30px] bg-[#171717] text-white ring-1 ring-black/10 lg:grid-cols-[0.88fr_1fr]">
            <div className="order-2 p-6 sm:p-8 lg:order-1 lg:p-12">
              <SectionEyebrow dark>Выгоды для клиента</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
                Клиент всегда видит, сколько осталось до подарка
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-white/68">
                Один QR-код открывает карты партнёров, показывает накопленные покупки и помогает не забыть о следующем подарке.
              </p>
              <div className="mt-8 grid gap-3">
                {customerBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-[#FFB44C]" />
                    <p className="font-semibold leading-6 text-white/84">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <SecondaryCta href={clientHref} className="border-white/18 bg-white text-[#171717] hover:bg-white/88">
                  Я клиент
                </SecondaryCta>
              </div>
            </div>
            <div className="order-1 min-h-[320px] lg:order-2 lg:min-h-[560px]">
              <Image
                src="/images/landing/proplushka-customer-reward.webp"
                alt="Клиент получает подарок и показывает цифровую карту лояльности"
                width={1200}
                height={675}
                sizes="(min-width: 1024px) 620px, 100vw"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="audience" className="bg-[#171717] text-white">
        <div className="landing-shell py-16 lg:py-24">
          <div className="max-w-3xl">
            <SectionEyebrow dark>Для какого бизнеса подходит</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
              Для мест, куда клиенту важно вернуться снова
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((item) => (
              <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FFB44C] text-[#171717]">
                  <item.Icon aria-hidden className="size-6" />
                </span>
                <h3 className="mt-5 min-h-[56px] text-xl font-extrabold leading-tight tracking-normal text-white">{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#FFF6EC] text-[#171717]">
        <div className="landing-shell py-16 lg:py-24">
          <div className="mx-auto max-w-4xl rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-[0_22px_70px_rgba(23,23,23,0.08)] sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <SectionEyebrow>Тариф</SectionEyebrow>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
                  Всё необходимое за 499 ₽ в месяц
                </h2>
                <p className="mt-5 text-base font-semibold leading-7 text-[#63594f]">
                  14 дней бесплатно, затем понятная фиксированная стоимость без комиссии с покупок.
                </p>
                <div className="mt-7">
                  <CompanyCta href={businessHref} className="landing-company-cta">
                    Запустить бесплатно
                    <ArrowRight aria-hidden className="size-4" />
                  </CompanyCta>
                  <p className="mt-4 text-sm font-semibold text-[#6e6258]">Оплата начинается только после пробного периода.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {tariffItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#FFF6EC] p-4">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-[#FF6846]" />
                    <p className="font-bold leading-6 text-[#171717]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#171717] text-white">
        <div className="landing-shell py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr]">
            <div>
              <SectionEyebrow dark>FAQ</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl">
                Частые вопросы перед подключением
              </h2>
            </div>
            <div className="landing-faq grid gap-3">
              {faqItems.map((item) => (
                <details key={item.question} className="group rounded-3xl border border-white/10 bg-white/[0.06]">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-extrabold tracking-normal text-white">
                    <span>{item.question}</span>
                    <ChevronDown aria-hidden className="size-5 shrink-0 text-white/52 transition group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 text-base font-medium leading-7 text-white/68">{item.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FFF6EC] text-[#171717]">
        <div className="landing-shell py-16 lg:py-24">
          <div className="rounded-[30px] bg-[#FF6846] p-6 text-white sm:p-8 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
                  Дайте клиенту понятную причину вернуться
                </h2>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/86">
                  Настройте первую программу лояльности и протестируйте ПроПлюшку бесплатно в течение 14 дней.
                </p>
              </div>
              <CompanyCta href={businessHref} className="landing-company-cta bg-[#171717] text-white hover:bg-black">
                Подключить компанию
                <ArrowRight aria-hidden className="size-4" />
              </CompanyCta>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#171717] text-white">
        <div className="landing-shell flex flex-col gap-5 py-8 text-sm font-semibold text-white/58 lg:flex-row lg:items-center lg:justify-between">
          <p>ПроПлюшка. QR-карты лояльности для компаний с повторными визитами.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Link className="hover:text-white" href="/partners">Партнёры</Link>
            <Link className="hover:text-white" href="/offer">Оферта</Link>
            <Link className="hover:text-white" href="/privacy">Политика данных</Link>
            <Link className="hover:text-white" href={businessLoginHref}>Вход компании</Link>
            <Link className="hover:text-white" href={clientLoginHref}>Вход клиента</Link>
            {superadminHref && <Link className="hover:text-white" href={superadminHref}>Суперадмин</Link>}
          </div>
        </div>
      </footer>
    </main>
  );
}

function TrustSection({ partners }: { partners: PartnerPreview[] }) {
  return (
    <section className="bg-[#171717] text-white">
      <div className="landing-shell py-12 lg:py-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionEyebrow dark>Доверие</SectionEyebrow>
            <h2 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl">
              Уже возвращают клиентов с ПроПлюшкой
            </h2>
          </div>
          <Link href="/partners" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 px-4 text-sm font-extrabold text-white/78 transition hover:bg-white/8 hover:text-white">
            Все партнёры
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        {partners.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {partners.map((partner) => (
              <article key={partner.id} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF6EC] text-xl text-[#171717]">
                    {partner.icon || <Store aria-hidden className="size-5" />}
                  </span>
                  <span className="min-w-0">
                    <h3 className="truncate text-lg font-extrabold tracking-normal text-white">{partner.name}</h3>
                    <p className="mt-1 text-sm font-bold text-white/54">{partner.type || "Компания"}</p>
                  </span>
                </div>
                {partner.address && <p className="mt-4 line-clamp-2 text-sm font-medium leading-6 text-white/66">{partner.address}</p>}
                {partner.promo && <p className="mt-3 text-sm font-extrabold leading-6 text-white">{partner.promo}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-base font-medium leading-7 text-white/66">
            Активные партнёры появятся здесь после подключения и подтверждения компаний.
          </div>
        )}
      </div>
    </section>
  );
}

function LoginMenu({
  businessLoginHref,
  clientLoginHref,
}: {
  businessLoginHref: string;
  clientLoginHref: string;
}) {
  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 text-sm font-extrabold text-white/78 transition hover:bg-white/8 hover:text-white">
        <LogIn aria-hidden className="size-4" />
        Войти
        <ChevronDown aria-hidden className="size-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+10px)] z-20 grid min-w-44 gap-1 rounded-2xl border border-white/10 bg-[#242424] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <Link className="rounded-xl px-3 py-3 text-sm font-extrabold text-white/76 transition hover:bg-white/8 hover:text-white" href={businessLoginHref}>
          Компания
        </Link>
        <Link className="rounded-xl px-3 py-3 text-sm font-extrabold text-white/76 transition hover:bg-white/8 hover:text-white" href={clientLoginHref}>
          Клиент
        </Link>
      </div>
    </details>
  );
}

function HeaderNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-2xl px-3 text-sm font-extrabold text-white/68 transition hover:bg-white/8 hover:text-white">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-12 items-center rounded-2xl px-3 text-base font-extrabold text-white/82 transition hover:bg-white/8 hover:text-white">
      {children}
    </Link>
  );
}

function CompanyCta({ href, className = "", children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF6846] px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(255,104,70,0.28)] transition hover:bg-[#f15938] ${className}`}
    >
      {children}
    </Link>
  );
}

function SecondaryCta({ href, className = "", children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-5 text-sm font-extrabold text-white transition hover:bg-white/16 ${className}`}
    >
      {children}
    </Link>
  );
}

function SectionEyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`text-xs font-extrabold uppercase leading-none tracking-normal ${dark ? "text-[#FFB44C]" : "text-[#FF6846]"}`}>
      {children}
    </p>
  );
}

function ImageFrame({ children, tone }: { children: ReactNode; tone: "cream" | "dark" }) {
  return (
    <div className={`overflow-hidden rounded-[30px] ${tone === "cream" ? "bg-white shadow-[0_24px_70px_rgba(23,23,23,0.10)] ring-1 ring-[#eadfce]" : "bg-white/[0.04] ring-1 ring-white/10"}`}>
      {children}
    </div>
  );
}

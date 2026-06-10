import { ArrowRight, Check, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/buttons";
import { BrandMark } from "@/components/brand";

const audiences = ["☕ Кофейни", "🌯 Шаурмичные", "🥐 Пекарни", "🧋 Напитки", "🍔 Фастфуд", "💈 Услуги", "🍕 Пиццерии", "🎁 Любой бизнес с повторными покупками"];
const steps = [
  "Компания регистрируется.",
  "Глобальный админ подтверждает заявку.",
  "Компания получает 14 дней пробного периода.",
  "Админ компании настраивает программу лояльности.",
  "Клиенты регистрируются по ссылке компании.",
  "Клиент показывает QR-код.",
  "Кассир сканирует и начисляет покупку.",
  "При достижении цели клиент получает подарок.",
];
const features = ["цифровые бонусные карты", "личные QR-коды клиентов", "сканер QR для кассира", "история покупок", "настройка подарков", "статистика", "PWA-приложение для клиентов", "ссылка и QR-плакат для регистрации клиентов"];

export default function Home() {
  return (
    <main className="bg-slate-50">
      <header className="page-shell flex items-center justify-between py-5">
        <BrandMark compact />
        <nav className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/company/login" variant="ghost">Вход компании</ButtonLink>
          <ButtonLink href="/superadmin/login" variant="ghost">Суперадмин</ButtonLink>
        </nav>
      </header>

      <section className="hero-media text-white">
        <div className="page-shell grid min-h-[680px] items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full bg-white/14 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">PWA/SaaS для малого бизнеса</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight md:text-6xl">Запустите программу лояльности за 15 минут</h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-white/86">
              Клиенты показывают QR-код, кассир подтверждает покупку, а приложение само считает бонусы и подарки.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/company/register">Зарегистрировать компанию <ArrowRight aria-hidden className="size-4" /></ButtonLink>
              <ButtonLink href="/c/tega" variant="secondary">Посмотреть демо</ButtonLink>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-[32px] border border-white/20 bg-white p-4 text-slate-950 shadow-2xl">
            <div className="rounded-[24px] bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">ТЕГА</p>
                  <h2 className="text-2xl font-semibold">7-й кофе бесплатно</h2>
                </div>
                <span className="text-3xl">☕</span>
              </div>
              <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <QrCode className="mx-auto size-36 text-teal-700" strokeWidth={1.4} />
                <p className="mt-3 text-center text-sm font-semibold">Покажите QR-код на кассе</p>
              </div>
              <div className="mt-5 grid grid-cols-6 gap-2">
                {["☕", "☕", "☕", "○", "○", "○"].map((item, index) => (
                  <div key={`${item}-${index}`} className="flex aspect-square items-center justify-center rounded-lg bg-teal-50 text-xl text-teal-800">
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Осталось 3 покупки до подарка</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-14">
        <h2 className="text-3xl font-semibold text-slate-950">Для кого</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((item) => (
            <div key={item} className="panel p-4 text-lg font-semibold">{item}</div>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="page-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950">Как это работает</h2>
            <p className="mt-3 text-slate-600">Без бумажных карточек, сложной CRM и комиссии с покупок.</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step} className="panel flex gap-3 p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">{index + 1}</span>
                <span className="font-medium text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-shell grid gap-6 py-14 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-3xl font-semibold text-slate-950">Стоимость</h2>
          <p className="mt-5 text-5xl font-semibold text-slate-950">499 ₽ <span className="text-xl text-slate-500">/ месяц</span></p>
          <div className="mt-6 space-y-3">
            {["14 дней бесплатно", "после оплаты — 30 дней доступа", "без комиссии с покупок", "без сложной CRM", "можно отключиться в любой момент"].map((item) => (
              <p key={item} className="flex items-center gap-2 text-slate-700"><Check aria-hidden className="size-5 text-teal-700" />{item}</p>
            ))}
          </div>
        </div>
        <div className="panel p-6">
          <h2 className="text-3xl font-semibold text-slate-950">Что получает компания</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {features.map((item) => (
              <p key={item} className="flex gap-2 text-slate-700"><ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-teal-700" />{item}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell flex flex-col items-start justify-between gap-5 py-14 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-semibold text-slate-950">Готовы запустить свою бонусную карту?</h2>
          <p className="mt-2 text-slate-600">Заявка попадет в кабинет глобального админа.</p>
        </div>
        <ButtonLink href="/company/register">Зарегистрировать компанию</ButtonLink>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="page-shell flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>ПроПлюшка. MVP программы лояльности.</p>
          <p className="flex items-center gap-2"><Smartphone aria-hidden className="size-4" />PWA для установки на главный экран</p>
        </div>
      </footer>
    </main>
  );
}

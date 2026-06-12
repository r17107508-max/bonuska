import { ArrowRight, Check, Clock3, QrCode, ScanLine, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/buttons";
import { BrandMark } from "@/components/brand";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { getCurrentUser, getUserHomePath } from "@/lib/auth";

const audiences = ["Кофейни", "Шаурмичные", "Пекарни", "Точки напитков", "Фастфуд", "Барбершопы", "Пиццерии", "Любой бизнес с повторными покупками"];

const ownerBenefits = [
  "Клиенты не теряют бумажные карточки",
  "Кассир отмечает покупку за несколько секунд",
  "Владелец видит клиентов, покупки и подарки",
  "Нет комиссии с продаж и сложной CRM",
];

const steps = [
  ["Компания регистрируется", "Заявка занимает пару минут, trial включается после подтверждения."],
  ["Печатает QR для стойки", "Клиенты сканируют QR и регистрируются именно в вашей компании."],
  ["Кассир сканирует клиента", "Покупки начисляются через рабочий экран кассира."],
  ["Клиент возвращается за подарком", "Прогресс виден в телефоне, подарок считается автоматически."],
];

const objections = [
  ["Мне хватает бумажек", "QR-карта не теряется, а клиент всегда видит, сколько осталось до подарка."],
  ["Кассиру будет неудобно", "У кассира только сканер, карточка клиента и одна кнопка начисления."],
  ["499 ₽ дорого", "Это около 17 ₽ в день. Одна повторная покупка уже окупает месяц."],
  ["Клиенты не будут ставить приложение", "Ничего из App Store не нужно: клиент открывает карту по QR в браузере."],
];

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(await getUserHomePath(currentUser));
  }

  return (
    <main className="bg-slate-50 pb-24 md:pb-0">
      <header className="page-shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark compact />
        <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <ButtonLink href="/company/login" variant="ghost">Вход</ButtonLink>
          <ButtonLink href="/company/register">Попробовать бесплатно</ButtonLink>
        </nav>
      </header>

      <section className="hero-media text-white">
        <div className="page-shell grid min-h-[680px] items-center gap-10 py-14 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="inline-flex rounded-full bg-white/14 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">QR-карта лояльности для малого бизнеса</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight md:text-6xl">Запустите бонусную карту для клиентов за 15 минут</h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-white/86">
              Клиент сканирует QR, получает личную карту, кассир отмечает покупки, а сервис сам считает прогресс и подарки. Без бумажек, CRM и комиссии с продаж.
            </p>

            <div className="mt-6 grid gap-3 text-sm font-semibold text-white/90 sm:grid-cols-2">
              <p className="flex items-center gap-2"><Check aria-hidden className="size-5 text-emerald-300" />14 дней бесплатно</p>
              <p className="flex items-center gap-2"><Check aria-hidden className="size-5 text-emerald-300" />499 ₽/мес после trial</p>
              <p className="flex items-center gap-2"><Check aria-hidden className="size-5 text-emerald-300" />QR-плакат для стойки</p>
              <p className="flex items-center gap-2"><Check aria-hidden className="size-5 text-emerald-300" />Работает как PWA</p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/company/register">Попробовать 14 дней бесплатно <ArrowRight aria-hidden className="size-4" /></ButtonLink>
              <ButtonLink href="/c/tega" variant="secondary">Открыть демо клиента</ButtonLink>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-md gap-4">
            <div className="rounded-[28px] border border-white/20 bg-white p-4 text-slate-950 shadow-2xl">
              <div className="rounded-[22px] bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Карта клиента</p>
                    <h2 className="mt-1 text-2xl font-semibold">7-й кофе бесплатно</h2>
                  </div>
                  <span className="text-4xl">☕</span>
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

            <div className="grid grid-cols-3 gap-3 text-slate-950">
              <MiniCard icon={<QrCode aria-hidden className="size-5" />} label="QR для стойки" />
              <MiniCard icon={<ScanLine aria-hidden className="size-5" />} label="Сканер кассира" />
              <MiniCard icon={<WalletCards aria-hidden className="size-5" />} label="Карта клиента" />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-14">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950">Зачем это владельцу</h2>
            <p className="mt-3 text-slate-600">Сервис закрывает простую задачу: сделать так, чтобы клиенту было удобно возвращаться, а кассиру было несложно отмечать покупки.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ownerBenefits.map((item) => (
              <div key={item} className="panel flex gap-3 p-4">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-teal-700" />
                <p className="font-medium text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="page-shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">Как это работает</h2>
              <p className="mt-3 max-w-2xl text-slate-600">Владелец запускает акцию, клиент получает QR-карту, кассир начисляет покупки. Остальное считает система.</p>
            </div>
            <div className="rounded-lg bg-teal-50 px-4 py-3 font-semibold text-teal-900">
              <Clock3 aria-hidden className="mr-2 inline size-5" />
              Первый запуск за 15 минут
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {steps.map(([title, text], index) => (
              <div key={title} className="panel p-5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
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
        <div className="page-shell grid gap-6 lg:grid-cols-2">
          <div className="panel p-6">
            <h2 className="text-3xl font-semibold text-slate-950">Цена понятная с первого дня</h2>
            <p className="mt-5 text-5xl font-semibold text-slate-950">499 ₽ <span className="text-xl text-slate-500">/ месяц</span></p>
            <p className="mt-2 text-slate-600">Это около 17 ₽ в день. Без комиссии с покупок и без платы за каждого клиента.</p>
            <div className="mt-6 space-y-3">
              {["14 дней бесплатно", "после оплаты — 30 дней доступа", "можно отключиться в любой момент", "данные клиентов сохраняются"].map((item) => (
                <p key={item} className="flex items-center gap-2 text-slate-700"><Check aria-hidden className="size-5 text-teal-700" />{item}</p>
              ))}
            </div>
          </div>
          <div className="panel p-6">
            <h2 className="text-3xl font-semibold text-slate-950">Что получает компания</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["цифровые бонусные карты", "личные QR-коды клиентов", "сканер QR для кассира", "история покупок", "QR-плакат для стойки", "статистика", "роли сотрудников", "PWA для клиентов"].map((item) => (
                <p key={item} className="flex gap-2 text-slate-700"><ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-teal-700" />{item}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-14">
        <h2 className="text-3xl font-semibold text-slate-950">Частые сомнения владельцев</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {objections.map(([title, text]) => (
            <div key={title} className="panel p-5">
              <h3 className="font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell flex flex-col items-start justify-between gap-5 py-14 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-semibold text-slate-950">Готовы заменить бумажные карточки на QR?</h2>
          <p className="mt-2 text-slate-600">Оставьте заявку, после подтверждения получите 14 дней бесплатного доступа.</p>
        </div>
        <ButtonLink href="/company/register">Попробовать бесплатно</ButtonLink>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="page-shell flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>ПроПлюшка. QR-программы лояльности для малого бизнеса.</p>
          <p className="flex items-center gap-2"><Smartphone aria-hidden className="size-4" />PWA для установки на главный экран</p>
        </div>
      </footer>
      <InstallPwaButton placement="floating" />
    </main>
  );
}

function MiniCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg bg-white/95 p-3 text-center shadow-lg">
      <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">{icon}</div>
      <p className="mt-2 text-xs font-semibold">{label}</p>
    </div>
  );
}

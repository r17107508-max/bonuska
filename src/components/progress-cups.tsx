import { Gift, Sparkles } from "lucide-react";

export function ProgressIcons({
  icon,
  current,
  goal,
  rewardAvailable,
  rewardTitle,
  rewardReadyTitle,
  rewardReadyHint,
}: {
  icon: string;
  current: number;
  goal: number;
  rewardAvailable: boolean;
  rewardTitle: string;
  rewardReadyTitle?: string;
  rewardReadyHint?: string;
}) {
  const safeGoal = Math.max(goal, 1);
  const visibleCurrent = Math.min(current, safeGoal);
  const left = Math.max(safeGoal - current, 0);
  const percent = rewardAvailable ? 100 : Math.round((visibleCurrent / safeGoal) * 100);
  const leftText = pluralPurchases(left);

  return (
    <section className={`warm-card overflow-hidden p-5 ${rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-green-800">Прогресс до подарка</p>
          <h2 className="mt-1 text-3xl font-semibold text-[#2f1d13]">
            {rewardAvailable ? "Подарок готов" : `${visibleCurrent} из ${safeGoal} покупок`}
          </h2>
          <p className="mt-1 text-sm text-[#7b6a5b]">
            {rewardAvailable ? (rewardReadyHint ?? `${rewardTitle}. Покажите QR-код кассиру.`) : `До подарка осталось ${leftText}.`}
          </p>
        </div>
        <div className={`flex size-14 shrink-0 items-center justify-center rounded-lg ${rewardAvailable ? "bg-amber-200 text-amber-900" : "bg-green-50 text-green-800"}`}>
          {rewardAvailable ? <Sparkles aria-hidden className="size-7" /> : <span className="text-3xl">{icon}</span>}
        </div>
      </div>

      <div className="mt-5 h-4 overflow-hidden rounded-full bg-amber-100">
        <div
          className={`animated-progress h-full rounded-full ${rewardAvailable ? "bg-amber-500" : "bg-green-700"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: safeGoal }).map((_, index) => {
          const filled = index < current;
          return (
            <div
              key={index}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-lg border text-xl transition ${
                filled
                  ? "border-green-700 bg-green-700 text-white shadow-sm"
                  : "border-amber-100 bg-white text-amber-200"
              }`}
              aria-label={filled ? "Покупка засчитана" : "Ожидает покупки"}
            >
              {filled ? icon : "○"}
            </div>
          );
        })}
      </div>

      <div className={`mt-5 rounded-lg p-4 ${rewardAvailable ? "bg-amber-100" : "bg-[#fff8ed]"}`}>
        {rewardAvailable ? (
          <>
            <div className="flex items-center gap-2">
              <Gift aria-hidden className="size-5 text-amber-800" />
              <p className="text-lg font-semibold text-amber-950">{rewardReadyTitle ?? "Можно забрать подарок"}</p>
            </div>
            <p className="text-sm text-amber-800">
              {rewardReadyHint ?? "Покажите QR-код кассиру перед оплатой, чтобы он выдал подарок и сбросил прогресс."}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-[#2f1d13]">Покажите QR при следующей покупке</p>
            <p className="text-sm text-[#7b6a5b]">Кассир отсканирует QR и добавит новую отметку в карту.</p>
          </>
        )}
      </div>
    </section>
  );
}

function pluralPurchases(value: number) {
  const abs = Math.abs(value);
  const last = abs % 10;
  const lastTwo = abs % 100;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${value} покупок`;
  }

  if (last === 1) {
    return `${value} покупка`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} покупки`;
  }

  return `${value} покупок`;
}

import { Gift } from "lucide-react";

export function ProgressIcons({
  icon,
  current,
  goal,
  rewardAvailable,
  rewardTitle,
}: {
  icon: string;
  current: number;
  goal: number;
  rewardAvailable: boolean;
  rewardTitle: string;
}) {
  const safeGoal = Math.max(goal, 1);
  const visibleCurrent = Math.min(current, safeGoal);
  const left = Math.max(safeGoal - current, 0);
  const percent = rewardAvailable ? 100 : Math.round((visibleCurrent / safeGoal) * 100);

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">Прогресс до подарка</p>
          <h2 className="mt-1 text-3xl font-semibold text-slate-950">
            {rewardAvailable ? "Подарок готов" : `${visibleCurrent} из ${safeGoal}`}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {rewardAvailable ? `${rewardTitle}. Покажите QR-код кассиру.` : `Осталось ${left} покупок до подарка.`}
          </p>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          {rewardAvailable ? <Gift aria-hidden /> : <span className="text-2xl">{icon}</span>}
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: safeGoal }).map((_, index) => {
          const filled = index < current;
          return (
            <div
              key={index}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-lg border text-xl ${
                filled
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-300"
              }`}
              aria-label={filled ? "Покупка засчитана" : "Ожидает покупки"}
            >
              {filled ? icon : "○"}
            </div>
          );
        })}
      </div>

      <div className={`mt-5 rounded-lg p-4 ${rewardAvailable ? "bg-amber-50" : "bg-slate-100"}`}>
        {rewardAvailable ? (
          <>
            <p className="text-lg font-semibold text-amber-950">Можно забрать подарок</p>
            <p className="text-sm text-amber-800">Покажите QR-код кассиру перед оплатой, чтобы он выдал подарок и сбросил прогресс.</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-950">Покажите QR при следующей покупке</p>
            <p className="text-sm text-slate-600">Кассир отсканирует QR и начислит отметку в вашу карту.</p>
          </>
        )}
      </div>
    </section>
  );
}

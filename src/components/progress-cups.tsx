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
  const left = Math.max(goal - current, 0);

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">Прогресс</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {Math.min(current, goal)} из {goal}
          </h2>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          {rewardAvailable ? <Gift aria-hidden /> : <span className="text-2xl">{icon}</span>}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: goal }).map((_, index) => {
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

      <div className="mt-5 rounded-lg bg-slate-100 p-4">
        {rewardAvailable ? (
          <>
            <p className="text-lg font-semibold text-slate-950">Подарок доступен</p>
            <p className="text-sm text-slate-600">{rewardTitle}. Покажите QR-код кассиру.</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-950">Осталось {left} покупок до подарка</p>
            <p className="text-sm text-slate-600">После покупки кассир отсканирует QR и начислит отметку.</p>
          </>
        )}
      </div>
    </section>
  );
}

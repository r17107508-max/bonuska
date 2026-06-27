import { Sparkles } from "lucide-react";

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
  const percent = rewardAvailable ? 100 : Math.round((visibleCurrent / safeGoal) * 100);

  return (
    <section className={`warm-card overflow-hidden p-4 ${rewardAvailable ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-green-800">Прогресс</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#2f1d13]">
            {rewardAvailable ? "Подарок готов" : `${visibleCurrent} из ${safeGoal} покупок`}
          </h2>
          <p className="mt-1 text-sm font-medium leading-5 text-[#7b6a5b]">
            {rewardAvailable ? (rewardReadyHint ?? "Покажите QR кассиру.") : rewardTitle}
          </p>
        </div>
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${rewardAvailable ? "bg-amber-200 text-amber-900" : "bg-green-50 text-green-800"}`}>
          {rewardAvailable ? <Sparkles aria-hidden className="size-6" /> : <span className="text-2xl">{icon}</span>}
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-amber-100">
        <div
          className={`animated-progress h-full rounded-full ${rewardAvailable ? "bg-amber-500" : "bg-green-700"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: safeGoal }).map((_, index) => {
          const filled = index < current;
          return (
            <div
              key={index}
              className={`flex aspect-square min-h-10 items-center justify-center rounded-lg border text-lg transition ${
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

      <div className={`mt-4 rounded-lg p-3 ${rewardAvailable ? "bg-amber-100" : "bg-[#fff8ed]"}`}>
        {rewardAvailable ? (
          <p className="text-sm font-semibold text-amber-950">{rewardReadyTitle ?? "Можно забрать подарок"}</p>
        ) : (
          <p className="text-sm font-semibold text-[#2f1d13]">Покажите QR при покупке</p>
        )}
      </div>
    </section>
  );
}

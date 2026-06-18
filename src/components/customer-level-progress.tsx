import { CheckCircle2 } from "lucide-react";
import { calculateLoyaltyLevel, type LoyaltyLevelLike } from "@/lib/loyalty-levels";

export function CustomerLevelProgress({
  totalPurchases,
  levels,
  compact = false,
}: {
  totalPurchases: number;
  levels: LoyaltyLevelLike[];
  compact?: boolean;
}) {
  const progress = calculateLoyaltyLevel(totalPurchases, levels);
  const current = progress.current;
  const next = progress.next;

  return (
    <section className={`panel ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-700">Ваш уровень</p>
          <h2 className={`${compact ? "text-xl" : "text-2xl"} mt-1 font-semibold text-slate-950`}>
            {current ? `${current.name} ${current.icon ?? ""}` : "Уровень не настроен"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Всего покупок: <span className="font-semibold text-slate-950">{totalPurchases}</span>
          </p>
        </div>
        {current && (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg text-3xl text-white" style={{ backgroundColor: current.color ?? "#0f766e" }}>
            {current.icon ?? "⭐"}
          </div>
        )}
      </div>

      {current?.benefit && (
        <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-950">
          <p className="font-semibold">Привилегия уровня</p>
          <p className="mt-1">{current.benefit}</p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-700">
            {next ? `До уровня ${next.name}${next.icon ? ` ${next.icon}` : ""} осталось` : "Максимальный уровень"}
          </span>
          <span className="font-semibold text-teal-700">
            {next ? `${progress.remainingToNext} покупок` : "100%"}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-700" style={{ width: `${progress.progressPercent}%` }} />
        </div>
      </div>

      {next && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Следующий уровень: {next.name} {next.icon}</p>
          {next.benefit && <p className="mt-1">Привилегия {next.name}: {next.benefit}</p>}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {progress.levels.map((level) => {
          const isCurrent = current?.id === level.id;
          const isPassed = totalPurchases >= level.minPurchases && !isCurrent;
          return (
            <div
              key={level.id}
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                isCurrent
                  ? "border-teal-300 bg-teal-50 text-teal-950"
                  : isPassed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg text-white" style={{ backgroundColor: isCurrent || isPassed ? level.color ?? "#0f766e" : "#94a3b8" }}>
                {isPassed ? <CheckCircle2 aria-hidden className="size-5" /> : level.icon ?? "⭐"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{level.name}</span>
                <span className="block text-xs">от {level.minPurchases} покупок</span>
              </span>
              {isCurrent && <span className="rounded-full bg-teal-700 px-2.5 py-1 text-xs font-bold text-white">текущий</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

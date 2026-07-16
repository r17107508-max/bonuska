import { Check, Gift, Sparkles } from "lucide-react";

export function ProgressIcons({
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
    <section className={`warm-card overflow-hidden p-4 ${rewardAvailable ? "border-[var(--gold)] bg-[var(--inactive)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--brand)]">Прогресс</p>
          <h2 className="mt-1 text-2xl font-extrabold text-[var(--text)]">
            {rewardAvailable ? "Подарок готов" : `${visibleCurrent} из ${safeGoal} покупок`}
          </h2>
          <p className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)]">
            {rewardAvailable ? (rewardReadyHint ?? "Покажите QR кассиру.") : rewardTitle}
          </p>
        </div>
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-[16px] ${rewardAvailable ? "bg-[rgba(255,200,87,0.44)] text-[#7a4b00]" : "bg-[var(--brand-soft)] text-[var(--brand)]"}`}>
          {rewardAvailable ? <Sparkles aria-hidden className="size-6" /> : <Gift aria-hidden className="size-6" />}
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--inactive)]">
        <div
          className={`animated-progress h-full rounded-full ${rewardAvailable ? "bg-[var(--gold)]" : "bg-[var(--brand)]"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: safeGoal }).map((_, index) => {
          const filled = index < current;

          return (
            <div
              key={index}
              className={`flex aspect-square min-h-10 items-center justify-center rounded-[14px] border text-sm font-black transition ${
                filled
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-sm"
                  : "border-[var(--border)] bg-[var(--inactive)] text-[var(--text-muted)]"
              }`}
              aria-label={filled ? "Покупка засчитана" : "Ожидает покупки"}
            >
              {filled ? <Check aria-hidden className="size-5" /> : index + 1}
            </div>
          );
        })}
      </div>

      <div className={`mt-4 rounded-[16px] p-3 ${rewardAvailable ? "bg-[rgba(255,200,87,0.25)]" : "bg-[var(--background)]"}`}>
        {rewardAvailable ? (
          <p className="text-sm font-semibold text-[#5f3a00]">{rewardReadyTitle ?? "Можно забрать подарок"}</p>
        ) : (
          <p className="text-sm font-semibold text-[var(--text)]">Покажите QR при покупке</p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

const programDescriptions = {
  CLASSIC_REWARD: {
    label: "Классический подарок",
    scheme: "Покупки -> подарок доступен -> кассир выдаёт подарок -> прогресс сбрасывается",
    description: "Клиент копит покупки до цели, после чего следующая операция становится подарком.",
  },
  COLLECT_AND_REWARD: {
    label: "Накопи и получи подарок",
    scheme: "Покупки -> известная цель -> подарок доступен -> выдача",
    description: "Клиент заранее видит, какой подарок получит после нужного количества покупок.",
  },
  GIFT_BOX: {
    label: "Коробка с подарком",
    scheme: "Покупки -> клиент открывает коробку -> кассир сканирует подарочный QR",
    description: "Система выбирает подарок из списка, когда клиент сам открывает коробку в своём кабинете.",
  },
  DISCOUNT_AFTER_N: {
    label: "Скидка после N покупок",
    scheme: "Покупки -> скидка доступна -> кассир применяет скидку -> прогресс сбрасывается",
    description: "Используйте название подарка и описание для размера скидки, например «Скидка 15%».",
  },
} as const;

type ProgramType = keyof typeof programDescriptions;

const availableProgramTypes: ProgramType[] = [
  "CLASSIC_REWARD",
  "COLLECT_AND_REWARD",
  "GIFT_BOX",
  "DISCOUNT_AFTER_N",
];

export function ProgramTypeSettings({
  defaultProgramType,
  giftOptionsDefaultValue,
}: {
  defaultProgramType: string;
  giftOptionsDefaultValue: string;
  loyaltyLevelsDefaultValue: unknown[];
}) {
  const initialProgramType = availableProgramTypes.includes(defaultProgramType as ProgramType)
    ? defaultProgramType as ProgramType
    : "CLASSIC_REWARD";
  const [programType, setProgramType] = useState<ProgramType>(initialProgramType);

  return (
    <div className="grid gap-4">
      <input type="hidden" name="programType" value={programType} />
      <div>
        <p className="text-sm font-bold text-[var(--text)]">Тип программы</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {availableProgramTypes.map((type) => {
            const selected = type === programType;
            const item = programDescriptions[type];

            return (
              <button
                key={type}
                type="button"
                onClick={() => setProgramType(type)}
                className={`min-h-[150px] rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[var(--brand-strong)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)] bg-white hover:bg-[var(--inactive)]"
                }`}
                aria-pressed={selected}
              >
                <span className="block font-extrabold text-[var(--text)]">{item.label}</span>
                <span className="mt-2 block text-sm text-[var(--text-muted)]">{item.description}</span>
                <span className="mt-3 block rounded-xl bg-white p-2 text-xs font-bold text-[var(--brand-strong)] ring-1 ring-[var(--border)]">{item.scheme}</span>
              </button>
            );
          })}
        </div>
      </div>

      {programType === "GIFT_BOX" && (
        <label className="block">
          <span className="text-sm font-bold text-[var(--text)]">Подарки для коробки, по одному в строке</span>
          <textarea
            name="giftOptions"
            rows={5}
            defaultValue={giftOptionsDefaultValue}
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-base leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
          />
          <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">Поле сохраняется только для механики «Коробка с подарком».</span>
        </label>
      )}
    </div>
  );
}

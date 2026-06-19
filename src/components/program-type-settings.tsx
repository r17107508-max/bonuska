"use client";

import { useMemo, useState } from "react";

const programDescriptions = {
  CLASSIC_REWARD: {
    label: "Классический подарок",
    description:
      "Клиент покупает нужное количество раз, а следующая покупка становится подарком.",
    logic: [
      "клиент копит покупки",
      "при достижении цели появляется подарок",
      "кассир выдаёт подарок",
      "после выдачи прогресс сбрасывается",
    ],
  },
  COLLECT_AND_REWARD: {
    label: "Накопи и получи подарок",
    description:
      "Клиент копит покупки до нужного количества и получает заранее указанный подарок.",
    logic: [
      "подарок заранее известен",
      "клиент видит, сколько осталось",
      "после достижения цели подарок доступен",
      "кассир подтверждает выдачу",
    ],
  },
  GIFT_BOX: {
    label: "Коробка с подарком",
    description:
      "Когда подарок доступен, клиент сам открывает коробку в кабинете, а система выбирает подарок из списка.",
    logic: [
      "вы указываете список подарков",
      "клиент копит покупки",
      "после достижения цели открывает коробку",
      "кассир сканирует подарочный QR и выдаёт подарок",
    ],
  },
  DISCOUNT_AFTER_N: {
    label: "Скидка после N покупок",
    description:
      "Клиент копит покупки и после достижения цели получает скидку.",
    logic: [
      "укажите размер скидки в названии или описании подарка",
      "клиент копит покупки",
      "кассир применяет скидку",
      "после использования прогресс сбрасывается",
    ],
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
  const selected = programDescriptions[programType];
  const giftLines = useMemo(
    () => giftOptionsDefaultValue.split("\n").map((item) => item.trim()).filter(Boolean),
    [giftOptionsDefaultValue],
  );

  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Тип программы</span>
        <select
          name="programType"
          value={programType}
          onChange={(event) => setProgramType(event.target.value as ProgramType)}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
        >
          {availableProgramTypes.map((type) => (
            <option key={type} value={type}>
              {programDescriptions[type].label}
            </option>
          ))}
        </select>
      </label>

      <section className="rounded-lg border border-teal-100 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-950">Как работает выбранный тип программы</p>
        <p className="mt-2">{selected.description}</p>
        <ul className="mt-3 grid gap-1">
          {selected.logic.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-700" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Подарки для коробки, по одному в строке</span>
        {programType === "GIFT_BOX" && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Введите подарки по одному в строке. Когда клиент накопит нужное количество покупок, он сам откроет коробку в кабинете.
          </p>
        )}
        <textarea
          name="giftOptions"
          rows={Math.max(5, giftLines.length)}
          defaultValue={giftOptionsDefaultValue}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
        />
      </label>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

const programDescriptions = {
  CLASSIC_REWARD: {
    label: "Классический подарок",
    description:
      "Клиент покупает нужное количество раз, а следующая покупка становится подарком. Например: 6 кофе купил — 7-й кофе бесплатно.",
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
      "Клиент копит покупки до нужного количества и получает заранее указанный подарок. Например: после 10 покупок — десерт в подарок.",
    logic: [
      "подарок заранее известен",
      "клиент видит, сколько осталось",
      "после достижения цели подарок доступен",
      "кассир подтверждает выдачу",
      "прогресс сбрасывается",
    ],
  },
  GIFT_BOX: {
    label: "Коробка с подарком",
    description:
      "Клиент копит покупки, а когда подарок доступен — сам открывает коробку в своём кабинете. Система случайно выбирает один подарок из списка, который вы указали ниже.",
    logic: [
      "вы указываете список подарков, по одному в строке",
      "клиент копит покупки",
      "когда цель достигнута, у клиента появляется кнопка «Открыть подарок»",
      "клиент нажимает кнопку и видит анимацию коробки",
      "сервер случайно выбирает один подарок из списка",
      "клиент видит выпавший подарок и QR подарка",
      "кассир сканирует QR подарка и выдаёт именно этот подарок",
      "после выдачи прогресс сбрасывается",
    ],
  },
  DISCOUNT_AFTER_N: {
    label: "Скидка после N покупок",
    description:
      "Клиент копит покупки и после достижения цели получает скидку. Например: после 5 покупок — скидка 20%.",
    logic: [
      "укажите размер скидки в названии или описании подарка",
      "клиент копит покупки",
      "после достижения цели кассир применяет скидку",
      "после использования скидки прогресс сбрасывается",
    ],
  },
  CUSTOMER_LEVELS: {
    label: "Постоянный уровень клиента",
    description:
      "Клиент постепенно повышает свой уровень за покупки. Например: 10 покупок — Bronze, 30 покупок — Silver, 50 покупок — Gold.",
    logic: [
      "это долгосрочная программа",
      "прогресс клиента не обязательно сбрасывается после каждого подарка",
      "этот режим пока в разработке и недоступен для запуска",
    ],
  },
} as const;

type ProgramType = keyof typeof programDescriptions;

const availableProgramTypes: ProgramType[] = [
  "CLASSIC_REWARD",
  "COLLECT_AND_REWARD",
  "GIFT_BOX",
  "DISCOUNT_AFTER_N",
  "CUSTOMER_LEVELS",
];

export function ProgramTypeSettings({
  defaultProgramType,
  giftOptionsDefaultValue,
}: {
  defaultProgramType: string;
  giftOptionsDefaultValue: string;
}) {
  const initialProgramType = isProgramType(defaultProgramType) && defaultProgramType !== "CUSTOMER_LEVELS"
    ? defaultProgramType
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
            <option key={type} value={type} disabled={type === "CUSTOMER_LEVELS"}>
              {programDescriptions[type].label}{type === "CUSTOMER_LEVELS" ? " — в разработке" : ""}
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
            Введите подарки по одному в строке. Когда клиент накопит нужное количество покупок,
            он сам откроет коробку в своём кабинете. Система случайно выберет один подарок из
            этого списка и покажет клиенту QR подарка.
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

function isProgramType(value: string): value is ProgramType {
  return value in programDescriptions;
}

"use client";

import { Check, Plus, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { defaultLoyaltyLevels, loyaltyLevelTemplates, type LoyaltyLevelInput } from "@/lib/loyalty-levels";

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
      "Клиент повышает свой статус за общее количество покупок в вашей компании. Чем чаще клиент покупает, тем выше его уровень и тем больше привилегий он получает. Прогресс не сбрасывается после подарка — статус растёт постоянно.",
    logic: [
      "статус считается отдельно внутри вашей компании",
      "уровень зависит от общего количества покупок",
      "порог и привилегию каждого уровня настраиваете вы",
      "клиент видит текущий статус, следующий уровень и сколько покупок осталось",
      "кассир видит уровень и привилегию при сканировании QR",
    ],
  },
} as const;

type ProgramType = keyof typeof programDescriptions;
type EditableLevel = LoyaltyLevelInput & { localId: string };

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
  loyaltyLevelsDefaultValue,
}: {
  defaultProgramType: string;
  giftOptionsDefaultValue: string;
  loyaltyLevelsDefaultValue: LoyaltyLevelInput[];
}) {
  const initialProgramType = isProgramType(defaultProgramType) ? defaultProgramType : "CLASSIC_REWARD";
  const [programType, setProgramType] = useState<ProgramType>(initialProgramType);
  const [levels, setLevels] = useState<EditableLevel[]>(() => toEditableLevels(loyaltyLevelsDefaultValue));
  const selected = programDescriptions[programType];
  const giftLines = useMemo(
    () => giftOptionsDefaultValue.split("\n").map((item) => item.trim()).filter(Boolean),
    [giftOptionsDefaultValue],
  );
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.minPurchases - b.minPurchases || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [levels],
  );
  const validationError = validateLevels(sortedLevels);
  const levelsJson = JSON.stringify(
    sortedLevels.map(({ localId: _localId, ...level }, index) => ({ ...level, sortOrder: index })),
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
        <p className="font-semibold text-slate-950">
          Как работает {programType === "CUSTOMER_LEVELS" ? "“Постоянный уровень клиента”" : "выбранный тип программы"}
        </p>
        <p className="mt-2">{selected.description}</p>
        {programType === "CUSTOMER_LEVELS" && (
          <p className="mt-2">
            Этот режим подходит для компаний, которые хотят развивать постоянных клиентов: кофейни, барбершопы, пекарни, кафе, фастфуд, салоны и другие бизнесы с повторными покупками.
          </p>
        )}
        <ul className="mt-3 grid gap-1">
          {selected.logic.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-700" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {programType === "CUSTOMER_LEVELS" && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="loyaltyLevelsJson" value={levelsJson} />
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-semibold uppercase text-teal-700">Настройка уровней клиентов</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Статусы и привилегии</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Задайте пороги покупок, названия уровней и выгоды. Клиент будет видеть текущий и следующий статус.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setLevels(addLevel(sortedLevels))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">
                <Plus aria-hidden className="size-4" />
                Добавить уровень
              </button>
              <button type="submit" disabled={Boolean(validationError)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                <Save aria-hidden className="size-4" />
                Сохранить уровни
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setLevels(toEditableLevels(defaultLoyaltyLevels))} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700">
              <RotateCcw aria-hidden className="size-4" />
              Сбросить к шаблону
            </button>
            {loyaltyLevelTemplates.map((template) => (
              <button key={template.id} type="button" onClick={() => setLevels(toEditableLevels(template.levels))} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-50 px-3 text-sm font-semibold text-amber-900">
                <Sparkles aria-hidden className="size-4" />
                Применить шаблон: {template.label}
              </button>
            ))}
          </div>

          {validationError ? (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{validationError}</p>
          ) : (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              <Check aria-hidden className="mr-2 inline size-4" />
              Уровни готовы к сохранению.
            </p>
          )}

          <div className="mt-4 grid gap-3">
            {sortedLevels.map((level, index) => (
              <article key={level.localId} className={`rounded-lg border p-4 ${level.isActive ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white opacity-70"}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg text-xl text-white" style={{ backgroundColor: level.color || "#0f766e" }}>
                      {level.icon || index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-950">{level.name || "Без названия"}</p>
                      <p className="text-xs font-semibold uppercase text-slate-500">от {level.minPurchases} покупок</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeLevel(level.localId, levels, setLevels)} className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label="Удалить уровень">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1.1fr_150px_120px_120px]">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Название уровня</span>
                    <input value={level.name} onChange={(event) => updateLevel(level.localId, { name: event.target.value }, setLevels)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Покупок от</span>
                    <input type="number" min={0} value={level.minPurchases} onChange={(event) => updateLevel(level.localId, { minPurchases: Number(event.target.value) }, setLevels)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Иконка</span>
                    <input value={level.icon ?? ""} onChange={(event) => updateLevel(level.localId, { icon: event.target.value }, setLevels)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Цвет</span>
                    <input type="color" value={level.color || "#0f766e"} onChange={(event) => updateLevel(level.localId, { color: event.target.value }, setLevels)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2" />
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-600">Описание привилегии</span>
                  <textarea value={level.benefit ?? ""} onChange={(event) => updateLevel(level.localId, { benefit: event.target.value }, setLevels)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15" />
                </label>

                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={level.isActive} onChange={(event) => updateLevel(level.localId, { isActive: event.target.checked }, setLevels)} className="size-4 rounded border-slate-300 text-teal-700" />
                  Активен
                </label>
              </article>
            ))}
          </div>
        </section>
      )}

      <label className={programType === "CUSTOMER_LEVELS" ? "hidden" : "block"}>
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

function toEditableLevels(levels: LoyaltyLevelInput[]) {
  return levels.map((level, index) => ({
    ...level,
    localId: level.id ?? `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    sortOrder: level.sortOrder ?? index,
    icon: level.icon ?? "",
    color: level.color ?? "#0f766e",
    benefit: level.benefit ?? "",
    isActive: level.isActive !== false,
  }));
}

function updateLevel(localId: string, patch: Partial<EditableLevel>, setLevels: (updater: (levels: EditableLevel[]) => EditableLevel[]) => void) {
  setLevels((items) => items.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
}

function removeLevel(localId: string, levels: EditableLevel[], setLevels: (levels: EditableLevel[]) => void) {
  if (levels.length <= 1) {
    return;
  }
  setLevels(levels.filter((item) => item.localId !== localId));
}

function addLevel(levels: EditableLevel[]) {
  const lastThreshold = levels.reduce((max, level) => Math.max(max, level.minPurchases), 0);
  return [
    ...levels,
    {
      localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: "Новый уровень",
      minPurchases: lastThreshold + 10,
      benefit: "",
      icon: "⭐",
      color: "#0f766e",
      isActive: true,
      sortOrder: levels.length,
    },
  ];
}

function validateLevels(levels: EditableLevel[]) {
  const active = levels.filter((level) => level.isActive);
  if (levels.some((level) => !level.name.trim())) {
    return "Название уровня не должно быть пустым.";
  }
  if (levels.some((level) => !Number.isInteger(level.minPurchases) || level.minPurchases < 0)) {
    return "Порог уровня должен быть целым числом от 0.";
  }
  if (!active.some((level) => level.minPurchases === 0)) {
    return "Должен быть хотя бы один активный уровень от 0 покупок.";
  }
  const thresholds = new Set<number>();
  for (const level of active) {
    if (thresholds.has(level.minPurchases)) {
      return "Нельзя сохранить два активных уровня с одинаковым порогом.";
    }
    thresholds.add(level.minPurchases);
  }
  return "";
}

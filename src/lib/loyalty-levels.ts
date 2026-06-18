import type { LoyaltyLevel, Prisma } from "@prisma/client";

export type LoyaltyLevelInput = {
  id?: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  minPurchases: number;
  benefit?: string | null;
  isActive: boolean;
  sortOrder?: number;
};

export type LoyaltyLevelLike = Pick<LoyaltyLevel, "id" | "name" | "icon" | "color" | "minPurchases" | "benefit" | "isActive" | "sortOrder">;

export const defaultLoyaltyLevels: LoyaltyLevelInput[] = [
  {
    name: "Новичок",
    minPurchases: 0,
    benefit: "Начальный уровень клиента",
    icon: "🌱",
    color: "#16a34a",
    isActive: true,
    sortOrder: 0,
  },
  {
    name: "Bronze",
    minPurchases: 10,
    benefit: "Скидка 5% или небольшой бонус",
    icon: "🥉",
    color: "#b45309",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Silver",
    minPurchases: 30,
    benefit: "Скидка 10% или подарок от компании",
    icon: "🥈",
    color: "#64748b",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Gold",
    minPurchases: 60,
    benefit: "Особые подарки, скидки и приоритетные предложения",
    icon: "🥇",
    color: "#ca8a04",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "VIP",
    minPurchases: 100,
    benefit: "Максимальные привилегии постоянного клиента",
    icon: "👑",
    color: "#7c3aed",
    isActive: true,
    sortOrder: 4,
  },
];

export const loyaltyLevelTemplates = [
  {
    id: "coffee",
    label: "Кофейня",
    levels: [
      { name: "Новичок", minPurchases: 0, benefit: "Начальный уровень гостя", icon: "🌱", color: "#16a34a", isActive: true },
      { name: "Любитель кофе", minPurchases: 10, benefit: "Скидка 5% или маленький бонус к заказу", icon: "☕", color: "#b45309", isActive: true },
      { name: "Постоянный гость", minPurchases: 30, benefit: "Скидка 10% или подарок от кофейни", icon: "🥈", color: "#64748b", isActive: true },
      { name: "Coffee VIP", minPurchases: 60, benefit: "Особые предложения и приоритетные новинки", icon: "👑", color: "#7c3aed", isActive: true },
    ],
  },
  {
    id: "fastfood",
    label: "Шаурмичная / фастфуд",
    levels: [
      { name: "Новичок", minPurchases: 0, benefit: "Начальный уровень клиента", icon: "🌱", color: "#16a34a", isActive: true },
      { name: "Свой человек", minPurchases: 8, benefit: "Небольшой бонус к заказу", icon: "🌯", color: "#f97316", isActive: true },
      { name: "Постоянный клиент", minPurchases: 20, benefit: "Скидка или подарок по правилам точки", icon: "🔥", color: "#dc2626", isActive: true },
      { name: "Легенда точки", minPurchases: 50, benefit: "Лучшие предложения и особые подарки", icon: "👑", color: "#7c3aed", isActive: true },
    ],
  },
  {
    id: "barbershop",
    label: "Барбершоп",
    levels: [
      { name: "Новый клиент", minPurchases: 0, benefit: "Начальный уровень посещений", icon: "🌱", color: "#16a34a", isActive: true },
      { name: "Постоянный клиент", minPurchases: 5, benefit: "Персональные рекомендации и бонусы", icon: "💈", color: "#1d4ed8", isActive: true },
      { name: "Silver", minPurchases: 10, benefit: "Скидка 10% или бонусная услуга", icon: "🥈", color: "#64748b", isActive: true },
      { name: "Gold", minPurchases: 20, benefit: "Приоритетная запись и особые предложения", icon: "🥇", color: "#ca8a04", isActive: true },
    ],
  },
] satisfies { id: string; label: string; levels: Omit<LoyaltyLevelInput, "sortOrder">[] }[];

export function validateLoyaltyLevels(rawLevels: unknown): LoyaltyLevelInput[] {
  if (!Array.isArray(rawLevels)) {
    throw new Error("Передайте список уровней");
  }

  const levels = rawLevels.map((raw, index) => normalizeLevel(raw, index));
  if (levels.length === 0) {
    throw new Error("Добавьте хотя бы один уровень");
  }

  const activeLevels = levels.filter((level) => level.isActive);
  if (!activeLevels.some((level) => level.minPurchases === 0)) {
    throw new Error("Должен быть хотя бы один активный уровень от 0 покупок");
  }

  const thresholds = new Set<number>();
  for (const level of activeLevels) {
    if (thresholds.has(level.minPurchases)) {
      throw new Error("Нельзя сохранить два активных уровня с одинаковым порогом");
    }
    thresholds.add(level.minPurchases);
  }

  return [...levels].sort((a, b) => a.minPurchases - b.minPurchases || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function parseLoyaltyLevelsJson(value: string) {
  try {
    return validateLoyaltyLevels(JSON.parse(value));
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Не удалось прочитать настройки уровней");
  }
}

export function levelsForEditor(levels: LoyaltyLevelLike[]) {
  const source = levels.length > 0 ? levels : defaultLoyaltyLevels;
  return source
    .map((level, index) => ({
      id: "id" in level ? level.id : undefined,
      name: level.name,
      icon: level.icon ?? "",
      color: level.color ?? "#0f766e",
      minPurchases: level.minPurchases,
      benefit: level.benefit ?? "",
      isActive: level.isActive,
      sortOrder: level.sortOrder ?? index,
    }))
    .sort((a, b) => a.minPurchases - b.minPurchases || a.sortOrder - b.sortOrder);
}

export async function ensureDefaultLoyaltyLevels(tx: Prisma.TransactionClient, companyId: string) {
  const existing = await tx.loyaltyLevel.findMany({
    where: { companyId },
    orderBy: [{ minPurchases: "asc" }, { sortOrder: "asc" }],
  });

  if (existing.length > 0) {
    return existing;
  }

  await tx.loyaltyLevel.createMany({
    data: defaultLoyaltyLevels.map((level, index) => ({
      companyId,
      name: level.name,
      icon: level.icon,
      color: level.color,
      minPurchases: level.minPurchases,
      benefit: level.benefit,
      isActive: level.isActive,
      sortOrder: level.sortOrder ?? index,
    })),
  });

  return tx.loyaltyLevel.findMany({
    where: { companyId },
    orderBy: [{ minPurchases: "asc" }, { sortOrder: "asc" }],
  });
}

export async function replaceCompanyLoyaltyLevels(tx: Prisma.TransactionClient, companyId: string, levels: LoyaltyLevelInput[]) {
  const normalized = validateLoyaltyLevels(levels);

  await tx.loyaltyLevel.deleteMany({ where: { companyId } });
  await tx.loyaltyLevel.createMany({
    data: normalized.map((level, index) => ({
      companyId,
      name: level.name,
      icon: level.icon || null,
      color: level.color || null,
      minPurchases: level.minPurchases,
      benefit: level.benefit || null,
      isActive: level.isActive,
      sortOrder: index,
    })),
  });

  return tx.loyaltyLevel.findMany({
    where: { companyId },
    orderBy: [{ minPurchases: "asc" }, { sortOrder: "asc" }],
  });
}

export function calculateLoyaltyLevel(totalPurchases: number, levels: LoyaltyLevelLike[]) {
  const activeLevels = (levels.length > 0 ? levels : levelsForEditor([]))
    .filter((level) => level.isActive)
    .sort((a, b) => a.minPurchases - b.minPurchases || a.sortOrder - b.sortOrder);
  const current = [...activeLevels].reverse().find((level) => totalPurchases >= level.minPurchases) ?? activeLevels[0] ?? null;
  const next = current ? activeLevels.find((level) => level.minPurchases > current.minPurchases) ?? null : activeLevels[0] ?? null;
  const remainingToNext = next ? Math.max(next.minPurchases - totalPurchases, 0) : 0;
  const progressPercent = current && next
    ? Math.min(100, Math.max(0, Math.round(((totalPurchases - current.minPurchases) / Math.max(next.minPurchases - current.minPurchases, 1)) * 100)))
    : 100;

  return {
    current,
    next,
    remainingToNext,
    progressPercent,
    levels: activeLevels,
  };
}

function normalizeLevel(raw: unknown, index: number): LoyaltyLevelInput {
  const data = typeof raw === "object" && raw ? raw as Record<string, unknown> : {};
  const name = String(data.name ?? "").trim();
  const minPurchases = Number(data.minPurchases);

  if (!name) {
    throw new Error("Название уровня не должно быть пустым");
  }

  if (!Number.isInteger(minPurchases) || minPurchases < 0) {
    throw new Error("Порог уровня должен быть целым числом от 0");
  }

  return {
    id: typeof data.id === "string" ? data.id : undefined,
    name,
    icon: String(data.icon ?? "").trim() || null,
    color: String(data.color ?? "").trim() || null,
    minPurchases,
    benefit: String(data.benefit ?? "").trim() || null,
    isActive: data.isActive !== false,
    sortOrder: Number.isInteger(Number(data.sortOrder)) ? Number(data.sortOrder) : index,
  };
}

import { CompanyStatus, CompanyUserRole, LoyaltyProgramType, LoyaltyTransactionType } from "@prisma/client";

export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizePhone(value: FormDataEntryValue | string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function money(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function daysLeft(date: Date | null | undefined) {
  if (!date) {
    return 0;
  }

  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function statusLabel(status: CompanyStatus) {
  const labels: Record<CompanyStatus, string> = {
    PENDING: "Заявка",
    ACTIVE_TRIAL: "Trial",
    ACTIVE_PAID: "Оплачено",
    PAYMENT_REQUIRED: "Нужна оплата",
    BLOCKED: "Заблокирована",
    REJECTED: "Отклонена",
    DELETED: "Удалена",
  };

  return labels[status];
}

export function statusClass(status: CompanyStatus) {
  const classes: Record<CompanyStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    ACTIVE_TRIAL: "bg-sky-100 text-sky-800",
    ACTIVE_PAID: "bg-emerald-100 text-emerald-800",
    PAYMENT_REQUIRED: "bg-rose-100 text-rose-800",
    BLOCKED: "bg-zinc-200 text-zinc-800",
    REJECTED: "bg-red-100 text-red-800",
    DELETED: "bg-slate-200 text-slate-700",
  };

  return classes[status];
}

export function programTypeLabel(type: LoyaltyProgramType) {
  const labels: Record<LoyaltyProgramType, string> = {
    CLASSIC_REWARD: "Классический подарок",
    COLLECT_AND_REWARD: "Накопи и получи подарок",
    GIFT_BOX: "Коробка с подарком",
    DISCOUNT_AFTER_N: "Скидка после N покупок",
    CUSTOMER_LEVELS: "Постоянный уровень клиента",
  };

  return labels[type];
}

export function operationLabel(type: LoyaltyTransactionType) {
  const labels: Record<LoyaltyTransactionType, string> = {
    PURCHASE: "Покупка",
    REWARD_GRANTED: "Подарок выдан",
    MANUAL_ADJUSTMENT: "Ручная корректировка",
  };

  return labels[type];
}

export function companyRoleLabel(role: CompanyUserRole) {
  return role === CompanyUserRole.COMPANY_ADMIN ? "Админ" : "Кассир";
}

export function slugify(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

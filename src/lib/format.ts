import { CompanyStatus, CompanyUserRole, LoyaltyProgramType, LoyaltyTransactionType } from "@prisma/client";

export const MOSCOW_TIME_ZONE = "Europe/Moscow";

export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TIME_ZONE,
    dateStyle: "medium",
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export const formatMoscowDate = formatDate;
export const formatMoscowDateTime = formatDateTime;

export const PHONE_ALREADY_REGISTERED_MESSAGE = "Этот номер телефона уже зарегистрирован. Укажите другой номер";

export function normalizePhone(value: FormDataEntryValue | string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `7${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }

  return digits;
}

export function phoneLookupValues(value: FormDataEntryValue | string | null) {
  const normalized = normalizePhone(value);
  const rawDigits = String(value ?? "").replace(/\D/g, "");
  const values = new Set<string>();

  if (normalized) {
    values.add(normalized);
  }

  if (normalized.length === 11 && normalized.startsWith("7")) {
    values.add(`8${normalized.slice(1)}`);
    values.add(normalized.slice(1));
  }

  if (rawDigits) {
    values.add(rawDigits);
  }

  return Array.from(values);
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
    ACTIVE_TRIAL: "Пробный период",
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
    PENDING: "bg-amber-50 text-amber-900",
    ACTIVE_TRIAL: "bg-sky-50 text-sky-800",
    ACTIVE_PAID: "bg-emerald-50 text-emerald-800",
    PAYMENT_REQUIRED: "bg-red-50 text-[var(--danger)]",
    BLOCKED: "bg-zinc-100 text-zinc-800",
    REJECTED: "bg-red-50 text-[var(--danger)]",
    DELETED: "bg-slate-100 text-slate-700",
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
    LEVEL_UP: "Новый уровень",
    REWARD_OPENED: "Подарок открыт",
    REWARD_REDEEMED: "Подарок выдан",
    REWARD_GRANTED: "Подарок выдан",
    MANUAL_ADJUSTMENT: "Ручная корректировка",
  };

  return labels[type];
}

export function companyRoleLabel(role: CompanyUserRole) {
  return role === CompanyUserRole.COMPANY_ADMIN ? "Администратор" : "Кассир";
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

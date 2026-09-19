import { LoyaltyProgramType, type LoyaltyProgram } from "@prisma/client";

export const DEFAULT_CASHBACK_PERCENT_BASIS_POINTS = 200;
export const MIN_CASHBACK_PERCENT_BASIS_POINTS = 1;
export const MAX_CASHBACK_PERCENT_BASIS_POINTS = 10_000;
export const MAX_CASHBACK_PURCHASE_KOPEKS = 1_000_000_000;
export const MAX_CASHBACK_BALANCE_KOPEKS = 2_000_000_000;

export function isCashbackProgram(program: Pick<LoyaltyProgram, "programType"> | null | undefined) {
  return program?.programType === LoyaltyProgramType.CASHBACK;
}

export function parseCashbackPercentToBasisPoints(value: FormDataEntryValue | string | null | undefined) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const percent = Number(normalized);
  const basisPoints = Math.round(percent * 100);

  if (
    !Number.isFinite(percent) ||
    !Number.isInteger(basisPoints) ||
    basisPoints < MIN_CASHBACK_PERCENT_BASIS_POINTS ||
    basisPoints > MAX_CASHBACK_PERCENT_BASIS_POINTS
  ) {
    throw new Error("Укажите кешбэк от 0,01% до 100% (не более двух знаков после запятой)");
  }

  return basisPoints;
}

export function formatCashbackPercent(basisPoints: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(basisPoints / 100);
}

export function calculateCashbackPurchase({
  purchaseAmountKopeks,
  redeemAmountKopeks,
  balanceKopeks,
  cashbackPercentBasisPoints,
}: {
  purchaseAmountKopeks: number;
  redeemAmountKopeks: number;
  balanceKopeks: number;
  cashbackPercentBasisPoints: number;
}) {
  if (!Number.isInteger(purchaseAmountKopeks) || purchaseAmountKopeks <= 0) {
    throw new Error("Укажите сумму покупки больше 0 рублей");
  }
  if (purchaseAmountKopeks > MAX_CASHBACK_PURCHASE_KOPEKS) {
    throw new Error("Сумма покупки слишком большая. Максимум — 10 000 000 рублей");
  }
  if (!Number.isInteger(redeemAmountKopeks) || redeemAmountKopeks < 0) {
    throw new Error("Сумма списания должна быть неотрицательной");
  }
  if (redeemAmountKopeks > balanceKopeks) {
    throw new Error("На балансе клиента недостаточно средств для такого списания");
  }
  if (redeemAmountKopeks > purchaseAmountKopeks) {
    throw new Error("Нельзя списать больше суммы покупки");
  }
  if (
    !Number.isInteger(cashbackPercentBasisPoints) ||
    cashbackPercentBasisPoints < MIN_CASHBACK_PERCENT_BASIS_POINTS ||
    cashbackPercentBasisPoints > MAX_CASHBACK_PERCENT_BASIS_POINTS
  ) {
    throw new Error("Процент кешбэка в настройках компании некорректен");
  }

  const paidAmountKopeks = purchaseAmountKopeks - redeemAmountKopeks;
  const cashbackEarnedKopeks = Math.floor(
    (paidAmountKopeks * cashbackPercentBasisPoints) / 10_000,
  );
  const balanceAfterKopeks = balanceKopeks - redeemAmountKopeks + cashbackEarnedKopeks;

  if (balanceAfterKopeks > MAX_CASHBACK_BALANCE_KOPEKS) {
    throw new Error("Баланс клиента достиг технического лимита. Обратитесь в поддержку");
  }

  return {
    purchaseAmountKopeks,
    paidAmountKopeks,
    cashbackEarnedKopeks,
    cashbackRedeemedKopeks: redeemAmountKopeks,
    balanceBeforeKopeks: balanceKopeks,
    balanceAfterKopeks,
  };
}

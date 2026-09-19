import { ConfirmSubmit } from "@/components/confirm-submit";
import { formatCashbackPercent } from "@/lib/cashback";
import { formatKopeks } from "@/lib/raffles";

type ActiveRaffle = {
  title: string;
  minPurchaseAmountKopeks: number;
} | null;

export function PurchaseControls({
  maxQuantity,
  activeRaffle,
  title,
  confirmText,
  buttonText,
  cashback,
}: {
  maxQuantity: number;
  activeRaffle: ActiveRaffle;
  title: string;
  confirmText: string;
  buttonText: string;
  cashback?: {
    balanceKopeks: number;
    percentBasisPoints: number;
  } | null;
}) {
  if (maxQuantity <= 0) {
    return (
      <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        Сейчас этому клиенту нельзя провести ещё одну операцию: достигнут дневной лимит или уже доступен подарок.
      </div>
    );
  }

  const isCashback = Boolean(cashback);

  return (
    <div className="space-y-3">
      {isCashback ? (
        <>
          <input type="hidden" name="quantity" value="1" />
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <p className="font-extrabold">Баланс клиента: {formatKopeks(cashback!.balanceKopeks)}</p>
            <p className="mt-1">Начисление: {formatCashbackPercent(cashback!.percentBasisPoints)}% от суммы, оплаченной деньгами.</p>
          </div>
        </>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[var(--text)]">Покупок в чеке</span>
          <input
            type="number"
            name="quantity"
            min={1}
            max={maxQuantity}
            defaultValue={1}
            inputMode="numeric"
            className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base font-semibold text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
          />
          <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">Доступно сейчас: до {maxQuantity}</span>
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[var(--text)]">Сумма покупки, руб.</span>
        <input
          name="purchaseAmount"
          type="number"
          inputMode="decimal"
          min={isCashback ? "0.01" : "0"}
          max="10000000"
          step="0.01"
          placeholder="Например, 450"
          required={isCashback}
          className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base font-semibold text-[var(--text)] outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
        />
        <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">
          {isCashback
            ? "Укажите полную сумму чека до списания кешбэка."
            : activeRaffle
              ? `Для участия в розыгрыше «${activeRaffle.title}» нужен чек от ${formatKopeks(activeRaffle.minPurchaseAmountKopeks)}. Без суммы покупка всё равно начислится, но билет не создастся.`
              : "Поле можно оставить пустым: покупка начислится без суммы чека."}
        </span>
      </label>

      {isCashback && (
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-[var(--text)]">Списать с баланса, руб.</span>
          <input
            name="redeemAmount"
            type="number"
            inputMode="decimal"
            min="0"
            max={(cashback!.balanceKopeks / 100).toFixed(2)}
            step="0.01"
            defaultValue="0"
            disabled={cashback!.balanceKopeks <= 0}
            className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-base font-semibold text-[var(--text)] outline-none disabled:bg-[var(--inactive)] disabled:text-[var(--text-muted)] focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
          />
          <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">
            {cashback!.balanceKopeks > 0
              ? `Можно списать не больше ${formatKopeks(cashback!.balanceKopeks)} и не больше суммы чека.`
              : "На балансе пока нет средств для списания."}
          </span>
        </label>
      )}

      <ConfirmSubmit title={title} confirmText={confirmText} buttonText={buttonText} />
    </div>
  );
}

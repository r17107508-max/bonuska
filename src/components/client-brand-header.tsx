import Link from "next/link";
import { Bell, Gift } from "lucide-react";

export function ClientBrandHeader({
  greeting = "ПроПлюшка",
  showNotifications = false,
}: {
  greeting?: string;
  showNotifications?: boolean;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3">
      <Link
        href="/app"
        className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 text-base font-extrabold text-[var(--text)] shadow-sm"
        aria-label="На главную"
      >
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Gift className="size-4" />
        </span>
        <span className="truncate">{greeting}</span>
      </Link>

      {showNotifications && (
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-white text-[var(--text)] shadow-sm"
          aria-label="Уведомления"
        >
          <Bell aria-hidden className="size-5" />
        </button>
      )}
    </header>
  );
}

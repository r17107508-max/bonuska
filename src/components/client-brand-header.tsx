import Link from "next/link";
import { Gift } from "lucide-react";

export function ClientBrandHeader() {
  return (
    <header className="flex min-h-9 items-center justify-between">
      <Link
        href="/app"
        className="inline-flex min-h-9 items-center gap-2 rounded-[14px] border border-[var(--border)] bg-white px-2.5 text-base font-extrabold text-[var(--text)] shadow-sm"
      >
        <span aria-hidden className="flex size-6 items-center justify-center rounded-[10px] bg-[var(--brand-soft)] text-[var(--brand)]">
          <Gift className="size-4" />
        </span>
        <span>ПроПлюшка</span>
      </Link>
    </header>
  );
}

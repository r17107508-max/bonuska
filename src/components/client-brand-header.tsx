import Link from "next/link";

export function ClientBrandHeader() {
  return (
    <header className="flex min-h-9 items-center justify-between">
      <Link
        href="/app"
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-200 bg-[#fffdf8] px-2.5 text-base font-semibold text-[#2f1d13] shadow-sm"
      >
        <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-amber-100 text-sm">
          🥯
        </span>
        <span>ПроПлюшка</span>
      </Link>
    </header>
  );
}

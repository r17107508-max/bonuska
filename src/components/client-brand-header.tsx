import Link from "next/link";

export function ClientBrandHeader() {
  return (
    <header className="flex min-h-10 items-center justify-between">
      <Link
        href="/app"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-xl font-semibold text-slate-950 shadow-sm"
      >
        <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-amber-100 text-base">
          🥯
        </span>
        <span>ПроПлюшка</span>
      </Link>
    </header>
  );
}

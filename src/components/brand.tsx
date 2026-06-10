import { Gift } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
        <Gift aria-hidden className="size-5" />
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-950">Бонуска</p>
        {!compact && <p className="text-sm font-medium text-slate-500">QR-лояльность для малого бизнеса</p>}
      </div>
    </div>
  );
}

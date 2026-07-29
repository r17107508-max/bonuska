"use client";

import { RotateCcw } from "lucide-react";
import { ClientShell } from "@/components/client-ui";

export default function ClientAppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ClientShell>
      <section className="rounded-3xl border border-red-200 bg-white p-5 text-center shadow-sm">
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Не удалось загрузить экран</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Проверьте соединение и попробуйте ещё раз.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white"
        >
          <RotateCcw aria-hidden className="size-4" />
          Повторить
        </button>
      </section>
    </ClientShell>
  );
}

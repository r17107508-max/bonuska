"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmit({
  title,
  confirmText,
  buttonText,
  confirmButtonText = "Подтвердить",
  danger = false,
}: {
  title: string;
  confirmText: string;
  buttonText: string;
  confirmButtonText?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 ${
          danger ? "bg-[var(--danger)] hover:bg-red-800" : "bg-[var(--brand-strong)] hover:bg-[var(--brand)]"
        }`}
      >
        {buttonText}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl"
            style={{ maxHeight: "calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}
          >
            <div className="overflow-y-auto p-5">
              <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
              <p className="mt-2 text-[var(--text-muted)]">{confirmText}</p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[var(--border)] bg-white p-5">
              <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-xl border border-[var(--border)] bg-white px-4 font-bold text-[var(--text)] disabled:opacity-60">
                Отмена
              </button>
              <ModalSubmitButton danger={danger} confirmButtonText={confirmButtonText} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalSubmitButton({
  danger,
  confirmButtonText,
}: {
  danger: boolean;
  confirmButtonText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-12 rounded-xl px-4 font-bold text-white disabled:opacity-60 ${
        danger ? "bg-[var(--danger)]" : "bg-[var(--brand-strong)]"
      }`}
    >
      {pending ? "Отправляем..." : confirmButtonText}
    </button>
  );
}

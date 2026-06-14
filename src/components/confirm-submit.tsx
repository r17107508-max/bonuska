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
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-lg px-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 ${
          danger ? "bg-red-700 hover:bg-red-800" : "bg-teal-700 hover:bg-teal-800"
        }`}
      >
        {buttonText}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            style={{ maxHeight: "calc(100dvh - 2rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}
          >
            <div className="overflow-y-auto p-5">
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-slate-600">{confirmText}</p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-100 bg-white p-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-12 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-60"
              >
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
      className={`min-h-12 rounded-lg px-4 font-semibold text-white disabled:opacity-60 ${
        danger ? "bg-red-700" : "bg-teal-700"
      }`}
    >
      {pending ? "Отправляем..." : confirmButtonText}
    </button>
  );
}

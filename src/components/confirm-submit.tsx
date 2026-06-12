"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmit({
  title,
  confirmText,
  buttonText,
  danger = false,
}: {
  title: string;
  confirmText: string;
  buttonText: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-lg px-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 ${
          danger ? "bg-red-700 hover:bg-red-800" : "bg-teal-700 hover:bg-teal-800"
        }`}
      >
        {locked ? "Подтверждаем..." : buttonText}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-slate-600">{confirmText}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={locked}
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-60"
              >
                Отмена
              </button>
              <ModalSubmitButton danger={danger} locked={locked} onLock={() => setLocked(true)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalSubmitButton({
  danger,
  locked,
  onLock,
}: {
  danger: boolean;
  locked: boolean;
  onLock: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || locked}
      onClick={onLock}
      className={`min-h-11 rounded-lg px-4 font-semibold text-white disabled:opacity-60 ${
        danger ? "bg-red-700" : "bg-teal-700"
      }`}
    >
      {pending || locked ? "Отправляем..." : "Подтвердить"}
    </button>
  );
}

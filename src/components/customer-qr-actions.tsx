"use client";

import { Download, WalletCards } from "lucide-react";

type CustomerQrActionsProps = {
  qrDataUrl: string;
  companyName: string;
};

function fileName(value: string) {
  return `${value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "") || "loyalty"}-qr.png`;
}

export function CustomerQrActions({ qrDataUrl, companyName }: CustomerQrActionsProps) {
  function downloadQr() {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = fileName(companyName);
    link.click();
  }

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <WalletCards aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-950">QR для быстрого предъявления</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Скачайте QR-код и добавьте изображение в избранное, галерею или приложение-кошелёк на телефоне. Для просмотра прогресса открывайте кабинет.
          </p>
          <button
            type="button"
            onClick={downloadQr}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700"
          >
            <Download aria-hidden className="size-5" />
            Скачать QR-код
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Download } from "lucide-react";

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
    <div className="mt-3">
      <button
        type="button"
        onClick={downloadQr}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
      >
        <Download aria-hidden className="size-4" />
        Скачать QR
      </button>
    </div>
  );
}

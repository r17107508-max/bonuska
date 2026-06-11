"use client";

import { Copy, Download, Printer } from "lucide-react";

type RegistrationQrPosterProps = {
  companyName: string;
  clientUrl: string;
  qrDataUrl: string;
  rewardTitle?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function posterHtml({ companyName, clientUrl, qrDataUrl, rewardTitle }: RegistrationQrPosterProps) {
  const safeCompanyName = escapeHtml(companyName);
  const safeClientUrl = escapeHtml(clientUrl);
  const safeRewardTitle = escapeHtml(rewardTitle || "Зарегистрируйтесь в программе лояльности компании.");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>QR для регистрации клиентов</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a; }
    .poster { width: 720px; max-width: 92vw; border: 2px solid #0f766e; border-radius: 28px; background: white; padding: 44px; text-align: center; }
    .badge { display: inline-block; border-radius: 999px; background: #ccfbf1; color: #115e59; padding: 10px 18px; font-weight: 700; }
    h1 { margin: 26px 0 12px; font-size: 42px; line-height: 1.08; }
    p { margin: 0; font-size: 22px; line-height: 1.4; color: #475569; }
    img { width: 360px; height: 360px; margin: 34px auto 24px; display: block; }
    .url { margin-top: 18px; font-size: 18px; color: #0f766e; word-break: break-all; }
    .brand { margin-top: 28px; font-size: 18px; font-weight: 700; color: #0f766e; }
    @media print {
      body { background: white; }
      .poster { width: 100%; max-width: none; border-radius: 0; border: 0; }
    }
  </style>
</head>
<body>
  <main class="poster">
    <div class="badge">${safeCompanyName}</div>
    <h1>Сканируйте QR<br />и получите бонусы</h1>
    <p>${safeRewardTitle}</p>
    <img src="${qrDataUrl}" alt="QR-код для регистрации" />
    <p>Откройте камеру телефона и наведите на QR-код.</p>
    <div class="url">${safeClientUrl}</div>
    <div class="brand">ПроПлюшка</div>
  </main>
</body>
</html>`;
}

export function RegistrationQrPoster(props: RegistrationQrPosterProps) {
  async function copyLink() {
    await navigator.clipboard.writeText(props.clientUrl);
  }

  function downloadQr() {
    const link = document.createElement("a");
    link.href = props.qrDataUrl;
    link.download = `${props.companyName.toLowerCase().replace(/\s+/g, "-")}-registration-qr.png`;
    link.click();
  }

  function printPoster() {
    const printWindow = window.open("", "_blank", "width=900,height=900");
    if (!printWindow) {
      return;
    }
    printWindow.document.write(posterHtml(props));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 300);
  }

  return (
    <section className="panel p-5">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <img src={props.qrDataUrl} alt="QR для регистрации клиентов" className="mx-auto aspect-square w-full max-w-[220px]" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-slate-500">QR для клиентов</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Регистрация в программе лояльности</h2>
          <p className="mt-2 text-slate-600">
            Распечатайте QR и поставьте его на стойку. Клиент сканирует код, попадает на страницу вашей компании и регистрируется в программе лояльности.
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700 break-all">{props.clientUrl}</div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={printPoster} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 font-semibold text-white">
              <Printer aria-hidden className="size-5" />
              Печать плаката
            </button>
            <button type="button" onClick={downloadQr} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700">
              <Download aria-hidden className="size-5" />
              Скачать QR
            </button>
            <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700">
              <Copy aria-hidden className="size-5" />
              Скопировать ссылку
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

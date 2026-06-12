"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Keyboard, ScanLine } from "lucide-react";

function normalizeScanToken(value: string) {
  return decodeURIComponent(value).trim();
}

export function QrScanner() {
  const router = useRouter();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState("Запускаем камеру...");

  useEffect(() => {
    let mounted = true;
    let scanned = false;

    async function start() {
      if (!window.isSecureContext) {
        setStatus("Камера на телефоне требует HTTPS. Если камера не открылась, вставьте QR-токен вручную ниже.");
        return;
      }

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            if (scanned) {
              return;
            }
            const token = normalizeScanToken(decodedText);
            if (token) {
              scanned = true;
              setStatus("QR найден. Открываем карту клиента...");
              scanner.stop().catch(() => undefined);
              router.push(`/company/scan?token=${encodeURIComponent(token)}`);
            }
          },
          () => undefined,
        );

        if (mounted) {
          setStatus("Наведите камеру на QR-код клиента");
        }
      } catch {
        if (mounted) {
          setStatus("Камера не запустилась. Разрешите доступ к камере или введите QR-токен вручную.");
        }
      }
    }

    start();

    return () => {
      mounted = false;
      try {
        scannerRef.current?.stop().catch(() => undefined);
        scannerRef.current?.clear();
      } catch {
        // Scanner may already be stopped during route change.
      }
    };
  }, [router]);

  function openManualClient() {
    const token = normalizeScanToken(manualValue);
    if (token) {
      router.push(`/company/scan?token=${encodeURIComponent(token)}`);
    }
  }

  return (
    <div className="space-y-5">
      <section className="panel p-4">
        <div className="mb-4 flex items-center gap-3 text-slate-700">
          <div className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <ScanLine aria-hidden className="size-5" />
          </div>
          <div>
            <p className="font-semibold">{status}</p>
            <p className="mt-1 text-sm text-slate-500">Попросите клиента открыть Проплюшки и показать общий QR-код.</p>
          </div>
        </div>
        <div
          id="qr-reader"
          className="overflow-hidden rounded-lg bg-slate-950 [&_button]:rounded-lg [&_button]:bg-teal-700 [&_button]:px-3 [&_button]:py-2 [&_button]:font-semibold [&_button]:text-white"
        />
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <Keyboard aria-hidden className="size-5" />
          <h2 className="font-semibold">Если камера не работает</h2>
        </div>
        <p className="mb-3 text-sm text-slate-600">Введите полный QR-токен клиента, старый `proplushki:user:...` или токен карты `tega:...` вручную.</p>
        <input
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder="proplushki:session:... или tega:..."
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
        />
        <button
          type="button"
          onClick={openManualClient}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 font-semibold text-white"
        >
          <Camera aria-hidden className="size-5" />
          Открыть клиента
        </button>
      </section>
    </div>
  );
}

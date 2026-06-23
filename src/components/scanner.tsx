"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Keyboard, ScanLine } from "lucide-react";

const CAMERA_STORAGE_KEY = "proplushka-preferred-camera-id";

function normalizeScanToken(value: string) {
  return decodeURIComponent(value).trim();
}

export function QrScanner() {
  const router = useRouter();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const scannedRef = useRef(false);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState("Камера выключена. Включите сканер, когда будете готовы.");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      isStartingRef.current = false;
      scannedRef.current = false;

      if (scanner) {
        scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // Scanner may already be stopped during route change.
            }
          });
      }
    };
  }, []);

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    scannedRef.current = false;

    if (!scanner) {
      setIsCameraActive(false);
      setStatus("Камера выключена. Включите сканер, когда будете готовы.");
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped after a successful scan.
    }

    try {
      scanner.clear();
    } catch {
      // Ignore cleanup errors from html5-qrcode.
    }

    setIsCameraActive(false);
    setStatus("Камера выключена. Включите сканер, когда будете готовы.");
  }

  async function startScanner() {
    if (isStartingRef.current || scannerRef.current) {
      return;
    }

    if (!window.isSecureContext) {
      setStatus("Камера на телефоне требует HTTPS. Если камера не открылась, вставьте QR-токен вручную ниже.");
      return;
    }

    isStartingRef.current = true;
    scannedRef.current = false;
    setIsStarting(true);
    setStatus("Запускаем камеру...");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      const savedCameraId = window.localStorage.getItem(CAMERA_STORAGE_KEY);
      const cameraConfig: string | MediaTrackConstraints = savedCameraId || { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (scannedRef.current) {
            return;
          }
          const token = normalizeScanToken(decodedText);
          if (token) {
            scannedRef.current = true;
            setStatus("QR найден. Открываем карту клиента...");
            scanner
              .stop()
              .catch(() => undefined)
              .finally(() => {
                try {
                  scanner.clear();
                } catch {
                  // Scanner may already be cleared during navigation.
                }
              });
            scannerRef.current = null;
            setIsCameraActive(false);
            router.push(`/company/scan?token=${encodeURIComponent(token)}`);
          }
        },
        () => undefined,
      );

      const deviceId = scanner.getRunningTrackSettings().deviceId;
      if (deviceId) {
        window.localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
      }

      setIsCameraActive(true);
      setStatus("Наведите камеру на QR-код клиента");
    } catch {
      window.localStorage.removeItem(CAMERA_STORAGE_KEY);
      scannerRef.current = null;
      setIsCameraActive(false);
      setStatus("Камера не запустилась. Разрешите доступ к камере или введите QR-токен вручную.");
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }

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
            <p className="mt-1 text-sm text-slate-500">Попросите клиента открыть приложение «ПроПлюшка» и показать общий QR-код.</p>
          </div>
        </div>
        <div
          id="qr-reader"
          className="overflow-hidden rounded-lg bg-slate-950 [&_button]:rounded-lg [&_button]:bg-teal-700 [&_button]:px-3 [&_button]:py-2 [&_button]:font-semibold [&_button]:text-white"
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={startScanner}
            disabled={isStarting || isCameraActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanLine aria-hidden className="size-5" />
            {isStarting ? "Запускаем..." : "Включить сканер"}
          </button>
          <button
            type="button"
            onClick={stopScanner}
            disabled={!isCameraActive && !isStarting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Остановить камеру
          </button>
        </div>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <Keyboard aria-hidden className="size-5" />
          <h2 className="font-semibold">Если камера не работает</h2>
        </div>
        <p className="mb-3 text-sm text-slate-600">Вставьте значение из QR-кода клиента целиком, если камера не смогла считать код.</p>
        <input
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder="QR-токен клиента"
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

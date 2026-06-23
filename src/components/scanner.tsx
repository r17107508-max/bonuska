"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ExternalLink, Image as ImageIcon, Keyboard, ScanLine, Square } from "lucide-react";
import { looksLikeManualScanCode } from "@/lib/scan-codes";

const CAMERA_STORAGE_KEY = "proplushka-preferred-camera-id";
const QR_READER_ID = "qr-reader";
const QR_FILE_READER_ID = "qr-file-reader";

function normalizeScanToken(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function isIosDevice() {
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };

  return standaloneNavigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Разрешение камеры не выдано";
  }

  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") {
    return "Камера недоступна";
  }

  return "Камера недоступна";
}

export function QrScanner() {
  const router = useRouter();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isCameraActiveRef = useRef(false);
  const scannedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState("");
  const [status, setStatus] = useState("Камера выключена");
  const [isStarting, setIsStarting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showIosPwaHint, setShowIosPwaHint] = useState(false);
  const [safariHref, setSafariHref] = useState("/company/scan");

  useEffect(() => {
    const diagnosticsTimer = window.setTimeout(() => {
      setShowIosPwaHint(isIosDevice() && isStandalonePwa());
      setSafariHref(`${window.location.origin}/company/scan`);
    }, 0);

    return () => {
      window.clearTimeout(diagnosticsTimer);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      isStartingRef.current = false;
      isCameraActiveRef.current = false;
      scannedRef.current = false;

      if (scanner) {
        scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // Scanner can already be cleared while navigating away.
            }
          });
      }
    };
  }, []);

  async function stopScanner(nextStatus = "Сканер выключен") {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    isCameraActiveRef.current = false;
    scannedRef.current = false;
    setIsCameraActive(false);

    if (!scanner) {
      setStatus(nextStatus);
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // html5-qrcode rejects when stop is called after it has already stopped.
    }

    try {
      scanner.clear();
    } catch {
      // The reader node may be gone during a route transition.
    }

    setStatus(nextStatus);
  }

  function openScannedToken(decodedText: string, source: "camera" | "manual" | "file") {
    const token = normalizeScanToken(decodedText);

    if (!token) {
      return;
    }

    const sourceParam = source === "manual" ? "&source=manual" : source === "file" ? "&source=file" : "";
    router.push(`/company/scan?token=${encodeURIComponent(token)}${sourceParam}`);
  }

  function persistActiveDeviceId() {
    const scanner = scannerRef.current;
    const deviceId = scanner?.getRunningTrackSettings().deviceId;

    if (deviceId) {
      window.localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
    }
  }

  async function startScanner() {
    if (isStartingRef.current || isCameraActiveRef.current) {
      return;
    }

    setManualError("");

    if (!window.isSecureContext) {
      setStatus("Камера на телефоне требует HTTPS");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Камера недоступна");
      return;
    }

    try {
      isStartingRef.current = true;
      setIsStarting(true);
      scannedRef.current = false;
      setStatus("Запрашиваем доступ к камере...");

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = scannerRef.current ?? new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;

      const savedCameraId = showIosPwaHint ? null : window.localStorage.getItem(CAMERA_STORAGE_KEY);
      const cameraConfig: string | MediaTrackConstraints = savedCameraId || { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (scannedRef.current) {
            return;
          }

          scannedRef.current = true;
          setStatus("QR найден. Открываем карту клиента...");
          void stopScanner("QR найден").finally(() => openScannedToken(decodedText, "camera"));
        },
        () => undefined,
      );

      isCameraActiveRef.current = true;
      setIsCameraActive(true);
      setStatus("Наведите камеру на QR-код клиента");
      persistActiveDeviceId();
    } catch (error) {
      window.localStorage.removeItem(CAMERA_STORAGE_KEY);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      isCameraActiveRef.current = false;
      setIsCameraActive(false);

      try {
        scanner?.clear();
      } catch {
        // Nothing to clear after a failed start.
      }

      setStatus(cameraErrorMessage(error));
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }

  function openManualClient() {
    const token = normalizeScanToken(manualValue);

    if (!token) {
      setManualError("Введите код клиента");
      return;
    }

    setManualError("");
    openScannedToken(token, "manual");
  }

  async function scanImage(file: File) {
    setManualError("");
    setStatus("Распознаём QR на изображении...");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const fileScanner = new Html5Qrcode(QR_FILE_READER_ID);
      const decodedText = await fileScanner.scanFile(file, false);

      try {
        fileScanner.clear();
      } catch {
        // The file scanner has no active camera stream.
      }

      openScannedToken(decodedText, "file");
    } catch {
      setManualError("QR на изображении не распознан");
      setStatus(isCameraActiveRef.current ? "Наведите камеру на QR-код клиента" : "Камера выключена");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const manualHint = looksLikeManualScanCode(manualValue)
    ? "Код выглядит корректно. Нажмите «Найти клиента»."
    : "Введите код под QR клиента, например C-1A2B3C4D.";

  return (
    <div className="space-y-5">
      {showIosPwaHint && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
          <p className="font-semibold">На iPhone установленное веб-приложение может повторно запрашивать доступ к камере.</p>
          <p className="mt-1">
            Это ограничение iOS. Чтобы ускорить работу, можно открыть сканер в Safari или использовать ручной ввод кода.
          </p>
          <a
            href={safariHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 font-semibold text-white"
          >
            <ExternalLink aria-hidden className="size-4" />
            Открыть сканер в Safari
          </a>
        </section>
      )}

      <section className="panel p-4">
        <div className="mb-4 flex items-center gap-3 text-slate-700">
          <div className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <ScanLine aria-hidden className="size-5" />
          </div>
          <div>
            <p className="font-semibold">{status}</p>
            <p className="mt-1 text-sm text-slate-500">Камера включается только после нажатия кнопки.</p>
          </div>
        </div>

        <div
          id={QR_READER_ID}
          className="min-h-0 overflow-hidden rounded-lg bg-slate-950 [&_button]:rounded-lg [&_button]:bg-teal-700 [&_button]:px-3 [&_button]:py-2 [&_button]:font-semibold [&_button]:text-white"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void startScanner()}
            disabled={isStarting || isCameraActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera aria-hidden className="size-5" />
            {isStarting ? "Включаем..." : "Включить сканер"}
          </button>
          <button
            type="button"
            onClick={() => void stopScanner()}
            disabled={!isCameraActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square aria-hidden className="size-4" />
            Остановить
          </button>
        </div>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <Keyboard aria-hidden className="size-5" />
          <h2 className="font-semibold">Ввести код клиента вручную</h2>
        </div>
        <p className="mb-3 text-sm text-slate-600">
          Попросите клиента назвать код под QR-кодом. Для подарка используйте код под QR подарка.
        </p>
        <input
          value={manualValue}
          onChange={(event) => {
            setManualValue(event.target.value.toUpperCase());
            setManualError("");
          }}
          placeholder="C-1A2B3C4D"
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-lg uppercase tracking-normal outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
        />
        <p className="mt-2 text-xs font-semibold text-slate-500">{manualHint}</p>
        {manualError && <p className="mt-2 text-sm font-semibold text-red-700">{manualError}</p>}
        <button
          type="button"
          onClick={openManualClient}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 font-semibold text-white"
        >
          <Keyboard aria-hidden className="size-5" />
          Найти клиента
        </button>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <ImageIcon aria-hidden className="size-5" />
          <h2 className="font-semibold">Загрузить QR из галереи</h2>
        </div>
        <p className="mb-3 text-sm text-slate-600">Если клиент прислал фото QR, выберите изображение без включения камеры.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void scanImage(file);
            }
          }}
          className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700"
        />
        <div id={QR_FILE_READER_ID} className="hidden" />
      </section>
    </div>
  );
}

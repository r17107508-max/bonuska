"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ExternalLink, Image as ImageIcon, Keyboard, ScanLine, Square } from "lucide-react";
import { looksLikeManualScanCode } from "@/lib/scan-codes";

const CAMERA_STORAGE_KEY = "proplushka-preferred-camera-id";
const QR_READER_ID = "qr-reader";
const QR_FILE_READER_ID = "qr-file-reader";

type ScannerState = "idle" | "requesting" | "active" | "denied" | "recognized" | "invalid" | "error";

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

function resolveCameraState(error: unknown): { state: ScannerState; message: string } {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return { state: "denied", message: "Разрешение на камеру запрещено" };
  }

  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") {
    return { state: "error", message: "Камера недоступна на этом устройстве" };
  }

  return { state: "error", message: "Ошибка камеры" };
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
  const [state, setState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState("Камера ещё не запущена");
  const [isStarting, setIsStarting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showIosPwaHint, setShowIosPwaHint] = useState(false);
  const [safariHref, setSafariHref] = useState("/company/scan");

  useEffect(() => {
    const diagnosticsTimer = window.setTimeout(() => {
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
              // Scanner may already be cleared during navigation.
            }
          });
      }
    };
  }, []);

  async function stopScanner(nextState: ScannerState = "idle", nextMessage = "Камера остановлена") {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    isCameraActiveRef.current = false;
    scannedRef.current = false;
    setIsCameraActive(false);

    if (!scanner) {
      setState(nextState);
      setMessage(nextMessage);
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // html5-qrcode rejects if stop is called after the stream is already stopped.
    }

    try {
      scanner.clear();
    } catch {
      // The reader node may be gone during a route transition.
    }

    setState(nextState);
    setMessage(nextMessage);
  }

  function openScannedToken(decodedText: string, source: "camera" | "manual" | "file") {
    const token = normalizeScanToken(decodedText);

    if (!token) {
      setState("invalid");
      setMessage("QR недействителен");
      return;
    }

    const sourceParam = source === "manual" ? "&source=manual" : source === "file" ? "&source=file" : "";
    router.push(`/company/scan?token=${encodeURIComponent(token)}${sourceParam}`);
  }

  async function startScanner() {
    if (isStartingRef.current || isCameraActiveRef.current) {
      return;
    }

    setManualError("");

    if (!window.isSecureContext) {
      setState("error");
      setMessage("Камере нужен HTTPS");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setMessage("Камера недоступна");
      return;
    }

    try {
      isStartingRef.current = true;
      setIsStarting(true);
      scannedRef.current = false;
      setState("requesting");
      setMessage("Запрашиваем разрешение на камеру");

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = scannerRef.current ?? new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;

      const savedCameraId = window.localStorage.getItem(CAMERA_STORAGE_KEY);
      const cameraConfig: string | MediaTrackConstraints = savedCameraId || { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 280, height: 280 } },
        (decodedText) => {
          if (scannedRef.current) {
            return;
          }

          scannedRef.current = true;
          setState("recognized");
          setMessage("QR распознан");
          void stopScanner("recognized", "QR распознан").finally(() => openScannedToken(decodedText, "camera"));
        },
        () => undefined,
      );

      const deviceId = scanner.getRunningTrackSettings().deviceId;
      if (deviceId) {
        window.localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
      }

      isCameraActiveRef.current = true;
      setIsCameraActive(true);
      setState("active");
      setMessage("Камера работает. Наведите на QR-код клиента");
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

      const resolved = resolveCameraState(error);
      setState(resolved.state);
      setMessage(resolved.message);
      setShowIosPwaHint(isIosDevice() && isStandalonePwa());
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }

  function openManualClient() {
    const token = normalizeScanToken(manualValue);

    if (!token) {
      setManualError("Введите код клиента или подарка");
      return;
    }

    setManualError("");
    openScannedToken(token, "manual");
  }

  async function scanImage(file: File) {
    setManualError("");
    setState("requesting");
    setMessage("Распознаём QR на изображении");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const fileScanner = new Html5Qrcode(QR_FILE_READER_ID);
      const decodedText = await fileScanner.scanFile(file, false);

      try {
        fileScanner.clear();
      } catch {
        // The file scanner has no active camera stream.
      }

      setState("recognized");
      setMessage("QR распознан");
      openScannedToken(decodedText, "file");
    } catch {
      setManualError("QR на изображении не распознан");
      setState("invalid");
      setMessage("QR недействителен");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const manualHint = looksLikeManualScanCode(manualValue)
    ? "Код выглядит корректно. Нажмите «Найти»."
    : "Введите код под QR клиента или подарка, например C-1A2B3C4D.";

  return (
    <div className="space-y-4">
      {showIosPwaHint && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
          <p className="font-bold">На iPhone PWA может повторно спрашивать доступ к камере.</p>
          <p className="mt-1">Откройте сканер в Safari, если камера не запускается.</p>
          <a href={safariHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-4 font-bold text-white">
            <ExternalLink aria-hidden className="size-4" />
            Открыть в Safari
          </a>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
            <ScanLine aria-hidden className="size-5" />
          </div>
          <div>
            <p className="font-extrabold text-[var(--text)]">{scannerStateLabel(state)}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{message}</p>
          </div>
        </div>

        <div
          id={QR_READER_ID}
          className="min-h-[360px] bg-slate-950 [&_button]:rounded-xl [&_button]:bg-[var(--brand-strong)] [&_button]:px-3 [&_button]:py-2 [&_button]:font-bold [&_button]:text-white"
        />

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void startScanner()}
            disabled={isStarting || isCameraActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera aria-hidden className="size-5" />
            {isStarting ? "Включаем..." : "Включить камеру"}
          </button>
          <button
            type="button"
            onClick={() => void stopScanner()}
            disabled={!isCameraActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 font-bold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square aria-hidden className="size-4" />
            Остановить
          </button>
        </div>
      </section>

      <details className="panel overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-extrabold text-[var(--text)] [&::-webkit-details-marker]:hidden">
          <Keyboard aria-hidden className="size-5 text-[var(--brand-strong)]" />
          Не удалось отсканировать?
        </summary>
        <div className="grid gap-4 border-t border-[var(--border)] p-4 lg:grid-cols-2">
          <section>
            <h2 className="font-extrabold text-[var(--text)]">Ручной код</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Попросите клиента назвать код под QR.</p>
            <input
              value={manualValue}
              onChange={(event) => {
                setManualValue(event.target.value.toUpperCase());
                setManualError("");
              }}
              placeholder="C-1A2B3C4D"
              className="mt-3 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 font-mono text-lg uppercase tracking-normal outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
            />
            <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">{manualHint}</p>
            {manualError && <p className="mt-2 text-sm font-bold text-[var(--danger)]">{manualError}</p>}
            <button type="button" onClick={openManualClient} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-strong)] px-4 font-bold text-white">
              <Keyboard aria-hidden className="size-5" />
              Найти
            </button>
          </section>

          <section>
            <h2 className="font-extrabold text-[var(--text)]">QR из галереи</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Загрузите изображение, если QR прислали фото.</p>
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
              className="mt-3 block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--inactive)] file:px-3 file:py-2 file:font-bold file:text-[var(--text)]"
            />
            <ImageIcon aria-hidden className="mt-3 size-5 text-[var(--text-muted)]" />
            <div id={QR_FILE_READER_ID} className="hidden" />
          </section>
        </div>
      </details>
    </div>
  );
}

function scannerStateLabel(state: ScannerState) {
  const labels: Record<ScannerState, string> = {
    idle: "Камера ещё не запущена",
    requesting: "Запрос разрешения",
    active: "Камера работает",
    denied: "Разрешение запрещено",
    recognized: "QR распознан",
    invalid: "QR недействителен",
    error: "Ошибка камеры",
  };

  return labels[state];
}

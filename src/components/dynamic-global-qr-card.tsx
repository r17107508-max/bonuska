"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

type DynamicGlobalQrCardProps = {
  initialPayload: string;
  initialExpiresAt: string;
  color?: string;
};

type QrTokenResponse = {
  payload: string;
  expiresAt: string;
};

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export function DynamicGlobalQrCard({
  initialPayload,
  initialExpiresAt,
  color = "#1F1B18",
}: DynamicGlobalQrCardProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  const secondsLeft = useMemo(() => {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  }, [expiresAt, now]);
  const qrIsUsable = online && secondsLeft > 0 && !error;

  const refreshQr = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOnline(false);
      setError("Для обновления QR требуется интернет");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/app/qr-token", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось обновить QR");
      }

      const nextQr = (await response.json()) as QrTokenResponse;
      setPayload(nextQr.payload);
      setExpiresAt(nextQr.expiresAt);
      setNow(Date.now());
      setOnline(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить QR");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderQr() {
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 3,
        width: 360,
        color: {
          dark: color,
          light: "#ffffff",
        },
      });

      if (!cancelled) {
        setQrDataUrl(dataUrl);
      }
    }

    void renderQr();

    return () => {
      cancelled = true;
    };
  }, [color, payload]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      void refreshQr();
    }

    function handleOffline() {
      setOnline(false);
      setError("Для обновления QR требуется интернет");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshQr]);

  useEffect(() => {
    if (secondsLeft > 20 || loading || error) return;
    const timer = window.setTimeout(() => void refreshQr(), 0);
    return () => window.clearTimeout(timer);
  }, [error, loading, refreshQr, secondsLeft]);

  useEffect(() => {
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function keepScreenAwake() {
      try {
        const wakeLock = (navigator as WakeLockNavigator).wakeLock;
        if (!wakeLock) return;
        const nextSentinel = await wakeLock.request("screen");
        if (cancelled) {
          await nextSentinel.release();
          return;
        }
        sentinel = nextSentinel;
      } catch {
        // QR stays usable even when the browser does not support Wake Lock.
      }
    }

    void keepScreenAwake();

    return () => {
      cancelled = true;
      void sentinel?.release();
    };
  }, []);

  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-white p-2 text-center shadow-sm sm:p-4">
      <div className="mx-auto flex min-h-[320px] w-full max-w-[380px] items-center justify-center rounded-[24px] bg-white p-2 ring-1 ring-[var(--border)] sm:p-3">
        {qrIsUsable && qrDataUrl ? (
          // QR is generated from the short-lived server token and is never persisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Динамический QR-код клиента" className="h-auto w-full max-w-[340px] image-render-auto" />
        ) : (
          <div className="flex aspect-square w-full max-w-[340px] flex-col items-center justify-center rounded-3xl bg-[var(--inactive)] p-6 text-center">
            <WifiOff aria-hidden className="size-8 text-[var(--danger)]" />
            <p className="mt-3 text-base font-extrabold text-[var(--text)]">Для обновления QR требуется интернет</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Недействительный код не показываем кассиру.</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-[var(--text-muted)]">
        {online ? <Wifi aria-hidden className="size-4 text-[var(--success)]" /> : <WifiOff aria-hidden className="size-4 text-[var(--danger)]" />}
        <span>{online ? "Соединение есть" : "Нет соединения"}</span>
        <span aria-hidden>•</span>
        <span>{secondsLeft > 0 ? `Обновится через ${secondsLeft} сек.` : "QR устарел"}</span>
      </div>

      {(error || !qrIsUsable) && (
        <button
          type="button"
          onClick={() => void refreshQr()}
          disabled={loading}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white disabled:opacity-60"
        >
          <RefreshCw aria-hidden className={`size-5 ${loading ? "animate-spin" : ""}`} />
          Обновить QR
        </button>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-[var(--danger)]">{error}</p>}
    </section>
  );
}

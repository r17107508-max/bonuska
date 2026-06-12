"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { RefreshCw, ShieldCheck } from "lucide-react";

type DynamicGlobalQrCardProps = {
  initialPayload: string;
  initialExpiresAt: string;
  color?: string;
};

type QrTokenResponse = {
  payload: string;
  expiresAt: string;
};

export function DynamicGlobalQrCard({
  initialPayload,
  initialExpiresAt,
  color = "#0f172a",
}: DynamicGlobalQrCardProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const secondsLeft = useMemo(() => {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  }, [expiresAt, now]);

  const refreshQr = useCallback(async () => {
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
        margin: 1,
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
    const timer = window.setInterval(() => {
      void refreshQr();
    }, 45_000);

    return () => window.clearInterval(timer);
  }, [refreshQr]);

  return (
    <section className="panel p-5 text-center">
      <div className="mx-auto flex max-w-72 items-center justify-center rounded-lg bg-white p-4 shadow-inner ring-1 ring-slate-200">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Динамический QR-код клиента" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-sm font-semibold text-slate-500">
            Обновляем QR
          </div>
        )}
      </div>

      <p className="mt-4 text-lg font-semibold text-slate-950">Мой QR для всех компаний</p>
      <p className="mt-1 text-sm text-slate-500">QR обновляется автоматически и не содержит телефон.</p>

      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <ShieldCheck aria-hidden className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950">Защита от фотографии QR</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Покажите этот экран кассиру. Код действует короткое время, поэтому сохранённая картинка быстро устаревает.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void refreshQr()}
                disabled={loading}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-60"
              >
                <RefreshCw aria-hidden className={`size-5 ${loading ? "animate-spin" : ""}`} />
                Обновить
              </button>
              <span className="min-w-16 text-right text-sm font-semibold text-slate-600">{secondsLeft} сек.</span>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-lg bg-slate-100 p-3 text-left">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Токен для локального теста</summary>
        <p className="mt-2 break-all font-mono text-xs text-slate-600">{payload}</p>
      </details>
    </section>
  );
}

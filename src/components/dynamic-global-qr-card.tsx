"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { RefreshCw } from "lucide-react";

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
        width: 380,
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
    <section className="warm-card p-4 text-center">
      <p className="text-sm font-semibold uppercase text-green-800">QR для кассы</p>
      <h2 className="mt-1 text-xl font-semibold text-[#2f1d13]">Мой QR для всех компаний</h2>

      <div className="mx-auto mt-4 flex max-w-80 items-center justify-center rounded-lg bg-white p-3 shadow-inner ring-1 ring-amber-100">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Динамический QR-код клиента" className="w-full" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-sm font-semibold text-slate-500">
            Обновляем QR
          </div>
        )}
      </div>

      <p className="mt-4 text-base font-semibold text-[#2f1d13]">Покажите QR-код кассиру</p>
      <p className="mt-1 text-sm leading-5 text-[#7b6a5b]">QR обновляется автоматически и не содержит телефон</p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void refreshQr()}
          disabled={loading}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 font-semibold text-white disabled:opacity-60"
        >
          <RefreshCw aria-hidden className={`size-5 ${loading ? "animate-spin" : ""}`} />
          Обновить QR
        </button>
        <span className="min-w-28 text-right text-sm font-semibold leading-5 text-[#7b6a5b]">
          Обновится через {secondsLeft} сек.
        </span>
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  );
}

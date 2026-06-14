"use client";

import { useState } from "react";
import { Gift, Loader2, Sparkles, X } from "lucide-react";

type RewardClaimView = {
  id: string;
  status: string;
  title: string | null;
  description: string | null;
  qrDataUrl: string | null;
};

export function GiftOpenCard({
  membershipId,
  companyName,
  initialClaim,
}: {
  membershipId: string;
  companyName: string;
  initialClaim?: RewardClaimView | null;
}) {
  const [open, setOpen] = useState(Boolean(initialClaim?.status === "OPENED"));
  const [claim, setClaim] = useState<RewardClaimView | null>(initialClaim ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasOpenedGift = claim?.status === "OPENED" && claim.title && claim.qrDataUrl;

  async function openGift() {
    setOpen(true);
    setLoading(true);
    setError("");

    try {
      const [response] = await Promise.all([
        fetch("/api/client/rewards/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipId }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1300)),
      ]);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось открыть подарок");
      }

      setClaim(data.rewardClaim);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось открыть подарок");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="panel overflow-hidden border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
            <Gift aria-hidden className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase text-amber-800">Подарок готов</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Откройте коробку</h2>
            <p className="mt-1 text-sm leading-5 text-amber-900">
              Узнайте, какой подарок выпал в {companyName}, и покажите отдельный QR-код кассиру.
            </p>
            <button
              type="button"
              onClick={hasOpenedGift ? () => setOpen(true) : openGift}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 font-semibold text-white shadow-sm transition active:scale-[0.99]"
            >
              <Sparkles aria-hidden className="size-4" />
              {hasOpenedGift ? "Показать подарок" : "Открыть подарок"}
            </button>
          </div>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 px-4 pb-4 pt-10 sm:items-center">
          <section className="relative max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              aria-label="Закрыть"
            >
              <X aria-hidden className="size-5" />
            </button>

            <div className="pt-6 text-center">
              <div className={`gift-box-animation mx-auto ${loading ? "is-opening" : hasOpenedGift ? "is-opened" : ""}`}>
                <div className="gift-box-lid" />
                <div className="gift-box-body" />
                <div className="gift-box-ribbon" />
                <div className="gift-box-sparkles" />
              </div>

              {loading && (
                <div className="mt-6">
                  <h2 className="text-2xl font-semibold text-slate-950">Открываем коробку</h2>
                  <p className="mt-2 text-sm text-slate-600">Подарок выбирается на сервере.</p>
                  <Loader2 aria-hidden className="mx-auto mt-4 size-6 animate-spin text-amber-600" />
                </div>
              )}

              {!loading && error && (
                <div className="mt-6 rounded-lg bg-red-50 p-4 text-left text-sm text-red-800">
                  <p className="font-semibold">Подарок не открылся</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}

              {!loading && hasOpenedGift && (
                <div className="mt-6">
                  <p className="text-sm font-semibold uppercase text-amber-700">Поздравляем</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ваш подарок: {claim.title}</h2>
                  {claim.description && <p className="mt-2 text-sm text-slate-600">{claim.description}</p>}
                  <div className="mx-auto mt-5 flex max-w-64 items-center justify-center rounded-lg bg-white p-4 shadow-inner ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={claim.qrDataUrl ?? ""} alt="QR-код подарка" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    Покажите этот QR-код кассиру, чтобы получить подарок.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

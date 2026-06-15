"use client";

import { useState } from "react";
import { Gift, Loader2, PartyPopper, Sparkles, X } from "lucide-react";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [claim, setClaim] = useState<RewardClaimView | null>(initialClaim ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasOpenedGift = claim?.status === "OPENED" && Boolean(claim.title && claim.qrDataUrl);

  async function openGift() {
    setModalOpen(true);
    setLoading(true);
    setError("");

    try {
      const [response] = await Promise.all([
        fetch("/api/client/rewards/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipId }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1800)),
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
      <section className={`panel overflow-hidden p-5 ${hasOpenedGift ? "border-amber-300 bg-white" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
            {hasOpenedGift ? <PartyPopper aria-hidden className="size-7" /> : <Gift aria-hidden className="size-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase text-amber-800">Подарок готов</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {hasOpenedGift ? `Ваш подарок: ${claim?.title}` : "Откройте коробку"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-amber-900">
              {hasOpenedGift
                ? "Покажите этот QR-код кассиру. После фактической выдачи подарка прогресс начнется заново."
                : `Откройте коробку и узнайте, какой подарок вас ждет в ${companyName}. Подарок выбирается на сервере.`}
            </p>

            {hasOpenedGift ? (
              <div className="mt-4">
                {claim?.description && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{claim.description}</p>}
                <div className="flex justify-center rounded-lg bg-white p-4 shadow-inner ring-1 ring-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="size-56" src={claim?.qrDataUrl ?? ""} alt="QR-код подарка" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Покажите QR-код подарка кассиру. Обычный QR клиента нужен только для начисления покупок.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={openGift}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 font-semibold text-white shadow-sm transition active:scale-[0.99]"
              >
                <Sparkles aria-hidden className="size-4" />
                Открыть подарок
              </button>
            )}
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 pb-4 pt-10 sm:items-center">
          <section className="relative max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              aria-label="Закрыть"
            >
              <X aria-hidden className="size-5" />
            </button>

            <div className="pt-6 text-center">
              <div className={`gift-box-animation mx-auto ${loading ? "is-opening" : hasOpenedGift ? "is-opened" : ""}`}>
                <div className="gift-box-glow" />
                <div className="gift-box-lid" />
                <div className="gift-box-body" />
                <div className="gift-box-ribbon" />
                <div className="gift-box-sparkles" />
              </div>

              {loading && (
                <div className="mt-6">
                  <h2 className="text-2xl font-semibold text-slate-950">Открываем коробку</h2>
                  <p className="mt-2 text-sm text-slate-600">Сервер выбирает подарок из списка компании.</p>
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
                  <p className="text-sm font-semibold uppercase text-amber-700">Ваш подарок</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">{claim?.title}</h2>
                  {claim?.description && <p className="mt-2 text-sm text-slate-600">{claim.description}</p>}
                  <div className="mx-auto mt-5 flex max-w-64 items-center justify-center rounded-lg bg-white p-4 shadow-inner ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={claim?.qrDataUrl ?? ""} alt="QR-код подарка" />
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

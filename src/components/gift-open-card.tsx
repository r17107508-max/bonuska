"use client";

import Image from "next/image";
import { useState } from "react";
import { Gift, Loader2, PartyPopper, Sparkles, X } from "lucide-react";
import { buildManualScanCode } from "@/lib/scan-codes";

type RewardClaimView = {
  id: string;
  rewardClaimId?: string;
  status: string;
  title: string | null;
  description: string | null;
  rewardQrToken?: string;
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
        new Promise((resolve) => setTimeout(resolve, 520)),
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
      <section className={`rounded-3xl border bg-white p-4 shadow-sm ${hasOpenedGift ? "border-[var(--gold)]" : "border-[var(--border)]"}`}>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,180,76,0.28)] text-[#7a4b00]">
            {hasOpenedGift ? <PartyPopper aria-hidden className="size-6" /> : <Gift aria-hidden className="size-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-[#7a4b00]">Подарок</p>
            <h2 className="mt-1 text-xl font-extrabold text-[var(--text)]">
              {hasOpenedGift ? `Ваш подарок: ${claim?.title}` : "Подарок готов"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              {hasOpenedGift
                ? "Покажите QR подарка кассиру. Выдачу подтверждает сотрудник."
                : `Откройте подарок от ${companyName}.`}
            </p>

            {hasOpenedGift ? (
              <div className="mt-4">
                <Image
                  src="/images/client/client-reward-unlocked.webp"
                  alt="Открытый подарок"
                  width={220}
                  height={220}
                  loading="lazy"
                  className="mx-auto h-auto w-[180px]"
                />
                {claim?.description && <p className="mb-3 mt-3 rounded-2xl bg-[var(--inactive)] p-3 text-sm text-[var(--text-muted)]">{claim.description}</p>}
                <div className="flex justify-center rounded-2xl bg-white p-4 shadow-inner ring-1 ring-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="size-56" src={claim?.qrDataUrl ?? ""} alt="QR-код подарка" />
                </div>
                {claim?.rewardQrToken && (
                  <div className="mt-3 rounded-2xl bg-white p-3 text-center ring-1 ring-[var(--border)]">
                    <p className="text-xs font-bold uppercase text-[#7a4b00]">Код подарка для ручного ввода</p>
                    <p className="mt-1 font-mono text-2xl font-semibold tracking-normal text-[var(--text)]">
                      {buildManualScanCode(claim.rewardQrToken, "reward")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openGift}
                disabled={loading}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-4 font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 motion-reduce:transition-none"
              >
                <Sparkles aria-hidden className="size-4" />
                Открыть подарок
              </button>
            )}
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10 sm:items-center">
          <section className="relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100"
              aria-label="Закрыть"
            >
              <X aria-hidden className="size-5" />
            </button>

            <div className="pt-6 text-center">
              {loading && (
                <div>
                  <div className="gift-box-animation is-opening mx-auto">
                    <div className="gift-box-glow" />
                    <div className="gift-box-lid" />
                    <div className="gift-box-body" />
                    <div className="gift-box-ribbon" />
                    <div className="gift-box-sparkles" />
                  </div>
                  <h2 className="mt-6 text-xl font-extrabold text-[var(--text)]">Открываем подарок</h2>
                  <Loader2 aria-hidden className="mx-auto mt-4 size-6 animate-spin text-[var(--brand-strong)]" />
                </div>
              )}

              {!loading && error && (
                <div className="mt-6 rounded-2xl bg-red-50 p-4 text-left text-sm text-[var(--danger)]">
                  <p className="font-bold">Подарок не открылся</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}

              {!loading && hasOpenedGift && (
                <div className="mt-2">
                  <Image
                    src="/images/client/client-reward-unlocked.webp"
                    alt="Открытый подарок"
                    width={220}
                    height={220}
                    loading="lazy"
                    className="mx-auto h-auto w-[190px]"
                  />
                  <p className="mt-3 text-sm font-bold uppercase text-[var(--brand-strong)]">Поздравляем</p>
                  <h2 className="mt-2 text-xl font-extrabold text-[var(--text)]">{claim?.title}</h2>
                  {claim?.description && <p className="mt-2 text-sm text-[var(--text-muted)]">{claim.description}</p>}
                  <div className="mx-auto mt-5 flex max-w-64 items-center justify-center rounded-2xl bg-white p-4 shadow-inner ring-1 ring-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={claim?.qrDataUrl ?? ""} alt="QR-код подарка" />
                  </div>
                  {claim?.rewardQrToken && (
                    <div className="mx-auto mt-3 max-w-64 rounded-2xl bg-[var(--inactive)] p-3 ring-1 ring-[var(--border)]">
                      <p className="text-xs font-bold uppercase text-[#7a4b00]">Код подарка</p>
                      <p className="mt-1 font-mono text-2xl font-semibold tracking-normal text-[var(--text)]">
                        {buildManualScanCode(claim.rewardQrToken, "reward")}
                      </p>
                    </div>
                  )}
                  <p className="mt-4 text-sm font-bold text-[var(--text-muted)]">Покажите QR подарка кассиру.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

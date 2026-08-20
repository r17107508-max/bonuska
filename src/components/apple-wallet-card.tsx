"use client";

import { useEffect, useState } from "react";
import { WalletCards, X } from "lucide-react";

const HIDDEN_KEY = "proplushka.appleWallet.hidden";

type WalletStatus = {
  enabled: boolean;
  missing: string[];
};

export function AppleWalletCard() {
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(HIDDEN_KEY) === "1");
  const [status, setStatus] = useState<WalletStatus | null>(null);

  useEffect(() => {
    if (hidden) {
      return;
    }

    fetch("/api/app/wallet/apple/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: WalletStatus | null) => setStatus(data))
      .catch(() => setStatus(null));
  }, [hidden]);

  if (hidden) {
    return null;
  }

  const enabled = Boolean(status?.enabled);

  function hideCard() {
    window.localStorage.setItem(HIDDEN_KEY, "1");
    setHidden(true);
  }

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <WalletCards aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-extrabold text-[var(--text)]">Apple Wallet</h2>
            <button
              type="button"
              onClick={hideCard}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-2xl border border-[var(--border)] text-[var(--text-muted)]"
              aria-label="Скрыть Apple Wallet"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
            Добавьте QR-карту в Wallet, чтобы быстрее показать её на кассе. QR не содержит номер телефона.
          </p>
          {!enabled && (
            <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
              Добавление станет доступно после подключения Apple PassKit на сервере.
            </p>
          )}
          <a
            href="/api/app/wallet/apple"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[var(--brand-strong)] px-4 text-sm font-extrabold text-white aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={!enabled}
          >
            Добавить в Apple Wallet
          </a>
        </div>
      </div>
    </section>
  );
}

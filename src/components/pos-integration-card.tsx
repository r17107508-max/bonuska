"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";

type PosIntegrationCardProps = {
  prefix: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

export function PosIntegrationCard({ prefix, createdAt, lastUsedAt }: PosIntegrationCardProps) {
  const [currentPrefix, setCurrentPrefix] = useState(prefix);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function rotateKey() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/company/pos-key", { method: "POST" });
    const data = await response.json().catch(() => null);
    setPending(false);

    if (!response.ok || !data?.apiKey) {
      setMessage(data?.error || "Не удалось создать POS API-ключ");
      return;
    }

    setSecret(data.apiKey);
    setCurrentPrefix(data.prefix);
    setMessage("Ключ создан. Сохраните его сейчас: повторно показать ключ нельзя.");
  }

  async function disableKey() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/company/pos-key", { method: "DELETE" });
    setPending(false);

    if (!response.ok) {
      setMessage("Не удалось отключить POS API-ключ");
      return;
    }

    setSecret("");
    setCurrentPrefix(null);
    setMessage("POS API-ключ отключён.");
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-extrabold text-[var(--text)]">Интеграция с кассой</p>
          <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
            POS API начисляет покупки по QR клиента. Списание баллов требует отдельной модели баланса.
          </p>
        </div>
        <span className="rounded-full bg-[var(--inactive)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
          {currentPrefix ? "Ключ активен" : "Не подключено"}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Info label="Ключ" value={currentPrefix ?? "Не создан"} />
        <Info label="Создан" value={createdAt ? new Date(createdAt).toLocaleDateString("ru-RU") : "—"} />
        <Info label="Последнее обращение" value={lastUsedAt ? new Date(lastUsedAt).toLocaleDateString("ru-RU") : "—"} />
      </dl>

      {secret && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase text-amber-900">Новый ключ</p>
          <p className="mt-2 break-all font-mono text-sm text-amber-950">{secret}</p>
          <div className="mt-3">
            <CopyButton text={secret}>Скопировать ключ</CopyButton>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm font-semibold text-[var(--brand-strong)]">{message}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={rotateKey}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {currentPrefix ? "Перевыпустить ключ" : "Создать ключ"}
        </button>
        {currentPrefix && (
          <button
            type="button"
            onClick={disableKey}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-[var(--danger)] disabled:opacity-60"
          >
            Отключить
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-5 text-[var(--text-muted)]">
        Endpoint: <span className="font-mono text-[var(--text)]">POST /api/pos/v1/purchases</span>. Заголовок:{" "}
        <span className="font-mono text-[var(--text)]">Authorization: Bearer ключ</span>. Тело:{" "}
        <span className="font-mono text-[var(--text)]">qr, receiptId, quantity, purchaseAmount, cashierPhone</span>.
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--inactive)] p-3">
      <dt className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-[var(--text)]">{value}</dd>
    </div>
  );
}

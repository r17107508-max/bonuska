"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

type SearchMatch = {
  id: string;
  name: string;
  phone: string;
  scanHref: string;
};

export function CompanyScanSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    setError("");
    setSearched(false);

    if (value.length < 2) {
      setMatches([]);
      setError("Введите минимум 2 символа.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/company/scan/search?q=${encodeURIComponent(value)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось выполнить поиск.");
      }

      setMatches(data.clients ?? []);
      setSearched(true);
    } catch (caught) {
      setMatches([]);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить поиск.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={runSearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label>
          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Имя или телефон клиента</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Введите имя или телефон"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 outline-none focus:border-[var(--brand-strong)] focus:ring-4 focus:ring-[rgba(201,71,38,0.14)]"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-[var(--brand-strong)] px-4 font-bold text-white disabled:opacity-60"
        >
          {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Найти
        </button>
      </form>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-[var(--danger)]">{error}</p>}

      {searched && (
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white">
          {matches.map((item) => (
            <Link key={item.id} href={item.scanHref} className="flex items-center justify-between gap-3 p-3">
              <span>
                <span className="font-bold text-[var(--text)]">{item.name}</span>
                <span className="ml-2 text-sm text-[var(--text-muted)]">{item.phone}</span>
              </span>
              <span className="text-sm font-bold text-[var(--brand-strong)]">Открыть</span>
            </Link>
          ))}
          {matches.length === 0 && <p className="p-3 text-sm text-[var(--text-muted)]">Клиент в вашей компании не найден.</p>}
        </div>
      )}
    </div>
  );
}

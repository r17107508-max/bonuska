"use client";

import { useState } from "react";

export function CopyButton({ text, children = "Скопировать" }: { text: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-strong)] px-4 text-sm font-bold text-white"
    >
      {copied ? "Скопировано" : children}
    </button>
  );
}

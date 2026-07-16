"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";

const supportPhone = "+79278370717";
const supportText = `Поддержка ПроПлюшка: ${supportPhone}`;

export function SupportShareButton() {
  const [copied, setCopied] = useState(false);

  async function shareToMessenger() {
    if (navigator.share) {
      await navigator.share({
        title: "Поддержка ПроПлюшка",
        text: `Написать в MAX можно по номеру ${supportPhone}`,
      });
      return;
    }

    await copyPhone();
  }

  async function copyPhone() {
    await navigator.clipboard.writeText(supportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={shareToMessenger}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99]"
      >
        <MessageCircle aria-hidden className="size-5" />
        Написать в MAX
      </button>
      <button
        type="button"
        onClick={copyPhone}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 active:scale-[0.99]"
      >
        <Copy aria-hidden className="size-5" />
        {copied ? "Номер скопирован" : "Скопировать номер"}
      </button>
    </div>
  );
}

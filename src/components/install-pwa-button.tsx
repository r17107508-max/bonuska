"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallPwaButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const standalone = isStandalone();
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      setInstalled(standalone);
      setShowIosHint(ios && !standalone);
    });

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return null;
  }

  async function install() {
    if (!promptEvent) {
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-semibold text-white"
      >
        <Download aria-hidden className="size-5" />
        Установить приложение на телефон
      </button>
    );
  }

  if (showIosHint) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
        На iPhone нажмите «Поделиться» → «На экран Домой».
      </div>
    );
  }

  return null;
}

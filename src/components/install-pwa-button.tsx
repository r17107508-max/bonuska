"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPwaButtonProps = {
  placement?: "inline" | "floating";
};

const INSTALL_STORAGE_KEY = "proplushka:pwa-install-accepted";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isKnownInstalled() {
  return isStandalone() || window.localStorage.getItem(INSTALL_STORAGE_KEY) === "true";
}

export function InstallPwaButton({ placement = "inline" }: InstallPwaButtonProps) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const knownInstalled = isKnownInstalled();
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      setInstalled(knownInstalled);
      setShowIosHint(ios && !knownInstalled);
    });

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      if (isKnownInstalled()) {
        setInstalled(true);
        return;
      }
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      window.localStorage.setItem(INSTALL_STORAGE_KEY, "true");
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

  if (installed || dismissed) {
    return null;
  }

  async function install() {
    if (!promptEvent) {
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      window.localStorage.setItem(INSTALL_STORAGE_KEY, "true");
      setInstalled(true);
    }
    setPromptEvent(null);
  }

  const button = promptEvent ? (
    <button
      type="button"
      onClick={install}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-semibold text-white shadow-sm transition hover:bg-slate-800"
    >
      <Download aria-hidden className="size-5" />
      Установить на главный экран
    </button>
  ) : null;

  const hint = showIosHint ? (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--inactive)] p-3 text-sm font-medium text-[#7a4b00]">
      На iPhone нажмите «Поделиться» → «На экран Домой».
    </div>
  ) : null;

  if (!button && !hint) {
    return null;
  }

  if (placement === "floating") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mx-auto flex max-w-md items-start gap-2">
          <div className="min-w-0 flex-1">{button ?? hint}</div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
            aria-label="Скрыть установку приложения"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (button) {
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

  return hint;
}

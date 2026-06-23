"use client";

import { useEffect, useState } from "react";
import styles from "./app-splash.module.css";

type SplashPhase = "visible" | "leaving" | "hidden";

const START_EXIT_AFTER_MS = 1420;
const REMOVE_AFTER_MS = 1820;

function isStandaloneApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function AppSplash() {
  const [phase, setPhase] = useState<SplashPhase>("hidden");

  useEffect(() => {
    if (!isStandaloneApp()) {
      return;
    }

    const showTimer = window.setTimeout(() => setPhase("visible"), 0);
    const exitTimer = window.setTimeout(() => setPhase("leaving"), START_EXIT_AFTER_MS);
    const removeTimer = window.setTimeout(() => setPhase("hidden"), REMOVE_AFTER_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div className={`${styles.splash} ${phase === "leaving" ? styles.leaving : ""}`} data-app-splash aria-hidden="true">
      <div className={styles.content}>
        <div className={styles.iconShell}>
          <img className={styles.icon} src="/icons/icon-192.png" alt="" width={192} height={192} decoding="async" />
        </div>
        <p className={styles.title}>ПроПлюшка</p>
        <span className={styles.mark} />
      </div>
    </div>
  );
}

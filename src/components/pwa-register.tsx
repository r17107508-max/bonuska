"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let reloaded = false;

    async function disableServiceWorkers() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        if (navigator.serviceWorker.controller && !reloaded) {
          reloaded = true;
          window.location.reload();
        }
      } catch {
        // Ignore cleanup failures so the app remains usable.
      }
    }

    disableServiceWorkers();
  }, []);

  return null;
}

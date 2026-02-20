"use client";

import { useEffect } from "react";

/**
 * Componente para registrar o Service Worker
 * Permite funcionalidade offline e cache inteligente
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Registrar SW apenas no browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration);

          // Listener para mensagens do SW (sync completo)
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data.type === "SYNC_COMPLETE") {
              console.log("[PWA] Menu synced:", event.data.data);
              // Aqui você pode disparar uma ação para refetch os dados
              window.dispatchEvent(
                new CustomEvent("pwa:sync", { detail: event.data.data })
              );
            }
          });
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}

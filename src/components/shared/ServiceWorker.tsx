"use client";

// Registra o service worker (public/sw.js) só no site publicado: em desenvolvimento o
// cache atrapalharia ver as mudanças na hora.
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

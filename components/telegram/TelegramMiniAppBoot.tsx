"use client";

/**
 * Boots Telegram WebApp SDK when SuperAsk is opened as a Mini App.
 * Expands to full height and applies Telegram theme colors when available.
 */

import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        themeParams?: Record<string, string>;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        isExpanded?: boolean;
      };
    };
  }
}

export function TelegramMiniAppBoot() {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-telegram-web-app]',
    );
    if (existing) {
      boot();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.dataset.telegramWebApp = "1";
    script.onload = () => boot();
    document.head.appendChild(script);
  }, []);

  return null;
}

function boot() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor?.("#025094");
    tg.setBackgroundColor?.("#f4f8fb");
  } catch {
    /* older clients */
  }
}

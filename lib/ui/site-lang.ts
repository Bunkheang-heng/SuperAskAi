"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/ui/marketing";

const KEY = "superask.site-lang.v1";
const LEGACY_KEY = "askgov.site-lang.v1";

export function useSiteLang(defaultLang: Lang = "en") {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    try {
      let stored = window.localStorage.getItem(KEY);
      if (!stored) {
        stored = window.localStorage.getItem(LEGACY_KEY);
        if (stored === "km" || stored === "en") {
          window.localStorage.setItem(KEY, stored);
          window.localStorage.removeItem(LEGACY_KEY);
        }
      }
      if (stored === "km" || stored === "en") setLangState(stored);
    } catch {
      /* private browsing / blocked storage */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { lang, setLang };
}

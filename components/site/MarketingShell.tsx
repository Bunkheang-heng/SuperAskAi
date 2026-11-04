"use client";

import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { useSiteLang } from "@/lib/ui/site-lang";
import type { Lang } from "@/lib/ui/marketing";

export function MarketingShell({
  children,
  variant = "default",
}: {
  children: (lang: Lang) => ReactNode;
  variant?: "default" | "auth";
}) {
  const { lang, setLang } = useSiteLang("en");

  return (
    <div className="flex min-h-full flex-col bg-white">
      <SiteHeader lang={lang} onLangChange={setLang} variant={variant} />
      <main className="flex-1">
        {variant === "auth" ? (
          // Auth pages: a white card on the hero's dotted, blue-washed field.
          <div className="relative overflow-hidden px-4 py-12 sm:py-16" style={{ background: "#F0F9FF" }}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(#BBDFFC 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                opacity: 0.5,
              }}
            />
            <div
              className="relative mx-auto w-full max-w-md overflow-hidden rounded-[20px] bg-white"
              style={{ boxShadow: "0 8px 48px rgba(4,110,197,0.10)", border: "1px solid #E8EDF2" }}
            >
              <div aria-hidden style={{ height: 4, background: "linear-gradient(90deg,#046EC5,#64E8C7)" }} />
              {children(lang)}
            </div>
          </div>
        ) : (
          children(lang)
        )}
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}

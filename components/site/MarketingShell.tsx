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
    <div className="flex min-h-full flex-col" style={{ background: "#fff" }}>
      <SiteHeader lang={lang} onLangChange={setLang} variant={variant} />
      <main className="flex-1">{children(lang)}</main>
      <SiteFooter lang={lang} />
    </div>
  );
}

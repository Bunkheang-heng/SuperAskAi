"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { SuperAskLogo } from "./SuperAskLogo";
import { MARKETING, t, type Lang } from "@/lib/ui/marketing";

export function SiteHeader({
  lang,
  onLangChange,
  variant = "default",
}: {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  variant?: "default" | "auth";
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.92)",
        borderColor: "var(--sa-line)",
        boxShadow: "0 1px 0 rgba(2,80,148,0.04)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <SuperAskLogo size="sm" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLangChange(lang === "km" ? "en" : "km")}
            className="ag-press inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium"
            style={{
              borderColor: "var(--sa-line)",
              color: "var(--sa-ink)",
              background: "#fff",
            }}
            aria-label={lang === "km" ? "Switch to English" : "ប្តូរទៅភាសាខ្មែរ"}
          >
            <span>{lang === "km" ? "ខ្មែរ" : "EN"}</span>
          </button>

          {variant === "default" && (
            <>
              <Link
                href="/login"
                className="ag-press hidden h-9 items-center rounded-md px-3 text-[13px] font-medium sm:inline-flex"
                style={{ color: "var(--sa-deep)" }}
              >
                {t(MARKETING.login, lang)}
              </Link>
              <Link
                href="/login"
                className="ag-press inline-flex h-9 w-9 items-center justify-center rounded-md text-white sm:hidden"
                style={{ background: "var(--sa-deep)" }}
                aria-label={t(MARKETING.login, lang)}
              >
                <User size={18} strokeWidth={2} />
              </Link>
              <Link
                href="/register"
                className="ag-press hidden h-9 items-center rounded-md px-3.5 text-[13px] font-medium text-white sm:inline-flex"
                style={{ background: "var(--sa-deep)" }}
              >
                {t(MARKETING.register, lang)}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

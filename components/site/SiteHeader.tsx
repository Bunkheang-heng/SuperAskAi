"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SuperAskLogo } from "./SuperAskLogo";
import { MARKETING, t, type Lang } from "@/lib/ui/marketing";
import { NAV } from "@/lib/ui/landing";

const GRADIENT = "linear-gradient(135deg,#046EC5,#64E8C7)";

/** "ខ្មែរ | EN" — both options visible, the active one in brand blue. */
export function LangToggle({
  lang,
  onLangChange,
}: {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}) {
  const item = (value: Lang, label: string) => {
    const active = lang === value;
    return (
      <button
        type="button"
        onClick={() => onLangChange(value)}
        aria-pressed={active}
        className="rounded px-0.5"
        style={{
          color: active ? "#046EC5" : "#4A5565",
          fontWeight: active ? 600 : 500,
          lineHeight: 1.6,
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      className="flex items-center gap-1"
      style={{ fontSize: 13, color: "#99A1AF" }}
      role="group"
      aria-label="Language"
    >
      {item("km", "ខ្មែរ")}
      <span aria-hidden>|</span>
      {item("en", "EN")}
    </div>
  );
}

export function SiteHeader({
  lang,
  onLangChange,
  variant = "default",
}: {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  variant?: "default" | "auth";
}) {
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-lg"
      style={{
        background: "rgba(255,255,255,0.94)",
        borderBottom: "1px solid rgba(208,213,221,0.35)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <SuperAskLogo size="md" />

        <div className="hidden items-center gap-7 md:flex">
          {NAV.links.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              className="transition-colors hover:text-[#046EC5]"
              style={{ color: "#4A5565", fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}
            >
              {l.label[lang]}
            </Link>
          ))}

          <LangToggle lang={lang} onLangChange={onLangChange} />

          <div className="flex items-center gap-3">
            {variant === "default" && (
              <Link
                href="/login"
                className="transition-colors hover:text-[#046EC5]"
                style={{ color: "#4A5565", fontSize: 13, fontWeight: 500 }}
              >
                {t(MARKETING.login, lang)}
              </Link>
            )}
            <Link
              href="/chat"
              className="ag-press whitespace-nowrap rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: GRADIENT, fontSize: 13, padding: "9px 20px" }}
            >
              {NAV.askNow[lang]}
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded p-1 md:hidden"
          aria-label={NAV.menu[lang]}
          aria-expanded={open}
          style={{ color: "#101828" }}
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </div>

      {open && (
        <div className="bg-white px-6 pb-5 pt-3 md:hidden" style={{ borderTop: "1px solid #F0F0F0" }}>
          {NAV.links.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              onClick={() => setOpen(false)}
              className="block py-2.5"
              style={{ color: "#4A5565", fontSize: 15, fontWeight: 500, borderBottom: "1px solid #F5F5F5" }}
            >
              {l.label[lang]}
            </Link>
          ))}
          {variant === "default" && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block py-2.5"
              style={{ color: "#4A5565", fontSize: 15, fontWeight: 500, borderBottom: "1px solid #F5F5F5" }}
            >
              {t(MARKETING.login, lang)}
            </Link>
          )}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="inline-block rounded-lg font-semibold text-white"
              style={{ background: GRADIENT, fontSize: 14, padding: "10px 24px" }}
            >
              {NAV.askNow[lang]}
            </Link>
            <LangToggle lang={lang} onLangChange={onLangChange} />
          </div>
        </div>
      )}
    </nav>
  );
}

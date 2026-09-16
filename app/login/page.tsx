"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingShell } from "@/components/site";
import { writeSession } from "@/lib/ui/auth-session";
import { MARKETING, t, type Lang } from "@/lib/ui/marketing";

function LoginForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(
        lang === "km"
          ? "សូមបំពេញអ៊ីម៉ែល និងពាក្យសម្ងាត់"
          : "Please enter your email and password",
      );
      return;
    }
    setBusy(true);
    writeSession({ email: email.trim() });
    router.push("/chat");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:py-16">
      <h1
        className="text-[1.45rem] font-bold leading-snug sm:text-[1.65rem]"
        style={{ color: "var(--ag-ink)" }}
      >
        {t(MARKETING.loginHeadline, lang)}
      </h1>
      <p
        className="mt-3 text-[14px]"
        style={{ color: "var(--ag-ink-soft)" }}
      >
        {t(MARKETING.loginHint, lang)}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--ag-ink)" }}
          >
            {t(MARKETING.emailLabel, lang)}
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(MARKETING.emailPlaceholder, lang)}
            className="h-12 rounded-md border px-3.5 text-[15px]"
            style={{
              borderColor: "var(--ag-line)",
              color: "var(--ag-ink)",
              background: "#fff",
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--ag-ink)" }}
          >
            {t(MARKETING.passwordLabel, lang)}
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(MARKETING.passwordPlaceholder, lang)}
            className="h-12 rounded-md border px-3.5 text-[15px]"
            style={{
              borderColor: "var(--ag-line)",
              color: "var(--ag-ink)",
              background: "#fff",
            }}
          />
        </label>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--ag-red)" }} role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="ag-press mt-1 inline-flex h-12 items-center justify-center rounded-md text-[15px] font-semibold text-white disabled:opacity-70"
          style={{ background: "var(--ag-deep)" }}
        >
          {t(MARKETING.login, lang)}
        </button>
      </form>

      <p
        className="mt-6 text-center text-[14px]"
        style={{ color: "var(--ag-ink-soft)" }}
      >
        {t(MARKETING.noAccount, lang)}{" "}
        <Link
          href="/register"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: "var(--ag-deep)" }}
        >
          {t(MARKETING.register, lang)}
        </Link>
      </p>

      <Link
        href="/chat"
        className="mt-4 text-center text-[13px] underline-offset-2 hover:underline"
        style={{ color: "var(--ag-ink-soft)" }}
      >
        {t(MARKETING.continueGuest, lang)}
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <MarketingShell variant="auth">
      {(lang) => <LoginForm lang={lang} />}
    </MarketingShell>
  );
}

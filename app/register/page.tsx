"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingShell } from "@/components/site";
import { writeSession } from "@/lib/ui/auth-session";
import { MARKETING, t, type Lang } from "@/lib/ui/marketing";

function RegisterForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError(
        lang === "km"
          ? "សូមបំពេញគ្រប់ប្រអប់ដែលត្រូវការ"
          : "Please fill in all required fields",
      );
      return;
    }
    if (password.length < 8) {
      setError(
        lang === "km"
          ? "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួអក្សរ"
          : "Password must be at least 8 characters",
      );
      return;
    }
    if (password !== confirm) {
      setError(
        lang === "km"
          ? "ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ"
          : "Passwords do not match",
      );
      return;
    }

    setBusy(true);
    writeSession({ email: email.trim(), name: name.trim() });
    router.push("/chat");
  }

  const fieldStyle = {
    borderColor: "var(--ag-line)",
    color: "var(--ag-ink)",
    background: "#fff",
  } as const;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:py-16">
      <h1
        className="text-[1.45rem] font-bold leading-snug sm:text-[1.65rem]"
        style={{ color: "var(--ag-ink)" }}
      >
        {t(MARKETING.registerHeadline, lang)}
      </h1>
      <p className="mt-3 text-[14px]" style={{ color: "var(--ag-ink-soft)" }}>
        {t(MARKETING.registerHint, lang)}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--ag-ink)" }}
          >
            {t(MARKETING.nameLabel, lang)}
          </span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(MARKETING.namePlaceholder, lang)}
            className="h-12 rounded-md border px-3.5 text-[15px]"
            style={fieldStyle}
          />
        </label>

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
            style={fieldStyle}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(MARKETING.passwordPlaceholder, lang)}
            className="h-12 rounded-md border px-3.5 text-[15px]"
            style={fieldStyle}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--ag-ink)" }}
          >
            {t(MARKETING.confirmLabel, lang)}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t(MARKETING.passwordPlaceholder, lang)}
            className="h-12 rounded-md border px-3.5 text-[15px]"
            style={fieldStyle}
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
          {t(MARKETING.register, lang)}
        </button>
      </form>

      <p
        className="mt-6 text-center text-[14px]"
        style={{ color: "var(--ag-ink-soft)" }}
      >
        {t(MARKETING.hasAccount, lang)}{" "}
        <Link
          href="/login"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: "var(--ag-deep)" }}
        >
          {t(MARKETING.login, lang)}
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

export default function RegisterPage() {
  return (
    <MarketingShell variant="auth">
      {(lang) => <RegisterForm lang={lang} />}
    </MarketingShell>
  );
}

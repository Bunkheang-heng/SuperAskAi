import { MARKETING, t, type Lang } from "@/lib/ui/marketing";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer
      className="mt-auto"
      style={{ background: "var(--sa-deep)", color: "#fff" }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <p className="mb-3 text-[13px] font-medium opacity-70">
            {t(MARKETING.builtBy, lang)}
          </p>
          <p className="text-[15px] font-semibold leading-snug">
            {t(MARKETING.dgc, lang)}
          </p>
        </div>

        <div>
          <p className="mb-3 text-[13px] font-medium opacity-70">
            {t(MARKETING.contact, lang)}
          </p>
          <a
            href={`mailto:${MARKETING.email}`}
            className="block text-[14px] underline-offset-2 hover:underline"
          >
            {MARKETING.email}
          </a>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed opacity-80">
            {t(MARKETING.address, lang)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-start lg:items-end">
          <a
            href="#privacy"
            className="text-[13px] opacity-80 underline-offset-2 hover:underline"
          >
            {t(MARKETING.privacy, lang)}
          </a>
          <a
            href="#terms"
            className="text-[13px] opacity-80 underline-offset-2 hover:underline"
          >
            {t(MARKETING.terms, lang)}
          </a>
        </div>
      </div>

      <div
        className="border-t py-4 text-center text-[12px] opacity-70"
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
      >
        {t(MARKETING.copyright, lang)}
      </div>
    </footer>
  );
}

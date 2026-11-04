import Link from "next/link";
import { Facebook, Linkedin, Mail, MapPin } from "lucide-react";
import { SuperAskLogo } from "./SuperAskLogo";
import { MARKETING, type Lang } from "@/lib/ui/marketing";
import { FOOTER } from "@/lib/ui/landing";
import { MESSENGER_URL, TELEGRAM_HANDLE, TELEGRAM_URL } from "@/lib/ui/channels";
import { MessengerIcon, TelegramIcon } from "@/components/landing/primitives";

const HEADING = {
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  marginBottom: 16,
  lineHeight: 1.5,
};

function Column({
  title,
  links,
  lang,
}: {
  title: string;
  links: Array<{ href: string; label: { en: string; km: string } }>;
  lang: Lang;
}) {
  return (
    <div>
      <p style={HEADING}>{title}</p>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="mb-2.5 block transition-colors hover:text-white"
          style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.6 }}
        >
          {l.label[lang]}
        </Link>
      ))}
    </div>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-auto px-6 pb-8 pt-16" style={{ background: "#030712", color: "#fff" }}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-14 grid grid-cols-2 gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <SuperAskLogo size="lg" dark />
            </div>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, margin: 0 }}>{FOOTER.tagline[lang]}</p>
            <div className="mt-4 flex gap-2.5">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <TelegramIcon size={28} />
              </a>
              <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" aria-label="Messenger">
                <MessengerIcon size={28} />
              </a>
            </div>
          </div>

          <Column title={FOOTER.product[lang]} links={FOOTER.productLinks} lang={lang} />
          <Column title={FOOTER.company[lang]} links={FOOTER.companyLinks} lang={lang} />
          <Column title={FOOTER.legal[lang]} links={FOOTER.legalLinks} lang={lang} />

          <div className="col-span-2 md:col-span-1">
            <p style={HEADING}>{FOOTER.contact[lang]}</p>
            {[
              {
                icon: <Mail size={14} color="#6B7280" aria-hidden />,
                label: FOOTER.email[lang],
                val: (
                  <a href={`mailto:${MARKETING.email}`} className="hover:text-white">
                    {MARKETING.email}
                  </a>
                ),
              },
              {
                icon: <TelegramIcon size={14} />,
                label: "Telegram",
                val: (
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {TELEGRAM_HANDLE}
                  </a>
                ),
              },
              {
                icon: <MapPin size={14} color="#6B7280" aria-hidden />,
                label: FOOTER.office[lang],
                val: FOOTER.officeVal[lang],
              },
            ].map((row) => (
              <div key={row.label} className="mb-2.5 flex items-start gap-2.5">
                <span className="mt-1 shrink-0">{row.icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.6 }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.6 }}>{row.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid #1F2937" }}
        >
          <div>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 4px", lineHeight: 1.6 }}>{FOOTER.rights[lang]}</p>
            <p style={{ fontSize: 12, color: "#4B5563", margin: 0, lineHeight: 1.6 }}>{FOOTER.notBinding[lang]}</p>
          </div>
          <div className="flex items-center gap-3.5">
            <a href="#" aria-label="Facebook" className="transition-colors hover:text-white" style={{ color: "#6B7280" }}>
              <Facebook size={18} aria-hidden />
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="opacity-60 transition-opacity hover:opacity-100">
              <TelegramIcon size={18} />
            </a>
            <a href="#" aria-label="LinkedIn" className="transition-colors hover:text-white" style={{ color: "#6B7280" }}>
              <Linkedin size={18} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

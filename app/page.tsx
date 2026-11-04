"use client";

/**
 * Public landing page. Section order follows the SuperAsk Figma:
 * hero → stats → why → comparison → how it works → key features →
 * in action → web experience → anatomy → examples → channels → trust →
 * about → FAQs → final CTA. Header and footer come from MarketingShell.
 */

import { MarketingShell } from "@/components/site";
import { Compare, Hero, Stats, Why } from "@/components/landing/Intro";
import { Anatomy, HowItWorks, InAction, KeyFeatures, WebExperience } from "@/components/landing/Product";
import { About, Channels, Examples, Faqs, FinalCta, Trust } from "@/components/landing/Engage";

export default function LandingPage() {
  return (
    <MarketingShell>
      {(lang) => (
        <>
          <Hero lang={lang} />
          <Stats lang={lang} />
          <Why lang={lang} />
          <Compare lang={lang} />
          <HowItWorks lang={lang} />
          <KeyFeatures lang={lang} />
          <InAction lang={lang} />
          <WebExperience lang={lang} />
          <Anatomy lang={lang} />
          <Examples lang={lang} />
          <Channels lang={lang} />
          <Trust lang={lang} />
          <About lang={lang} />
          <Faqs lang={lang} />
          <FinalCta lang={lang} />
        </>
      )}
    </MarketingShell>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperAsk",
  description:
    "Ask about Cambodian government services. Every answer shows the official source it came from.",
  applicationName: "SuperAsk",
  authors: [{ name: "Digital Government Committee" }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // FR-70: mobile is the primary channel for the rural first-time applicant
  // segment. Pinch zoom must not be disabled — low-vision citizens rely on it.
  maximumScale: 5,
  themeColor: "#025094",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Khmer needs a font with correct subscript positioning; the system
            stack on most Android devices does not have one. `display=swap` so
            text is readable before the font arrives (NFR-15). Loading fails
            open to the system stack. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

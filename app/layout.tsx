import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Inter,
  Outfit,
  Instrument_Serif,
  JetBrains_Mono,
} from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

// Display — geometric + confident, warm at heavy weights. Used for h1/h2 and
// any oversized number. Reads well on devices with limited rendering budget.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Body — neutral, screen-tested, ubiquitous.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// Editorial italic — only used for the rare brand-word accent.
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-editorial",
  display: "swap",
});

// Monospace — numbers, code, chip metadata, ticker rows.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ustaad — Pakistan's verified workforce marketplace",
  description:
    "Hire verified electricians, plumbers, AC technicians, carpenters and other skilled trades across 50+ Pakistani cities. AI-matched proposals, escrow-ready payments, bilingual support.",
  keywords: [
    "Ustaad",
    "Pakistan skilled labour",
    "electrician Pakistan",
    "plumber Pakistan",
    "AC repair",
    "verified workers",
    "kaam dhundo",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${outfit.variable} ${inter.variable} ${instrument.variable} ${mono.variable}`}
      >
        <body className="antialiased">
          <LanguageProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

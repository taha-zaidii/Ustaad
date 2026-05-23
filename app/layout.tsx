import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

// Display — a quiet serif. Used for headings only; doesn't fight body copy.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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

// Mono — numbers, code, monospace UI bits.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ustaad — Verified workers and skilled professionals across Pakistan",
  description:
    "Hire verified electricians, plumbers, AC technicians, carpenters and other skilled trades across 50+ Pakistani cities. Transparent pricing, AI-matched proposals, escrow-ready payments.",
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
        className={`${instrumentSerif.variable} ${inter.variable} ${mono.variable}`}
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

import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Nav, ModeBanner } from "@/components/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "TrueGlow",
  description:
    "Check your skin with YouCam AI, then check the cream before it touches your face. Flags mercury, high-strength hydroquinone and potent steroids.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Nav />
        <ModeBanner />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-muted">
          TrueGlow gives general information, not medical advice. Photos are sent to YouCam for analysis and are not
          stored by this app. Your scores stay in this browser.
        </footer>
      </body>
    </html>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { bandFor, BAND_LABEL } from "@/lib/skin/concerns";
import type { Verdict } from "@/lib/ingredients/engine";

const LINKS = [
  { href: "/scan", label: "Skin check" },
  { href: "/check", label: "Cream check" },
  { href: "/progress", label: "Is it working?" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center gap-4 overflow-x-auto px-4 py-3 text-sm">
        <Link href="/" className="mr-auto font-display text-lg font-semibold text-accent">
          TrueGlow
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
              path === l.href ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export interface AppConfig {
  youcam: "mock" | "live" | "misconfigured";
  ocr: boolean;
}

export function useConfig(): AppConfig | null {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => setCfg({ youcam: "misconfigured", ocr: false }));
  }, []);
  return cfg;
}

export function ModeBanner() {
  const cfg = useConfig();
  if (!cfg || cfg.youcam === "live") return null;
  return (
    <div className="bg-care-bg px-4 py-2 text-center text-xs text-care">
      {cfg.youcam === "mock"
        ? "Demo mode: skin scores are sample results shaped like YouCam's API. The cream check is real."
        : "The skin check is not set up on this server. The cream check still works."}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50";
  const look = variant === "primary" ? "bg-accent text-accent-ink hover:opacity-90" : "border border-line hover:bg-bg";
  return (
    <button className={`${base} ${look} ${className}`} {...rest}>
      {children}
    </button>
  );
}

const BAND_STYLE = {
  good: "bg-good",
  fair: "bg-care",
  care: "bg-bad",
} as const;

export function ScoreBar({ label, score, hint }: { label: string; score: number; hint?: string }) {
  const band = bandFor(score);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">
          {score} <span className="text-xs">· {BAND_LABEL[band]}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-line" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-2 rounded-full ${BAND_STYLE[band]}`} style={{ width: `${score}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const VERDICT_STYLE: Record<Verdict, string> = {
  avoid: "bg-bad-bg text-bad",
  care: "bg-care-bg text-care",
  ok: "bg-good-bg text-good",
  unknown: "bg-line text-muted",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  avoid: "Avoid",
  care: "Use with care",
  ok: "No red flags",
  unknown: "Unchecked",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT_STYLE[verdict]}`}>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export function verdictStyle(verdict: Verdict): string {
  return VERDICT_STYLE[verdict];
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{children}</p>;
}

/**
 * "Is it working?" Compares skin scores before and after a product was started.
 * Uses YouCam raw_score (not the kinder ui_score) and ignores changes smaller
 * than the photo-to-photo noise we expect from lighting and angle.
 */
import type { ConcernId } from "@/lib/skin/concerns";

export interface ScanScore {
  ui: number;
  raw: number;
}

export interface Scan {
  id: string;
  /** ISO date-time. */
  at: string;
  scores: Partial<Record<ConcernId, ScanScore>>;
  skinType?: string;
  fitzpatrick?: string;
  mode?: "mock" | "live";
}

export interface TrackedProduct {
  id: string;
  name: string;
  /** ISO date the user started using it. */
  startedAt: string;
  verdict: "avoid" | "care" | "ok" | "unknown";
  /** Concerns the user hopes it helps. */
  targets: ConcernId[];
}

export type Trend = "better" | "same" | "worse";

export interface ConcernChange {
  id: ConcernId;
  from: number;
  to: number;
  delta: number;
  trend: Trend;
}

export type Outcome = "need_baseline" | "need_rescan" | "too_early" | "improving" | "no_change" | "worse" | "mixed";

export interface ProductProgress {
  outcome: Outcome;
  daysUsed: number;
  baseline?: Scan;
  latest?: Scan;
  changes: ConcernChange[];
  message: string;
}

/** Raw-score changes this small are treated as "about the same". */
export const NOISE = 4;
/** Most skin products need about a month (one skin cycle) before judging. */
export const MIN_DAYS = 28;
/** A baseline scan can be up to this many days after starting. */
const BASELINE_GRACE_DAYS = 3;
const DAY = 86_400_000;

export function trendOf(delta: number, noise = NOISE): Trend {
  if (delta >= noise) return "better";
  if (delta <= -noise) return "worse";
  return "same";
}

export function compareScans(a: Scan, b: Scan, only?: ConcernId[]): ConcernChange[] {
  const ids = (only && only.length ? only : (Object.keys(b.scores) as ConcernId[])).filter(
    (id) => a.scores[id] && b.scores[id],
  );
  return ids.map((id) => {
    const from = a.scores[id]!.raw;
    const to = b.scores[id]!.raw;
    const delta = Math.round((to - from) * 10) / 10;
    return { id, from, to, delta, trend: trendOf(delta) };
  });
}

function sorted(scans: Scan[]): Scan[] {
  return [...scans].sort((x, y) => Date.parse(x.at) - Date.parse(y.at));
}

export function pickBaseline(scans: Scan[], startedAt: string): Scan | undefined {
  const start = Date.parse(startedAt);
  const list = sorted(scans);
  const before = list.filter((s) => Date.parse(s.at) <= start);
  if (before.length) return before[before.length - 1];
  return list.find((s) => Date.parse(s.at) - start <= BASELINE_GRACE_DAYS * DAY);
}

export function productProgress(scans: Scan[], product: TrackedProduct, now = new Date()): ProductProgress {
  const daysUsed = Math.max(0, Math.floor((now.getTime() - Date.parse(product.startedAt)) / DAY));
  const baseline = pickBaseline(scans, product.startedAt);
  if (!baseline) {
    return {
      outcome: "need_baseline",
      daysUsed,
      changes: [],
      message: "We need a skin check from around the day you started, to compare against. Do one now and we will measure from today.",
    };
  }
  const later = sorted(scans).filter((s) => Date.parse(s.at) > Date.parse(baseline.at));
  const latest = later[later.length - 1];
  if (!latest) {
    return {
      outcome: "need_rescan",
      daysUsed,
      baseline,
      changes: [],
      message: "Do another skin check in the same light and spot as before. We will compare the two.",
    };
  }

  const changes = compareScans(baseline, latest, product.targets.length ? product.targets : undefined);
  const spanDays = Math.floor((Date.parse(latest.at) - Date.parse(baseline.at)) / DAY);
  const worse = changes.filter((c) => c.trend === "worse");
  const better = changes.filter((c) => c.trend === "better");
  const irritation = worse.some((c) => c.id === "redness" || c.id === "acne");

  let outcome: Outcome;
  let message: string;
  if (irritation) {
    outcome = "worse";
    message =
      "Irritation or pimples got worse since you started. Stop this product for now. If it does not settle in a week, see a pharmacist or skin doctor.";
  } else if (spanDays < MIN_DAYS) {
    outcome = "too_early";
    message = `It has been ${spanDays} days between checks. Most products need about 4 weeks, and dark marks often need 8 to 12. Keep going and check again.`;
  } else if (better.length && !worse.length) {
    outcome = "improving";
    message = "Your scores are moving the right way. Keep using it as directed, with sunscreen.";
  } else if (worse.length && !better.length) {
    outcome = "worse";
    message = "Your scores got worse over this time. Consider stopping it and asking a pharmacist for a gentler option.";
  } else if (better.length && worse.length) {
    outcome = "mixed";
    message = "Some things improved and some got worse. Check your photos were taken in similar light before deciding.";
  } else {
    outcome = "no_change";
    message = `No clear change after ${spanDays} days. If you have used it for 12 weeks with no change, it may not be worth the money.`;
  }
  return { outcome, daysUsed, baseline, latest, changes, message };
}

"use client";
/**
 * Local-only storage (no accounts). Scores and product names live in this
 * browser's localStorage; photos are never stored.
 */
import type { Scan, TrackedProduct } from "@/lib/tracker/compare";
import type { SkinReport } from "@/lib/skin/report";
import type { ConcernId } from "@/lib/skin/concerns";

const KEY = "trueglow.v1";

export interface StoreState {
  scans: Scan[];
  products: TrackedProduct[];
  /** Last full report, for the results screen and the cream check. */
  lastReport?: SkinReport & { at: string; fileId?: string };
}

const EMPTY: StoreState = { scans: [], products: [] };

export function load(): StoreState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const s = JSON.parse(raw) as Partial<StoreState>;
    return { scans: s.scans ?? [], products: s.products ?? [], lastReport: s.lastReport };
  } catch {
    return { ...EMPTY };
  }
}

export function save(s: StoreState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("trueglow:store"));
  } catch {
    // Private mode or full storage: the app still works for this session.
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function addScan(report: SkinReport, mode: "mock" | "live", fileId?: string): Scan {
  const s = load();
  const at = new Date().toISOString();
  const scan: Scan = {
    id: uid(),
    at,
    mode,
    skinType: report.skinType.whole,
    fitzpatrick: report.fitzpatrick ?? s.lastReport?.fitzpatrick,
    scores: Object.fromEntries(report.concerns.map((c) => [c.id, { ui: c.uiScore, raw: c.rawScore }])),
  };
  s.scans.push(scan);
  s.lastReport = { ...report, fitzpatrick: report.fitzpatrick ?? s.lastReport?.fitzpatrick, at, fileId };
  save(s);
  return scan;
}

export function addProduct(p: Omit<TrackedProduct, "id">): TrackedProduct {
  const s = load();
  const product = { ...p, id: uid() };
  s.products.push(product);
  save(s);
  return product;
}

export function removeProduct(id: string): void {
  const s = load();
  s.products = s.products.filter((p) => p.id !== id);
  save(s);
}

export function clearAll(): void {
  save({ ...EMPTY });
}

/** Demo history: a product started 6 weeks ago with three check-ins. */
export function loadDemo(): void {
  const day = 86_400_000;
  const now = Date.now();
  const mk = (daysAgo: number, v: Partial<Record<ConcernId, number>>): Scan => ({
    id: uid(),
    at: new Date(now - daysAgo * day).toISOString(),
    mode: "mock",
    skinType: "Combination",
    fitzpatrick: "V",
    scores: Object.fromEntries(Object.entries(v).map(([k, raw]) => [k, { raw: raw!, ui: Math.round(45 + raw! / 2) }])),
  });
  save({
    scans: [
      mk(43, { acne: 48, spots: 41, redness: 66, oiliness: 45, texture: 58, moisture: 57, dark_circles: 52 }),
      mk(22, { acne: 54, spots: 44, redness: 69, oiliness: 47, texture: 61, moisture: 60, dark_circles: 53 }),
      mk(1, { acne: 61, spots: 49, redness: 72, oiliness: 50, texture: 63, moisture: 64, dark_circles: 52 }),
    ],
    products: [
      {
        id: uid(),
        name: "Niacinamide 5% + azelaic serum (demo)",
        startedAt: new Date(now - 42 * day).toISOString(),
        verdict: "ok",
        targets: ["acne", "spots"],
      },
    ],
  });
}

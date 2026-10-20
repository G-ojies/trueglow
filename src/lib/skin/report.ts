/**
 * Turns YouCam's skin-analysis JSON output into the app's SkinReport.
 */
import type { SkinOutputItem, Fitzpatrick } from "@/lib/youcam/schemas";
import { concernFromAction, type ConcernId } from "./concerns";

export interface ConcernScore {
  id: ConcernId;
  /** YouCam ui_score, 1-100, adjusted to read kindly. Shown to users. */
  uiScore: number;
  /** YouCam raw_score, 1-100, straight from the model. Used for tracking change. */
  rawScore: number;
  maskUrl?: string;
}

export interface SkinTypeResult {
  whole?: string;
  tZone?: string;
  uZone?: string;
}

export interface SkinReport {
  concerns: ConcernScore[];
  skinType: SkinTypeResult;
  skinAge?: number;
  overall?: number;
  fitzpatrick?: Fitzpatrick;
  resizedImageUrl?: string;
}

function clampScore(n: number | undefined): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

export function normalizeSkinOutput(output: SkinOutputItem[]): SkinReport {
  const report: SkinReport = { concerns: [], skinType: {} };
  const seen = new Set<ConcernId>();

  for (const item of output) {
    const type = item.type.replace(/^hd_/, "");
    if (type === "skin_age") {
      report.skinAge = clampScore(item.score);
      continue;
    }
    if (type === "all") {
      report.overall = clampScore(item.score);
      continue;
    }
    if (type === "resize_image") {
      report.resizedImageUrl = item.mask_urls?.[0];
      continue;
    }
    if (type === "skin_type") {
      const region = item.region ?? "whole";
      if (item.skin_type) {
        if (region === "t_zone") report.skinType.tZone = item.skin_type;
        else if (region === "u_zone") report.skinType.uZone = item.skin_type;
        else report.skinType.whole = item.skin_type;
      }
      continue;
    }
    const id = concernFromAction(type);
    if (!id) continue;
    // For concerns split by region (pore, wrinkle) keep the whole-face value.
    if (item.region && item.region !== "whole") continue;
    if (seen.has(id)) continue;
    const ui = clampScore(item.ui_score ?? item.raw_score);
    const raw = clampScore(item.raw_score ?? item.ui_score);
    if (ui === undefined || raw === undefined) continue;
    seen.add(id);
    report.concerns.push({
      id,
      uiScore: Math.round(ui),
      rawScore: Math.round(raw * 10) / 10,
      maskUrl: item.mask_urls?.[0],
    });
  }
  return report;
}

/** Concerns sorted from most in need of care to least (lowest score first). */
export function byNeed(concerns: ConcernScore[]): ConcernScore[] {
  return [...concerns].sort((a, b) => a.uiScore - b.uiScore);
}

/** The concerns worth acting on: ui_score under 80, worst first, at most `max`. */
export function focusConcerns(report: SkinReport, max = 3): ConcernId[] {
  return byNeed(report.concerns)
    .filter((c) => c.uiScore < 80)
    .slice(0, max)
    .map((c) => c.id);
}

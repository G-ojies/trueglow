/**
 * Builds YouCam AI Skin Simulation settings from a skin report.
 * We deliberately keep intensities moderate (max 0.5) and limit to 4 concerns
 * (4 units): the preview should look like steady, safe care, not a filter.
 */
import type { SimSettings } from "@/lib/youcam/schemas";
import { CONCERNS } from "./concerns";
import type { SkinReport } from "./report";
import { byNeed } from "./report";

export const SIM_MAX_INTENSITY = 0.5;
export const SIM_MAX_CONCERNS = 4;

export function buildSimSettings(report: SkinReport): SimSettings {
  const settings: SimSettings = {};
  let count = 0;
  for (const c of byNeed(report.concerns)) {
    if (count >= SIM_MAX_CONCERNS) break;
    const key = CONCERNS[c.id].sim;
    if (!key || c.uiScore >= 85) continue;
    const intensity = Math.min(SIM_MAX_INTENSITY, Math.max(0.2, (85 - c.uiScore) / 60));
    settings[key] = Math.round(intensity * 100) / 100;
    count++;
  }
  return settings;
}

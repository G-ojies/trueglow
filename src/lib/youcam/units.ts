/**
 * Unit costs from the YouCam docs (checked 2026-10-20). Units are only
 * deducted when a task finishes with task_status "success".
 *
 * AI Skin Analysis (v2.0 / v2.1), by number of concerns in dst_actions:
 *   1-4: 9 SD / 12 HD   5-8: 12 SD / 16 HD   9-12: 14 SD / 20 HD   13-16: 16 SD / 22 HD
 * AI Fitzpatrick Skin Type Analysis v1.0: 10
 * AI Skin Simulation: 1-4 concerns: 4, 5-10 concerns: 6
 */
export function skinAnalysisUnits(concernCount: number, hd = false): number {
  if (!Number.isInteger(concernCount) || concernCount < 1 || concernCount > 16) {
    throw new RangeError("Skin analysis takes 1 to 16 concerns");
  }
  if (concernCount <= 4) return hd ? 12 : 9;
  if (concernCount <= 8) return hd ? 16 : 12;
  if (concernCount <= 12) return hd ? 20 : 14;
  return hd ? 22 : 16;
}

export const FITZPATRICK_UNITS = 10;

export function skinSimulationUnits(activeConcerns: number): number {
  if (!Number.isInteger(activeConcerns) || activeConcerns < 1 || activeConcerns > 10) {
    throw new RangeError("Skin simulation takes 1 to 10 active concerns");
  }
  return activeConcerns <= 4 ? 4 : 6;
}

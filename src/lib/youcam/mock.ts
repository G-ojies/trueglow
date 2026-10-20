/**
 * Mock YouCam backend. Returns responses shaped exactly like the documented
 * API so the whole app runs end to end with no key and no units spent.
 *
 * Task IDs are self-describing ("mock.<kind>.<seed>.<createdMs>.<actions>")
 * so mock polling is stateless and works across server instances.
 */
import type { SdAction, SimSettings, Fitzpatrick } from "./schemas";

const MOCK_DELAY_MS = 2200;

/** Small deterministic PRNG so the same photo gives the same mock scores. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromBytes(bytes: Uint8Array): number {
  // FNV-1a over a sample of the bytes: cheap and stable.
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Typical raw scores for the concerns, before per-photo variation. */
const BASE_RAW: Partial<Record<SdAction, number>> = {
  acne: 58,
  age_spot: 52,
  oiliness: 49,
  redness: 74,
  texture: 63,
  moisture: 61,
  dark_circle_v2: 55,
  pore: 66,
  radiance: 70,
  wrinkle: 82,
  eye_bag: 78,
  firmness: 86,
  droopy_upper_eyelid: 84,
  droopy_lower_eyelid: 83,
  tear_trough: 80,
};

/** ui_score is a kinder, compressed version of raw_score (per YouCam docs). */
function uiFromRaw(raw: number): number {
  return Math.round(Math.min(99, Math.max(1, 45 + raw * 0.5)));
}

const SKIN_TYPES = ["Combination", "Oily", "Normal", "Dry", "Oily & Redness"] as const;

export function encodeMockTaskId(kind: string, seed: number, extra = ""): string {
  return ["mock", kind, seed.toString(36), Date.now().toString(36), extra].join(".");
}

export function decodeMockTaskId(taskId: string) {
  const [prefix, kind, seed36, created36, extra = ""] = taskId.split(".");
  if (prefix !== "mock" || !kind || !seed36 || !created36) return null;
  return {
    kind,
    seed: parseInt(seed36, 36),
    created: parseInt(created36, 36),
    extra,
  };
}

export function mockIsReady(created: number, now = Date.now()): boolean {
  return now - created >= MOCK_DELAY_MS;
}

export const mockRunning = { status: 200, data: { task_status: "running" as const } };

export function mockSkinAnalysisResult(seed: number, actions: SdAction[]) {
  const rand = mulberry32(seed);
  const output: Array<Record<string, unknown>> = [];
  for (const action of actions) {
    if (action === "skin_type") {
      const whole = SKIN_TYPES[Math.floor(rand() * SKIN_TYPES.length)];
      output.push({ type: "skin_type", region: "whole", skin_type: whole, mask_urls: [] });
      output.push({ type: "skin_type", region: "t_zone", skin_type: "Oily", mask_urls: [] });
      output.push({ type: "skin_type", region: "u_zone", skin_type: whole === "Oily" ? "Oily" : "Normal", mask_urls: [] });
      continue;
    }
    const base = BASE_RAW[action] ?? 70;
    const raw = Math.min(98, Math.max(8, base + (rand() - 0.5) * 24));
    output.push({
      type: action,
      region: "whole",
      raw_score: Math.round(raw * 100) / 100,
      ui_score: uiFromRaw(raw),
      mask_urls: [],
    });
  }
  const scored = output.filter((o) => typeof o.ui_score === "number") as Array<{ ui_score: number }>;
  const avg = scored.length ? scored.reduce((s, o) => s + o.ui_score, 0) / scored.length : 70;
  output.push({ type: "skin_age", score: 24 + Math.floor(rand() * 10) });
  output.push({ type: "all", score: Math.round(avg * 100) / 100 });
  output.push({ type: "resize_image", mask_urls: [] });
  return { status: 200, data: { task_status: "success" as const, results: { output } } };
}

export function mockFitzpatrickResult(seed: number) {
  // Bias mock toward the deeper types this app is built for.
  const types: Fitzpatrick[] = ["IV", "V", "V", "VI", "VI"];
  const t = types[seed % types.length];
  return {
    status: 200,
    data: { task_status: "success" as const, results: { fitzpatrick_scale: t, timed: 1.37 } },
  };
}

export function mockSimulationResult() {
  // No generated image in mock mode; the UI shows a clearly labelled stand-in.
  return { status: 200, data: { task_status: "success" as const, results: { url: "mock:simulation" } } };
}

export function encodeActions(actions: SdAction[]): string {
  return actions.join("~");
}
export function decodeActions(extra: string): SdAction[] {
  return extra.split("~").filter(Boolean) as SdAction[];
}
export function encodeSim(s: SimSettings): string {
  return Object.entries(s)
    .map(([k, v]) => `${k}~${v}`)
    .join("~");
}

/**
 * App-level skin concerns. Each maps to one YouCam SD skin analysis action.
 * YouCam scores run 1 to 100 where HIGHER means healthier-looking skin for
 * that concern (a high acne score means little visible acne).
 */
import type { SdAction, SimKey } from "@/lib/youcam/schemas";

export type ConcernId =
  | "acne"
  | "spots"
  | "oiliness"
  | "redness"
  | "texture"
  | "moisture"
  | "dark_circles"
  | "pores"
  | "radiance";

export interface ConcernInfo {
  id: ConcernId;
  action: SdAction;
  label: string;
  /** What the score is looking at, in plain words. */
  meaning: string;
  /** Short line shown when this concern needs care. */
  careTip: string;
  /** Matching YouCam skin simulation key, if one exists. */
  sim?: SimKey;
}

export const CONCERNS: Record<ConcernId, ConcernInfo> = {
  acne: {
    id: "acne",
    action: "acne",
    label: "Pimples",
    meaning: "How many pimples and blocked pores show on your face.",
    careTip: "Gentle cleansing and one proven pimple ingredient work better than many strong products.",
    sim: "acne",
  },
  spots: {
    id: "spots",
    action: "age_spot",
    label: "Dark marks and spots",
    meaning: "Patches that are darker than the skin around them, such as marks left after pimples or sun.",
    careTip: "Dark marks fade slowly. Daily sunscreen plus a safe spot-fading ingredient is the proven route.",
    sim: "spots",
  },
  oiliness: {
    id: "oiliness",
    action: "oiliness",
    label: "Oil and shine",
    meaning: "How much shine and oil the camera sees, mostly on the forehead, nose and chin.",
    careTip: "Light, water-based products and a gentle cleanser keep shine down without drying you out.",
  },
  redness: {
    id: "redness",
    action: "redness",
    label: "Irritation",
    meaning: "Signs of irritated or inflamed skin. On darker skin this can look more brown or purple than red.",
    careTip: "Irritation often means a product is too strong. Pause new actives and keep things simple.",
    sim: "redness",
  },
  texture: {
    id: "texture",
    action: "texture",
    label: "Smoothness",
    meaning: "How smooth or bumpy the skin surface looks.",
    careTip: "A mild exfoliating ingredient once or twice a week can help. More is not better.",
    sim: "texture",
  },
  moisture: {
    id: "moisture",
    action: "moisture",
    label: "Hydration",
    meaning: "How well your skin holds water. Low scores can mean dry or tight skin.",
    careTip: "A simple moisturiser with glycerin, ceramides or shea butter helps your skin barrier.",
  },
  dark_circles: {
    id: "dark_circles",
    action: "dark_circle_v2",
    label: "Under-eye darkness",
    meaning: "Darkness under the eyes. Some of this is natural, from genes and thin skin.",
    careTip: "Sleep, sunscreen and gentle eye products help a little. Bleaching creams near the eyes are risky.",
    sim: "dark_circle",
  },
  pores: {
    id: "pores",
    action: "pore",
    label: "Pores",
    meaning: "How visible your pores are.",
    careTip: "Pores cannot be closed, but keeping them clear makes them look smaller.",
    sim: "pores",
  },
  radiance: {
    id: "radiance",
    action: "radiance",
    label: "Glow",
    meaning: "How even and healthy the light on your skin looks. This is about evenness, not lightness.",
    careTip: "Healthy glow comes from hydration, sun protection and even tone, not from lightening.",
    sim: "radiance",
  },
};

/**
 * Default scan: 7 concerns + skin_type = 8 SD actions = 12 units per scan.
 * Chosen for this audience: pimples, dark marks and irritation are the usual
 * reasons people reach for "toning" creams.
 */
export const DEFAULT_CONCERNS: ConcernId[] = [
  "acne",
  "spots",
  "redness",
  "oiliness",
  "texture",
  "moisture",
  "dark_circles",
];

export function actionsFor(concerns: ConcernId[], includeSkinType = true): SdAction[] {
  const actions = concerns.map((c) => CONCERNS[c].action);
  if (includeSkinType) actions.push("skin_type");
  return Array.from(new Set(actions));
}

export function concernFromAction(type: string): ConcernId | null {
  const t = type.replace(/^hd_/, "");
  for (const c of Object.values(CONCERNS)) {
    if (c.action === t) return c.id;
  }
  if (t === "dark_circle") return "dark_circles";
  return null;
}

export type Band = "good" | "fair" | "care";

/** Plain-language band for a 1-100 ui_score. */
export function bandFor(uiScore: number): Band {
  if (uiScore >= 80) return "good";
  if (uiScore >= 65) return "fair";
  return "care";
}

export const BAND_LABEL: Record<Band, string> = {
  good: "Looking good",
  fair: "Some signs",
  care: "Worth caring for",
};

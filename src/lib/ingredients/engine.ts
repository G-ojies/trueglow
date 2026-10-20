/**
 * Cream check: a deterministic verdict on an ingredient list.
 * Same input always gives the same output; no network, no LLM.
 */
import type { ConcernId } from "@/lib/skin/concerns";
import {
  CLAIM_RULE,
  GOOD_INGREDIENTS,
  LOOK_FOR,
  RISK_RULES,
  type RiskLevel,
  type RiskRule,
} from "./rules";
import type { SourceId } from "./sources";

export type Verdict = "avoid" | "care" | "ok" | "unknown";

export interface Finding {
  ruleId: string;
  name: string;
  level: RiskLevel;
  /** The ingredient text as written on the label. */
  matched: string;
  percent?: number;
  why: string;
  todo: string;
  sources: SourceId[];
}

export interface Benefit {
  id: string;
  name: string;
  matched: string;
  helps: ConcernId[];
  note?: string;
}

export interface ConcernFit {
  concern: ConcernId;
  present: Benefit[];
  lookFor: string[];
}

export interface CreamResult {
  verdict: Verdict;
  headline: string;
  findings: Finding[];
  benefits: Benefit[];
  forYou: ConcernFit[];
  tips: string[];
  ingredientCount: number;
  hasSunscreen: boolean;
}

export interface CreamInput {
  ingredients: string | string[];
  productName?: string;
  /** Claims printed on the pack, e.g. "extra whitening". */
  claims?: string[];
  /** The user's focus concerns from their latest skin check. */
  concerns?: ConcernId[];
}

const MIN_INGREDIENTS = 3;

/** Lower case, strip accents, unify separators. */
export function normalizeIngredient(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1 $2")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9%.,()\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a label's ingredient text into items. Commas inside brackets do not
 * split, so "Butyrospermum Parkii (Shea, Karite) Butter" stays one item.
 */
export function parseIngredientList(text: string): string[] {
  const body = text.replace(/^\s*(ingredients?|composition|contains|inci)\s*[:\-]\s*/i, "");
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const chars = Array.from(body);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    // "1,4-Benzenediol" or "0,05%": a comma between digits is not a separator.
    const numericComma = ch === "," && /\d/.test(chars[i - 1] ?? "") && /\d/.test(chars[i + 1] ?? "");
    const isSep = depth === 0 && ((ch === "," && !numericComma) || ch === ";" || ch === "\n" || ch === "•" || ch === "|" || ch === "·");
    if (isSep) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out
    .map((s) => s.replace(/\s+/g, " ").replace(/^[\s.*]+|[\s.*]+$/g, "").trim())
    .filter((s) => s.length > 1 && s.length < 160);
}

/** Pull a strength like "4%" or "(2 %)" or "0.05% w/w" out of an item. */
export function extractPercent(item: string): number | undefined {
  const m = item.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
}

function ruleMatches(rule: RiskRule | { patterns: RegExp[]; unless?: RegExp[] }, norm: string): boolean {
  if (rule.unless?.some((re) => re.test(norm))) return false;
  return rule.patterns.some((re) => re.test(norm));
}

function hasClaim(texts: string[]): string | undefined {
  for (const t of texts) {
    const n = normalizeIngredient(t);
    if (CLAIM_RULE.patterns.some((re) => re.test(n))) return t;
  }
  return undefined;
}

export function checkCream(input: CreamInput): CreamResult {
  const items = Array.isArray(input.ingredients)
    ? input.ingredients.map((s) => s.trim()).filter(Boolean)
    : parseIngredientList(input.ingredients);
  const concerns = input.concerns ?? [];

  const findings: Finding[] = [];
  const benefits: Benefit[] = [];
  const seenRisk = new Set<string>();
  const seenGood = new Set<string>();

  const claimText = hasClaim([input.productName ?? "", ...(input.claims ?? [])]);

  // Product name can itself be a steroid medicine brand (e.g. "Dermovate").
  const nameNorm = normalizeIngredient(input.productName ?? "");
  const scanTargets = items.map((raw) => ({ raw, norm: normalizeIngredient(raw) }));
  if (nameNorm) scanTargets.push({ raw: input.productName ?? "", norm: nameNorm });

  for (const { raw, norm } of scanTargets) {
    for (const rule of RISK_RULES) {
      if (seenRisk.has(rule.id) || !ruleMatches(rule, norm)) continue;
      // Steroid brand rules (dermovate etc.) are fine to match on the name;
      // the generic word "steroid" in a name is not enough.
      if (raw === input.productName && rule.id === "other_potent_steroid") continue;
      seenRisk.add(rule.id);
      const percent = extractPercent(raw);
      let level: RiskLevel = rule.level;
      let why = rule.why;
      if (rule.id === "hydroquinone") {
        if (percent !== undefined && percent > 2) {
          level = "avoid";
          why = `This label says ${percent}% hydroquinone. ${rule.why}`;
        } else if (percent === undefined && claimText) {
          level = "avoid";
          why = `The strength is not printed and the pack makes a lightening claim. ${rule.why}`;
        }
      }
      findings.push({ ruleId: rule.id, name: rule.name, level, matched: raw, percent, why, todo: rule.todo, sources: rule.sources });
    }
  }

  for (const { raw, norm } of scanTargets.slice(0, items.length)) {
    for (const g of GOOD_INGREDIENTS) {
      if (seenGood.has(g.id) || !ruleMatches(g, norm)) continue;
      seenGood.add(g.id);
      benefits.push({ id: g.id, name: g.name, matched: raw, helps: g.helps, note: g.note });
    }
  }

  if (claimText) {
    findings.push({
      ruleId: CLAIM_RULE.id,
      name: CLAIM_RULE.name,
      level: "caution",
      matched: claimText,
      why: CLAIM_RULE.why,
      todo: CLAIM_RULE.todo,
      sources: CLAIM_RULE.sources,
    });
  }

  findings.sort((a, b) => (a.level === b.level ? 0 : a.level === "avoid" ? -1 : 1));

  const hasSunscreen = benefits.some((b) => b.id === "sunscreen");
  const forYou: ConcernFit[] = concerns.map((concern) => {
    const present = benefits.filter((b) => b.helps.includes(concern));
    const presentNames = new Set(present.map((p) => p.name.toLowerCase()));
    return {
      concern,
      present,
      lookFor: present.length ? [] : LOOK_FOR[concern].filter((n) => !presentNames.has(n.toLowerCase())).slice(0, 3),
    };
  });

  const tips: string[] = [];
  if (concerns.includes("spots") && !hasSunscreen) {
    tips.push("Dark marks get darker in the sun. Pair any spot treatment with a daily sunscreen of SPF 30 or more.");
  }
  if (benefits.some((b) => b.id === "aha" || b.id === "retinol" || b.id === "adapalene") && !hasSunscreen) {
    tips.push("This has an ingredient that makes skin more sun-sensitive. Use sunscreen every morning.");
  }

  let verdict: Verdict;
  if (findings.some((f) => f.level === "avoid")) verdict = "avoid";
  else if (items.length < MIN_INGREDIENTS) verdict = "unknown";
  else if (findings.some((f) => f.level === "caution")) verdict = "care";
  else verdict = "ok";

  const headline = HEADLINES[verdict];
  if (verdict === "unknown") {
    tips.unshift("A product with no full ingredient list cannot be checked. If the pack lists nothing, that alone is a reason not to put it on your skin.");
  }

  return { verdict, headline, findings, benefits, forYou, tips, ingredientCount: items.length, hasSunscreen };
}

const HEADLINES: Record<Verdict, string> = {
  avoid: "Do not use this on your skin",
  care: "Use with care",
  ok: "No harmful ingredients found",
  unknown: "Not enough information to check",
};

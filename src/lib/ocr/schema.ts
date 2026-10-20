/**
 * Validator for what the label-reading LLM returns. The LLM's only job is to
 * copy the ingredient list off a photo. Anything that does not fit this
 * schema is rejected; the safety verdict is always computed by our own code.
 */
import { z } from "zod";

export const LabelExtraction = z.object({
  product_name: z.string().trim().max(120).nullable().optional(),
  ingredients: z.array(z.string().trim().min(1).max(160)).max(120),
  claims: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  readable: z.boolean(),
});
export type LabelExtraction = z.infer<typeof LabelExtraction>;

export type ParseResult = { ok: true; data: LabelExtraction } | { ok: false; error: string };

/** Pull the first JSON object out of model text (models sometimes wrap it). */
export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function parseLabelExtraction(text: string): ParseResult {
  let json: unknown;
  try {
    json = extractJsonObject(text);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invalid JSON" };
  }
  const r = LabelExtraction.safeParse(json);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  // Drop duplicates and obvious non-ingredients the model might copy.
  const seen = new Set<string>();
  const ingredients = r.data.ingredients.filter((i) => {
    const k = i.toLowerCase();
    if (seen.has(k) || /^(ingredients?|inci|composition)\s*:?$/i.test(i)) return false;
    seen.add(k);
    return true;
  });
  return { ok: true, data: { ...r.data, ingredients } };
}

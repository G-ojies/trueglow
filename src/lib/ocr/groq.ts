/**
 * Label photo -> ingredient list, using a vision model on Groq's free tier.
 * Key comes from GROQ_API_KEY (server only).
 */
import "server-only";
import { parseLabelExtraction, type LabelExtraction } from "./schema";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3.8-27b";

export function ocrAvailable(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

const PROMPT = `You read skincare product labels. Copy, do not judge.
Return ONLY a JSON object with this shape:
{"product_name": string or null, "ingredients": string[], "claims": string[], "readable": boolean}
Rules:
- "ingredients": every item of the printed ingredient list, in order, exactly as printed, including any strength like "2%". One item per entry.
- "claims": short marketing phrases printed on the pack (for example "extra whitening", "toning lotion"). Max 10.
- If you cannot read an ingredient list, return "ingredients": [] and "readable": false.
- Never add ingredients that are not printed. No commentary.`;

export class OcrError extends Error {}

export async function readLabel(imageDataUrl: string): Promise<LabelExtraction> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new OcrError("ocr_unavailable");
  const model = process.env.GROQ_VISION_MODEL || DEFAULT_MODEL;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        reasoning_format: "hidden",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      lastError = `groq ${res.status}: ${(await res.text()).slice(0, 200)}`;
      if (res.status === 429 || res.status >= 500) continue;
      break;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    const parsed = parseLabelExtraction(text);
    if (parsed.ok) return parsed.data;
    lastError = `invalid extraction: ${parsed.error}`;
  }
  throw new OcrError(lastError || "ocr_failed");
}

import { youcamMode } from "@/lib/youcam/client";
import { ocrAvailable } from "@/lib/ocr/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the UI which mode it is in, without exposing any secret. */
export async function GET() {
  let mode: "mock" | "live" | "misconfigured" = "mock";
  try {
    mode = youcamMode();
  } catch {
    mode = "misconfigured";
  }
  return Response.json({ youcam: mode, ocr: ocrAvailable() });
}

import { readImage } from "@/lib/http";
import { OcrError, ocrAvailable, readLabel } from "@/lib/ocr/groq";
import { clientIp, reserve } from "@/lib/youcam/budget";
import { YouCamError } from "@/lib/youcam/errors";

export const runtime = "nodejs";

/** Reads the ingredient list off a label photo. Returns data only, no verdict. */
export async function POST(req: Request) {
  if (!ocrAvailable()) {
    return Response.json(
      { error: "ocr_unavailable", message: "Photo reading is off on this server. Please type the ingredients instead." },
      { status: 501 },
    );
  }
  try {
    reserve(`ocr:${clientIp(req)}`, 0, false);
    const form = await req.formData();
    const img = await readImage(form);
    if (img.bytes.byteLength > 4 * 1024 * 1024) {
      return Response.json({ error: "too_large", message: "That photo is too large. Try again." }, { status: 400 });
    }
    const dataUrl = `data:${img.type};base64,${Buffer.from(img.bytes).toString("base64")}`;
    const extraction = await readLabel(dataUrl);
    return Response.json(extraction);
  } catch (err) {
    if (err instanceof YouCamError) {
      return Response.json({ error: err.code, message: err.userMessage }, { status: err.httpStatus });
    }
    if (err instanceof OcrError) console.warn("[ocr]", err.message);
    else console.error(err);
    return Response.json(
      { error: "ocr_failed", message: "We could not read that label. Try a sharper, closer photo, or type the list." },
      { status: 502 },
    );
  }
}

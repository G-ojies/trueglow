import { z } from "zod";
import { readImage, jsonError } from "@/lib/http";
import { actionsFor, CONCERNS, DEFAULT_CONCERNS, type ConcernId } from "@/lib/skin/concerns";
import { startFitzpatrick, startSkinAnalysis, uploadImage, youcamMode } from "@/lib/youcam/client";
import { clientIp, reserve, trackTask } from "@/lib/youcam/budget";
import { FITZPATRICK_UNITS, skinAnalysisUnits } from "@/lib/youcam/units";

export const runtime = "nodejs";

const ConcernList = z
  .array(z.enum(Object.keys(CONCERNS) as [ConcernId, ...ConcernId[]]))
  .min(1)
  .max(15);

/**
 * Starts a skin check: uploads the selfie once, then runs AI Skin Analysis and
 * (optionally) AI Fitzpatrick Skin Type Analysis on the same file_id.
 */
export async function POST(req: Request) {
  try {
    const mode = youcamMode();
    const form = await req.formData();
    const image = await readImage(form);

    const concernsRaw = String(form.get("concerns") ?? "");
    const concerns = concernsRaw
      ? ConcernList.parse(concernsRaw.split(",").map((s) => s.trim()))
      : DEFAULT_CONCERNS;
    const wantFitz = form.get("fitzpatrick") === "1";
    // Fitzpatrick only accepts JPEG.
    const runFitz = wantFitz && image.type === "image/jpeg";

    const actions = actionsFor(concerns, true);
    const skinUnits = skinAnalysisUnits(actions.length);
    const fitzUnits = runFitz ? FITZPATRICK_UNITS : 0;
    reserve(clientIp(req), skinUnits + fitzUnits, mode === "live");

    const fileId = await uploadImage(image.bytes, image.type, image.name);
    const [skinTaskId, fitzTaskId] = await Promise.all([
      startSkinAnalysis(fileId, actions),
      runFitz ? startFitzpatrick(fileId) : Promise.resolve(null),
    ]);
    if (mode === "live") {
      trackTask(skinTaskId, `skin-analysis(${actions.length})`, skinUnits);
      if (fitzTaskId) trackTask(fitzTaskId, "fitzpatrick", fitzUnits);
    }

    return Response.json({
      mode,
      fileId,
      skinTaskId,
      fitzTaskId,
      actions,
      units: { skin: skinUnits, fitzpatrick: fitzUnits },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "invalid_parameter", message: "Unknown skin concern." }, { status: 400 });
    }
    return jsonError(err);
  }
}

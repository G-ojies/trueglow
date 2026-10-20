import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { getFitzpatrick, getSkinAnalysis, youcamMode } from "@/lib/youcam/client";
import { settleTask } from "@/lib/youcam/budget";
import { userMessageFor } from "@/lib/youcam/errors";
import { normalizeSkinOutput } from "@/lib/skin/report";

export const runtime = "nodejs";

/**
 * Polls both tasks once. The browser calls this every few seconds; the
 * Fitzpatrick result is optional, so its failure never blocks the report.
 */
export async function GET(req: NextRequest) {
  try {
    const skinTask = req.nextUrl.searchParams.get("skin");
    const fitzTask = req.nextUrl.searchParams.get("fitz");
    if (!skinTask) return Response.json({ error: "invalid_parameter" }, { status: 400 });
    const live = youcamMode() === "live";

    const [skin, fitz] = await Promise.all([
      getSkinAnalysis(skinTask),
      fitzTask ? getFitzpatrick(fitzTask).catch(() => null) : Promise.resolve(null),
    ]);

    const skinState = skin.data.task_status;
    const fitzState = fitz?.data.task_status ?? "success";

    if (skinState === "error") {
      if (live) await settleTask(skinTask, "error");
      return Response.json({
        state: "error",
        error: skin.data.error ?? "unknown_internal_error",
        message: userMessageFor(skin.data.error),
      });
    }
    if (skinState === "running" || fitzState === "running") {
      return Response.json({ state: "running" });
    }

    const results = skin.data.results;
    if (!results || typeof results === "string" || !("output" in results)) {
      return Response.json({ state: "error", error: "unexpected_shape", message: userMessageFor(null) });
    }
    const report = normalizeSkinOutput(results.output);
    if (fitz?.data.task_status === "success" && fitz.data.results) {
      report.fitzpatrick = fitz.data.results.fitzpatrick_scale;
    }
    if (live) {
      await settleTask(skinTask, "success");
      if (fitzTask) await settleTask(fitzTask, fitz?.data.task_status === "success" ? "success" : "error");
    }
    return Response.json({ state: "done", report });
  } catch (err) {
    return jsonError(err);
  }
}

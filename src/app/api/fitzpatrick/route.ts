import type { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getFitzpatrick, startFitzpatrick, youcamMode } from "@/lib/youcam/client";
import { clientIp, reserve, settleTask, trackTask } from "@/lib/youcam/budget";
import { FITZPATRICK_UNITS } from "@/lib/youcam/units";

export const runtime = "nodejs";

const Body = z.object({ fileId: z.string().min(1).max(512) });

/**
 * Starts AI Fitzpatrick Skin Type Analysis on the selfie already uploaded for
 * the skin check. The browser calls this only after the skin analysis
 * succeeded, so a rejected photo (no face, face too small) never spends the
 * Fitzpatrick units.
 */
export async function POST(req: Request) {
  try {
    const mode = youcamMode();
    const { fileId } = Body.parse(await req.json());
    reserve(clientIp(req), FITZPATRICK_UNITS, mode === "live");
    const taskId = await startFitzpatrick(fileId);
    if (mode === "live") trackTask(taskId, "fitzpatrick", FITZPATRICK_UNITS);
    return Response.json({ mode, taskId, units: FITZPATRICK_UNITS });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "invalid_parameter" }, { status: 400 });
    }
    return jsonError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const task = req.nextUrl.searchParams.get("task");
    if (!task) return Response.json({ error: "invalid_parameter" }, { status: 400 });
    const live = youcamMode() === "live";
    const r = await getFitzpatrick(task);
    const s = r.data.task_status;
    if (s === "running") return Response.json({ state: "running" });
    if (live) await settleTask(task, s);
    if (s === "error" || !r.data.results) return Response.json({ state: "error" });
    return Response.json({ state: "done", fitzpatrick: r.data.results.fitzpatrick_scale });
  } catch (err) {
    return jsonError(err);
  }
}

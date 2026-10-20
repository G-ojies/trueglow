import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { getSimulation, youcamMode } from "@/lib/youcam/client";
import { settleTask } from "@/lib/youcam/budget";
import { userMessageFor } from "@/lib/youcam/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const task = req.nextUrl.searchParams.get("task");
    if (!task) return Response.json({ error: "invalid_parameter" }, { status: 400 });
    const live = youcamMode() === "live";
    const r = await getSimulation(task);
    const s = r.data.task_status;
    if (s === "running") return Response.json({ state: "running" });
    if (live) await settleTask(task, s);
    if (s === "error") {
      return Response.json({ state: "error", error: r.data.error, message: userMessageFor(r.data.error) });
    }
    const results = r.data.results;
    const url = typeof results === "string" ? results : results?.url;
    if (!url) return Response.json({ state: "error", error: "unexpected_shape", message: userMessageFor(null) });
    return Response.json({ state: "done", url: url === "mock:simulation" ? null : url, mock: url === "mock:simulation" });
  } catch (err) {
    return jsonError(err);
  }
}

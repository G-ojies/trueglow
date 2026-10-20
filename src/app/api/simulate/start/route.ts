import { z } from "zod";
import { jsonError } from "@/lib/http";
import { SIM_KEYS, type SimKey } from "@/lib/youcam/schemas";
import { startSimulation, youcamMode } from "@/lib/youcam/client";
import { clientIp, reserve, trackTask } from "@/lib/youcam/budget";
import { skinSimulationUnits } from "@/lib/youcam/units";
import { SIM_MAX_CONCERNS, SIM_MAX_INTENSITY } from "@/lib/skin/simulation";

export const runtime = "nodejs";

const Body = z.object({
  fileId: z.string().min(1).max(512),
  settings: z
    .record(z.enum(SIM_KEYS as unknown as [SimKey, ...SimKey[]]), z.number().min(0).max(SIM_MAX_INTENSITY))
    .refine((s) => Object.values(s).some((v) => (v ?? 0) > 0), "at least one intensity above 0")
    .refine((s) => Object.keys(s).length <= SIM_MAX_CONCERNS, "too many concerns"),
});

/** Starts AI Skin Simulation on the selfie already uploaded for the skin check. */
export async function POST(req: Request) {
  try {
    const mode = youcamMode();
    const body = Body.parse(await req.json());
    const active = Object.values(body.settings).filter((v) => (v ?? 0) > 0).length;
    const units = skinSimulationUnits(active);
    reserve(clientIp(req), units, mode === "live");
    const taskId = await startSimulation(body.fileId, body.settings);
    if (mode === "live") trackTask(taskId, `skin-simulation(${active})`, units);
    return Response.json({ mode, taskId, units });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "invalid_parameter", message: "Preview settings were not valid." }, { status: 400 });
    }
    return jsonError(err);
  }
}

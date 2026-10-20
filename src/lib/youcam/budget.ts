/**
 * Protects a small unit budget in live mode:
 *   - per-IP rate limit on task creation
 *   - a daily unit cap (YOUCAM_DAILY_UNIT_CAP, default 150)
 *   - an append-only usage log (.youcam-usage.log) when the filesystem allows it
 * State is in memory per server instance, which is enough for a demo deployment.
 */
import "server-only";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { YouCamError } from "./errors";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_STARTS_PER_WINDOW = 8;

const starts = new Map<string, number[]>();
let day = "";
let unitsToday = 0;
const pendingUnits = new Map<string, { feature: string; units: number }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** Throws if this IP or today's budget cannot afford `units` more. */
export function reserve(ip: string, units: number, live: boolean): void {
  const now = Date.now();
  const list = (starts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_STARTS_PER_WINDOW) throw new YouCamError("rate_limited", 429);
  list.push(now);
  starts.set(ip, list);

  if (!live) return;
  if (day !== today()) {
    day = today();
    unitsToday = 0;
  }
  const cap = Number(process.env.YOUCAM_DAILY_UNIT_CAP ?? 150);
  if (unitsToday + units > cap) throw new YouCamError("daily_cap", 429);
  unitsToday += units;
}

export function trackTask(taskId: string, feature: string, units: number): void {
  pendingUnits.set(taskId, { feature, units });
}

/** Called when a live task reaches a final state. Logs units actually charged. */
export async function settleTask(taskId: string, status: "success" | "error"): Promise<void> {
  const p = pendingUnits.get(taskId);
  if (!p) return;
  pendingUnits.delete(taskId);
  if (status === "error") unitsToday = Math.max(0, unitsToday - p.units); // errors are not charged
  const line = JSON.stringify({
    at: new Date().toISOString(),
    feature: p.feature,
    status,
    units: status === "success" ? p.units : 0,
    task: taskId.slice(0, 12),
  });
  console.info(`[youcam-usage] ${line}`);
  try {
    await appendFile(path.join(process.cwd(), ".youcam-usage.log"), line + "\n");
  } catch {
    // Read-only filesystem (serverless); the console line is the record.
  }
}

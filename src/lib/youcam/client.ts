/**
 * Server-only YouCam client. The API key is read from the environment and is
 * never sent to the browser.
 *
 * Flow (docs.perfectcorp.com/develop/quick_start_guide):
 *   1. POST /s2s/v2.0/file           -> file_id + pre-signed PUT url
 *   2. PUT <url> (raw bytes)          -> file is now usable for 30 days
 *   3. POST /s2s/v2.0/task/<feature>  -> task_id
 *   4. GET  /s2s/v2.0/task/<feature>/<task_id> until task_status is success | error
 * Units are only charged when a task succeeds.
 */
import "server-only";
import { z } from "zod";
import {
  FileResponse,
  FitzpatrickStatus,
  RunError,
  RunTaskResponse,
  SimulationStatus,
  SkinAnalysisStatus,
  type SdAction,
  type SimSettings,
} from "./schemas";
import { YouCamError } from "./errors";
import {
  decodeActions,
  decodeMockTaskId,
  encodeActions,
  encodeMockTaskId,
  encodeSim,
  mockFitzpatrickResult,
  mockIsReady,
  mockRunning,
  mockSimulationResult,
  mockSkinAnalysisResult,
  seedFromBytes,
} from "./mock";

export const API_BASE = "https://yce-api-01.makeupar.com";

export type YouCamMode = "mock" | "live";

export function youcamMode(): YouCamMode {
  const m = (process.env.YOUCAM_MODE ?? "mock").toLowerCase();
  if (m === "live") {
    if (!process.env.YOUCAM_API_KEY) {
      throw new YouCamError("missing_api_key", 500, "YOUCAM_MODE=live but YOUCAM_API_KEY is not set");
    }
    return "live";
  }
  return "mock";
}

function apiKey(): string {
  const k = process.env.YOUCAM_API_KEY;
  if (!k) throw new YouCamError("missing_api_key", 500);
  return k;
}

async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  schema: z.ZodType<T>,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new YouCamError("bad_json", 502, `HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    if (res.status === 429) throw new YouCamError("rate_limited", 429);
    if (res.status === 401) throw new YouCamError("invalid_api_key", 500);
    const err = RunError.safeParse(json);
    const code = err.success ? (err.data.error_code ?? "http_error") : "http_error";
    throw new YouCamError(code, res.status >= 500 ? 502 : 400, err.success ? err.data.error : text.slice(0, 200));
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new YouCamError("unexpected_shape", 502, parsed.error.message.slice(0, 300));
  }
  return parsed.data;
}

/** Upload image bytes and return a YouCam file_id. */
export async function uploadImage(bytes: Uint8Array, contentType: string, fileName: string): Promise<string> {
  if (youcamMode() === "mock") return `mockfile.${seedFromBytes(bytes).toString(36)}`;
  const meta = await call(
    "/s2s/v2.0/file",
    {
      method: "POST",
      body: { files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }] },
    },
    FileResponse,
  );
  const file = meta.data.files[0];
  const req = file.requests[0];
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k] = String(v);
  // fetch sets Content-Length itself from the body; passing it can be rejected.
  delete headers["Content-Length"];
  delete headers["content-length"];
  const put = await fetch(req.url, {
    method: req.method || "PUT",
    headers,
    body: Buffer.from(bytes),
    signal: AbortSignal.timeout(60_000),
  });
  if (!put.ok) throw new YouCamError("error_upload", 502, `upload PUT ${put.status}`);
  return file.file_id;
}

function seedFromFileId(fileId: string): number {
  const s = fileId.startsWith("mockfile.") ? parseInt(fileId.slice(9), 36) : 0;
  return Number.isFinite(s) ? s : 0;
}

export async function startSkinAnalysis(fileId: string, actions: SdAction[]): Promise<string> {
  if (youcamMode() === "mock") return encodeMockTaskId("skin", seedFromFileId(fileId), encodeActions(actions));
  const r = await call(
    "/s2s/v2.0/task/skin-analysis",
    {
      method: "POST",
      body: {
        src_file_id: fileId,
        dst_actions: actions,
        miniserver_args: { enable_mask_overlay: true },
        format: "json",
      },
    },
    RunTaskResponse,
  );
  return r.data.task_id;
}

export async function getSkinAnalysis(taskId: string): Promise<SkinAnalysisStatus> {
  if (youcamMode() === "mock") {
    const t = decodeMockTaskId(taskId);
    if (!t || t.kind !== "skin") throw new YouCamError("invalid_task", 400);
    if (!mockIsReady(t.created)) return SkinAnalysisStatus.parse(mockRunning);
    return SkinAnalysisStatus.parse(mockSkinAnalysisResult(t.seed, decodeActions(t.extra)));
  }
  return call(`/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`, { method: "GET" }, SkinAnalysisStatus);
}

export async function startFitzpatrick(fileId: string): Promise<string> {
  if (youcamMode() === "mock") return encodeMockTaskId("fitz", seedFromFileId(fileId));
  const r = await call(
    "/s2s/v2.0/task/fitzpatrick-scale-analyzer",
    { method: "POST", body: { src_file_id: fileId, version: "1.0", index: 0 } },
    RunTaskResponse,
  );
  return r.data.task_id;
}

export async function getFitzpatrick(taskId: string): Promise<z.infer<typeof FitzpatrickStatus>> {
  if (youcamMode() === "mock") {
    const t = decodeMockTaskId(taskId);
    if (!t || t.kind !== "fitz") throw new YouCamError("invalid_task", 400);
    if (!mockIsReady(t.created)) return FitzpatrickStatus.parse(mockRunning);
    return FitzpatrickStatus.parse(mockFitzpatrickResult(t.seed));
  }
  return call(
    `/s2s/v2.0/task/fitzpatrick-scale-analyzer/${encodeURIComponent(taskId)}`,
    { method: "GET" },
    FitzpatrickStatus,
  );
}

export async function startSimulation(fileId: string, settings: SimSettings): Promise<string> {
  if (youcamMode() === "mock") return encodeMockTaskId("sim", seedFromFileId(fileId), encodeSim(settings));
  const r = await call(
    "/s2s/v2.0/task/skin-simulation",
    { method: "POST", body: { src_file_id: fileId, ...settings } },
    RunTaskResponse,
  );
  return r.data.task_id;
}

export async function getSimulation(taskId: string): Promise<z.infer<typeof SimulationStatus>> {
  if (youcamMode() === "mock") {
    const t = decodeMockTaskId(taskId);
    if (!t || t.kind !== "sim") throw new YouCamError("invalid_task", 400);
    if (!mockIsReady(t.created)) return SimulationStatus.parse(mockRunning);
    return SimulationStatus.parse(mockSimulationResult());
  }
  return call(`/s2s/v2.0/task/skin-simulation/${encodeURIComponent(taskId)}`, { method: "GET" }, SimulationStatus);
}

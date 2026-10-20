"use client";
/** Polls a status URL until it reports done or error, or the time runs out. */
export async function pollUntilDone<T extends { state: string }>(
  url: string,
  { intervalMs = 2500, timeoutMs = 120_000, signal }: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("cancelled");
    const res = await fetch(url, { cache: "no-store", signal });
    const body = (await res.json()) as T & { message?: string };
    if (!res.ok) throw new Error(body.message ?? "Something went wrong. Please try again.");
    if (body.state !== "running") return body;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("This is taking longer than usual. Please try again.");
}

export async function postJson<T>(url: string, body: BodyInit, json = false): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: json ? { "content-type": "application/json" } : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message ?? "Something went wrong. Please try again.");
  return data;
}

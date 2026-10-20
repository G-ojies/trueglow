"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, ErrorNote, ScoreBar, useConfig } from "@/components/ui";
import { prepareImage, MIN_SHORT_SIDE } from "@/lib/client/image";
import { pollUntilDone, postJson } from "@/lib/client/poll";
import { addScan } from "@/lib/client/store";
import { useStore } from "@/lib/client/useStore";
import { CONCERNS } from "@/lib/skin/concerns";
import { byNeed, focusConcerns, type SkinReport } from "@/lib/skin/report";
import { buildSimSettings } from "@/lib/skin/simulation";

type Phase = "idle" | "uploading" | "analysing" | "done";

interface StartResponse {
  mode: "mock" | "live";
  fileId: string;
  skinTaskId: string;
  fitzTaskId: string | null;
}

export default function ScanPage() {
  const cfg = useConfig();
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [report, setReport] = useState<SkinReport | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReport(null);
    try {
      const img = await prepareImage(file);
      if (Math.min(img.width, img.height) < MIN_SHORT_SIDE) {
        setError("That photo is too small. Use a photo at least 480 pixels on its shortest side.");
        return;
      }
      setPhoto(img.dataUrl);
      setPhase("uploading");
      const form = new FormData();
      form.set("image", img.blob, "selfie.jpg");
      form.set("fitzpatrick", "1");
      const start = await postJson<StartResponse>("/api/skin/start", form);
      setPhase("analysing");
      const q = new URLSearchParams({ skin: start.skinTaskId });
      if (start.fitzTaskId) q.set("fitz", start.fitzTaskId);
      const result = await pollUntilDone<{ state: string; report?: SkinReport; message?: string }>(
        `/api/skin/status?${q}`,
      );
      if (result.state !== "done" || !result.report) throw new Error(result.message ?? "The skin check failed.");
      addScan(result.report, start.mode, start.fileId);
      setReport(result.report);
      setFileId(start.fileId);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const shown = report ?? (phase === "idle" ? store?.lastReport ?? null : null);
  const busy = phase === "uploading" || phase === "analysing";
  const disabled = busy || cfg?.youcam === "misconfigured";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Skin check</h1>
        <p className="mt-2 text-muted">
          Face the light from a window, no makeup, hair off your face, phone at arm&apos;s length. Use the same spot
          each time so your re-checks compare fairly.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-4 text-center">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Your selfie" className="h-48 w-48 rounded-2xl object-cover" />
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          capture="user"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button onClick={() => input.current?.click()} disabled={disabled}>
          {busy ? (phase === "uploading" ? "Uploading..." : "Reading your skin...") : photo ? "Take another" : "Take or choose a selfie"}
        </Button>
        {busy && <p className="text-sm text-muted" aria-live="polite">This usually takes 10 to 30 seconds.</p>}
        {error && <ErrorNote>{error}</ErrorNote>}
      </Card>

      {shown && <Report report={shown} fileId={report ? fileId : null} photo={report ? photo : null} />}
    </div>
  );
}

function Report({ report, fileId, photo }: { report: SkinReport; fileId: string | null; photo: string | null }) {
  const focus = focusConcerns(report);
  return (
    <>
      <Card>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {report.skinType.whole && (
            <span>
              Skin type: <b>{report.skinType.whole}</b>
            </span>
          )}
          {report.fitzpatrick && (
            <span>
              Fitzpatrick tone: <b>Type {report.fitzpatrick}</b>
            </span>
          )}
        </div>
        <div className="mt-5 space-y-4">
          {byNeed(report.concerns).map((c) => (
            <ScoreBar key={c.id} label={CONCERNS[c.id].label} score={c.uiScore} hint={CONCERNS[c.id].meaning} />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Higher is better. Scores are from YouCam AI Skin Analysis.</p>
      </Card>

      {focus.length > 0 && (
        <Card>
          <h2 className="font-semibold">What to focus on</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {focus.map((id) => (
              <li key={id}>
                <b>{CONCERNS[id].label}.</b> <span className="text-muted">{CONCERNS[id].careTip}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/check"
            className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
          >
            Check a cream for these
          </Link>
        </Card>
      )}

      {fileId && <Preview report={report} fileId={fileId} photo={photo} />}
    </>
  );
}

/** YouCam Skin Simulation: a moderate "steady care" preview, never a filter-level change. */
function Preview({ report, fileId, photo }: { report: SkinReport; fileId: string; photo: string | null }) {
  const settings = buildSimSettings(report);
  const [state, setState] = useState<"idle" | "busy" | "done" | "mock">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!Object.keys(settings).length) return null;

  async function run() {
    setState("busy");
    setError(null);
    try {
      const start = await postJson<{ taskId: string }>("/api/simulate/start", JSON.stringify({ fileId, settings }), true);
      const r = await pollUntilDone<{ state: string; url?: string | null; mock?: boolean; message?: string }>(
        `/api/simulate/status?task=${encodeURIComponent(start.taskId)}`,
      );
      if (r.state !== "done") throw new Error(r.message ?? "The preview failed.");
      if (r.mock || !r.url) setState("mock");
      else {
        setUrl(r.url);
        setState("done");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The preview failed.");
      setState("idle");
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">What steady, safe care could look like</h2>
      <p className="mt-2 text-sm text-muted">
        A gentle preview from YouCam AI Skin Simulation for your focus areas. It shows realistic progress over months of
        safe care, with the same skin tone. No cream should change your tone.
      </p>
      {state === "done" && url && photo ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs text-muted">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Now" className="w-full rounded-xl" />
            <figcaption className="mt-1">Now</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Preview with steady care" className="w-full rounded-xl" />
            <figcaption className="mt-1">With steady care (preview)</figcaption>
          </figure>
        </div>
      ) : state === "mock" ? (
        <p className="mt-4 text-sm text-care">The preview image needs the live YouCam connection. Demo mode skips it.</p>
      ) : (
        <Button className="mt-4" variant="ghost" onClick={run} disabled={state === "busy"}>
          {state === "busy" ? "Making preview..." : "Show the preview"}
        </Button>
      )}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
    </Card>
  );
}

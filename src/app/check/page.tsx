"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, ErrorNote, VerdictBadge, useConfig, verdictStyle } from "@/components/ui";
import { prepareImage } from "@/lib/client/image";
import { postJson } from "@/lib/client/poll";
import { addProduct } from "@/lib/client/store";
import { useStore } from "@/lib/client/useStore";
import { checkCream, type CreamResult } from "@/lib/ingredients/engine";
import { SOURCES } from "@/lib/ingredients/sources";
import { CONCERNS, type ConcernId } from "@/lib/skin/concerns";
import { focusConcerns } from "@/lib/skin/report";

interface Extraction {
  product_name?: string | null;
  ingredients: string[];
  claims: string[];
  readable: boolean;
}

const EXAMPLE = {
  name: "Extra Whitening Body Cream (example)",
  ingredients: "Aqua, Glycerin, Mineral Oil, Hydroquinone 4%, Clobetasol Propionate 0.05%, Parfum, Methylparaben",
};

export default function CheckPage() {
  const cfg = useConfig();
  const store = useStore();
  const photoInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [claims, setClaims] = useState<string[]>([]);
  const [result, setResult] = useState<CreamResult | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracked, setTracked] = useState(false);

  const concerns: ConcernId[] = store?.lastReport ? focusConcerns(store.lastReport) : [];

  function run(n = name, ing = ingredients, cl = claims) {
    setTracked(false);
    setResult(checkCream({ productName: n, ingredients: ing, claims: cl, concerns }));
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const img = await prepareImage(file, 1600, 0.85);
      const form = new FormData();
      form.set("image", img.blob, "label.jpg");
      const ex = await postJson<Extraction>("/api/ocr", form);
      if (!ex.readable || !ex.ingredients.length) {
        setError("We could not read an ingredient list in that photo. Try a sharper, closer photo, or type it.");
        return;
      }
      const n = ex.product_name ?? name;
      const ing = ex.ingredients.join(", ");
      setName(n);
      setIngredients(ing);
      setClaims(ex.claims);
      run(n, ing, ex.claims);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reading the label failed.");
    } finally {
      setReading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  function track() {
    if (!result) return;
    addProduct({
      name: name.trim() || "Unnamed product",
      startedAt: new Date().toISOString(),
      verdict: result.verdict,
      targets: concerns,
    });
    setTracked(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Cream check</h1>
        <p className="mt-2 text-muted">
          Copy the ingredient list from the pack, or snap a photo of it. The verdict comes from fixed safety rules, so
          the same label always gets the same answer.
        </p>
      </div>

      <Card className="space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Product name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As written on the pack"
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Ingredients</span>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={5}
            placeholder="Aqua, Glycerin, Niacinamide, ..."
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => run()} disabled={!ingredients.trim() && !name.trim()}>
            Check it
          </Button>
          {cfg?.ocr && (
            <>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <Button variant="ghost" onClick={() => photoInput.current?.click()} disabled={reading}>
                {reading ? "Reading label..." : "Snap the label"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setName(EXAMPLE.name);
              setIngredients(EXAMPLE.ingredients);
              setClaims([]);
              run(EXAMPLE.name, EXAMPLE.ingredients, []);
            }}
          >
            Try an example
          </Button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        {concerns.length > 0 ? (
          <p className="text-xs text-muted">
            Matching against your last skin check: {concerns.map((c) => CONCERNS[c].label.toLowerCase()).join(", ")}.
          </p>
        ) : (
          <p className="text-xs text-muted">
            <Link href="/scan" className="underline">
              Do a skin check
            </Link>{" "}
            first to also see whether this product suits your skin.
          </p>
        )}
      </Card>

      {result && <Result result={result} onTrack={track} tracked={tracked} />}
    </div>
  );
}

function Result({ result, onTrack, tracked }: { result: CreamResult; onTrack: () => void; tracked: boolean }) {
  return (
    <div className="space-y-4" aria-live="polite">
      <section className={`rounded-2xl p-5 ${verdictStyle(result.verdict)}`}>
        <VerdictBadge verdict={result.verdict} />
        <h2 className="mt-2 font-display text-2xl font-semibold">{result.headline}</h2>
        <p className="mt-1 text-sm opacity-80">{result.ingredientCount} ingredients read.</p>
      </section>

      {result.findings.map((f) => (
        <Card key={f.ruleId}>
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={f.level === "avoid" ? "avoid" : "care"} />
            <h3 className="font-semibold">{f.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted">Found as: &ldquo;{f.matched}&rdquo;</p>
          <p className="mt-3 text-sm">{f.why}</p>
          <p className="mt-2 text-sm">
            <b>What to do:</b> {f.todo}
          </p>
          {f.sources.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {f.sources.map((s) => (
                <li key={s}>
                  Source:{" "}
                  <a href={SOURCES[s].url} target="_blank" rel="noreferrer" className="underline">
                    {SOURCES[s].publisher}, {SOURCES[s].year}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      {result.forYou.length > 0 && (
        <Card>
          <h3 className="font-semibold">For your skin</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {result.forYou.map((fit) => (
              <li key={fit.concern}>
                <b>{CONCERNS[fit.concern].label}:</b>{" "}
                {fit.present.length ? (
                  <span>has {fit.present.map((p) => p.name).join(", ")}.</span>
                ) : (
                  <span className="text-muted">nothing here targets this. Look for {fit.lookFor.join(", ")}.</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.benefits.length > 0 && result.forYou.length === 0 && (
        <Card>
          <h3 className="font-semibold">Helpful ingredients</h3>
          <p className="mt-2 text-sm">{result.benefits.map((b) => b.name).join(", ")}</p>
        </Card>
      )}

      {result.tips.length > 0 && (
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {result.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      )}

      {result.verdict !== "avoid" && result.verdict !== "unknown" && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Starting this product today? Track it and your next skin checks will be compared against today.</p>
          {tracked ? (
            <Link href="/progress" className="text-sm font-medium text-accent underline">
              Tracking. See progress
            </Link>
          ) : (
            <Button onClick={onTrack}>Track it</Button>
          )}
        </Card>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { Button, Card, VerdictBadge } from "@/components/ui";
import { clearAll, loadDemo, removeProduct } from "@/lib/client/store";
import { useStore } from "@/lib/client/useStore";
import { CONCERNS } from "@/lib/skin/concerns";
import { MIN_DAYS, productProgress, type Outcome, type Scan, type TrackedProduct } from "@/lib/tracker/compare";

const OUTCOME: Record<Outcome, { label: string; tone: string }> = {
  need_baseline: { label: "Needs a starting check", tone: "bg-line text-muted" },
  need_rescan: { label: "Re-check due", tone: "bg-care-bg text-care" },
  too_early: { label: "Too early to tell", tone: "bg-care-bg text-care" },
  improving: { label: "Improving", tone: "bg-good-bg text-good" },
  no_change: { label: "No clear change", tone: "bg-line text-muted" },
  worse: { label: "Getting worse", tone: "bg-bad-bg text-bad" },
  mixed: { label: "Mixed", tone: "bg-care-bg text-care" },
};

const TREND = { better: "↑ better", same: "about the same", worse: "↓ worse" } as const;

export default function ProgressPage() {
  const store = useStore();
  if (!store) return null;
  const empty = !store.products.length && !store.scans.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Is it working?</h1>
        <p className="mt-2 text-muted">
          Most products need about {MIN_DAYS / 7} weeks, and dark marks often 8 to 12. Re-check in the same light and
          spot each time. Small changes from lighting are ignored.
        </p>
      </div>

      {empty ? (
        <Card className="space-y-3 text-sm">
          <p>
            Nothing tracked yet. Do a{" "}
            <Link href="/scan" className="underline">
              skin check
            </Link>
            , then check and track a{" "}
            <Link href="/check" className="underline">
              cream
            </Link>
            .
          </p>
          <Button variant="ghost" onClick={loadDemo}>
            Load a 6-week demo history
          </Button>
        </Card>
      ) : (
        <>
          {store.products.map((p) => (
            <ProductCard key={p.id} product={p} scans={store.scans} />
          ))}
          {!store.products.length && (
            <Card className="text-sm">
              No products tracked yet.{" "}
              <Link href="/check" className="underline">
                Check a cream
              </Link>{" "}
              and press &ldquo;Track it&rdquo;.
            </Card>
          )}
          <Card>
            <h2 className="font-semibold">Your skin checks</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {[...store.scans].reverse().map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span>{new Date(s.at).toLocaleDateString()}</span>
                  <span className="text-muted">
                    {s.skinType ?? ""} {s.mode === "mock" ? "· demo" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/scan" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink">
                New skin check
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("Delete all your saved checks and products from this browser?")) clearAll();
                }}
              >
                Clear my data
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ProductCard({ product, scans }: { product: TrackedProduct; scans: Scan[] }) {
  const p = productProgress(scans, product);
  const o = OUTCOME[p.outcome];
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{product.name}</h2>
          <p className="text-xs text-muted">
            Day {p.daysUsed} · started {new Date(product.startedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <VerdictBadge verdict={product.verdict} />
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.tone}`}>{o.label}</span>
        </div>
      </div>
      <p className="mt-3 text-sm">{p.message}</p>
      {p.changes.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-normal">Concern</th>
              <th className="py-1 text-right font-normal">Start</th>
              <th className="py-1 text-right font-normal">Now</th>
              <th className="py-1 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {p.changes.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-1.5">{CONCERNS[c.id].label}</td>
                <td className="py-1.5 text-right tabular-nums">{c.from}</td>
                <td className="py-1.5 text-right tabular-nums">{c.to}</td>
                <td
                  className={`py-1.5 text-right ${
                    c.trend === "better" ? "text-good" : c.trend === "worse" ? "text-bad" : "text-muted"
                  }`}
                >
                  {TREND[c.trend]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={() => removeProduct(product.id)} className="mt-4 text-xs text-muted underline">
        Stop tracking
      </button>
    </Card>
  );
}

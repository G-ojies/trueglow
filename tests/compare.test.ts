import { describe, expect, it } from "vitest";
import { compareScans, pickBaseline, productProgress, trendOf, type Scan, type TrackedProduct } from "@/lib/tracker/compare";

const scan = (id: string, at: string, s: Record<string, number>): Scan => ({
  id,
  at,
  scores: Object.fromEntries(Object.entries(s).map(([k, raw]) => [k, { raw, ui: Math.round(45 + raw / 2) }])),
});

const product: TrackedProduct = {
  id: "p1",
  name: "Niacinamide serum",
  startedAt: "2026-09-01T09:00:00Z",
  verdict: "ok",
  targets: ["spots", "acne"],
};

describe("trendOf", () => {
  it("ignores changes inside the noise band", () => {
    expect(trendOf(3.9)).toBe("same");
    expect(trendOf(-3.9)).toBe("same");
    expect(trendOf(4)).toBe("better");
    expect(trendOf(-4)).toBe("worse");
  });
});

describe("compareScans", () => {
  it("compares only concerns present in both scans", () => {
    const a = scan("a", "2026-09-01T08:00:00Z", { spots: 50, acne: 60 });
    const b = scan("b", "2026-10-01T08:00:00Z", { spots: 58, redness: 70 });
    const c = compareScans(a, b);
    expect(c).toEqual([{ id: "spots", from: 50, to: 58, delta: 8, trend: "better" }]);
  });
});

describe("pickBaseline", () => {
  it("uses the last scan on or before the start date", () => {
    const scans = [
      scan("old", "2026-08-01T08:00:00Z", { spots: 40 }),
      scan("pre", "2026-08-31T08:00:00Z", { spots: 45 }),
      scan("post", "2026-09-20T08:00:00Z", { spots: 50 }),
    ];
    expect(pickBaseline(scans, product.startedAt)?.id).toBe("pre");
  });
  it("accepts a scan within 3 days after starting", () => {
    expect(pickBaseline([scan("s", "2026-09-03T08:00:00Z", { spots: 45 })], product.startedAt)?.id).toBe("s");
  });
  it("rejects a first scan long after starting", () => {
    expect(pickBaseline([scan("s", "2026-09-20T08:00:00Z", { spots: 45 })], product.startedAt)).toBeUndefined();
  });
});

describe("productProgress", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const base = scan("b", "2026-09-01T08:00:00Z", { spots: 48, acne: 55, redness: 70 });

  it("asks for a baseline when there is none", () => {
    expect(productProgress([], product, now).outcome).toBe("need_baseline");
  });
  it("asks for a re-scan when only the baseline exists", () => {
    expect(productProgress([base], product, now).outcome).toBe("need_rescan");
  });
  it("says too early before 4 weeks even if scores improved", () => {
    const r = productProgress([base, scan("l", "2026-09-15T08:00:00Z", { spots: 56, acne: 60 })], product, now);
    expect(r.outcome).toBe("too_early");
    expect(r.changes.map((c) => c.trend)).toEqual(["better", "better"]);
  });
  it("reports improving after 4+ weeks", () => {
    const r = productProgress([base, scan("l", "2026-10-10T08:00:00Z", { spots: 57, acne: 57 })], product, now);
    expect(r.outcome).toBe("improving");
    expect(r.daysUsed).toBe(44);
  });
  it("flags worse acne straight away, even early", () => {
    const r = productProgress([base, scan("l", "2026-09-08T08:00:00Z", { spots: 49, acne: 45 })], product, now);
    expect(r.outcome).toBe("worse");
    expect(r.message).toMatch(/Stop/);
  });
  it("reports no change after 4+ weeks of noise-level movement", () => {
    const r = productProgress([base, scan("l", "2026-10-10T08:00:00Z", { spots: 50, acne: 53 })], product, now);
    expect(r.outcome).toBe("no_change");
  });
  it("reports mixed results", () => {
    const p = { ...product, targets: ["spots", "texture"] as TrackedProduct["targets"] };
    const b2 = scan("b", "2026-09-01T08:00:00Z", { spots: 48, texture: 70 });
    const r = productProgress([b2, scan("l", "2026-10-10T08:00:00Z", { spots: 58, texture: 60 })], p, now);
    expect(r.outcome).toBe("mixed");
  });
  it("uses the latest scan, whatever the input order", () => {
    const r = productProgress(
      [scan("l2", "2026-10-12T08:00:00Z", { spots: 60, acne: 58 }), base, scan("l1", "2026-10-01T08:00:00Z", { spots: 50, acne: 55 })],
      product,
      now,
    );
    expect(r.latest?.id).toBe("l2");
  });
});

import { describe, expect, it } from "vitest";
import { FitzpatrickStatus, SimulationStatus, SkinAnalysisStatus } from "@/lib/youcam/schemas";
import { mockFitzpatrickResult, mockSimulationResult, mockSkinAnalysisResult, decodeMockTaskId, encodeMockTaskId } from "@/lib/youcam/mock";
import { skinAnalysisUnits, skinSimulationUnits } from "@/lib/youcam/units";
import { actionsFor, DEFAULT_CONCERNS } from "@/lib/skin/concerns";
import { normalizeSkinOutput, focusConcerns } from "@/lib/skin/report";
import { buildSimSettings } from "@/lib/skin/simulation";

describe("unit costs (from the docs)", () => {
  it("skin analysis tiers", () => {
    expect(skinAnalysisUnits(4)).toBe(9);
    expect(skinAnalysisUnits(8)).toBe(12);
    expect(skinAnalysisUnits(9)).toBe(14);
    expect(skinAnalysisUnits(16, true)).toBe(22);
    expect(() => skinAnalysisUnits(0)).toThrow();
  });
  it("default scan costs 12 units", () => {
    expect(skinAnalysisUnits(actionsFor(DEFAULT_CONCERNS).length)).toBe(12);
  });
  it("simulation tiers", () => {
    expect(skinSimulationUnits(4)).toBe(4);
    expect(skinSimulationUnits(5)).toBe(6);
  });
});

describe("documented response example parses and normalises", () => {
  // Trimmed copy of the format=json example in ai_skin_analysis.yaml.
  const doc = {
    status: 200,
    data: {
      task_status: "success",
      results: {
        output: [
          { type: "hd_pore", region: "whole", raw_score: 35.2, ui_score: 35, mask_urls: ["https://x/hd_pore_whole.jpg"] },
          { type: "hd_pore", region: "nose", raw_score: 45.7, ui_score: 46, mask_urls: ["https://x/nose.jpg"] },
          { type: "hd_acne", region: "whole", raw_score: 12.5, ui_score: 13, mask_urls: ["https://x/acne.jpg"] },
          { type: "hd_skin_type", region: "whole", skin_type: "Combination", mask_urls: [] },
          { type: "hd_skin_type", region: "t_zone", skin_type: "Oily", mask_urls: [] },
          { type: "skin_age", score: 29 },
          { type: "all", score: 28.5 },
          { type: "resize_image", mask_urls: ["https://x/resized.jpg"] },
        ],
      },
    },
  };
  it("parses with the schema", () => {
    expect(SkinAnalysisStatus.safeParse(doc).success).toBe(true);
  });
  it("normalises into a report", () => {
    const results = SkinAnalysisStatus.parse(doc).data.results as { output: Parameters<typeof normalizeSkinOutput>[0] };
    const r = normalizeSkinOutput(results.output);
    expect(r.concerns).toEqual([
      { id: "pores", uiScore: 35, rawScore: 35.2, maskUrl: "https://x/hd_pore_whole.jpg" },
      { id: "acne", uiScore: 13, rawScore: 12.5, maskUrl: "https://x/acne.jpg" },
    ]);
    expect(r.skinType).toEqual({ whole: "Combination", tZone: "Oily" });
    expect(r.skinAge).toBe(29);
    expect(r.overall).toBe(28.5);
    expect(r.resizedImageUrl).toBe("https://x/resized.jpg");
    expect(focusConcerns(r)).toEqual(["acne", "pores"]);
  });
  it("accepts the zip-format example where results is a URL string", () => {
    expect(SkinAnalysisStatus.safeParse({ status: 200, data: { task_status: "success", results: "https://x/zip" } }).success).toBe(true);
  });
});

describe("mock fixtures match the documented shapes", () => {
  const actions = actionsFor(DEFAULT_CONCERNS);
  it("skin analysis", () => {
    const m = mockSkinAnalysisResult(1234, actions);
    const parsed = SkinAnalysisStatus.parse(m);
    const out = (parsed.data.results as { output: never[] }).output;
    const r = normalizeSkinOutput(out);
    expect(r.concerns).toHaveLength(DEFAULT_CONCERNS.length);
    expect(r.skinType.whole).toBeTruthy();
    for (const c of r.concerns) {
      expect(c.uiScore).toBeGreaterThanOrEqual(1);
      expect(c.uiScore).toBeLessThanOrEqual(100);
    }
  });
  it("is deterministic per seed", () => {
    expect(mockSkinAnalysisResult(7, actions)).toEqual(mockSkinAnalysisResult(7, actions));
  });
  it("fitzpatrick and simulation", () => {
    expect(FitzpatrickStatus.parse(mockFitzpatrickResult(3)).data.results?.fitzpatrick_scale).toMatch(/^(IV|V|VI)$/);
    expect(SimulationStatus.safeParse(mockSimulationResult()).success).toBe(true);
  });
  it("task ids round-trip", () => {
    const id = encodeMockTaskId("skin", 99, "acne~redness");
    expect(decodeMockTaskId(id)).toMatchObject({ kind: "skin", seed: 99, extra: "acne~redness" });
    expect(decodeMockTaskId("real-task-id")).toBeNull();
  });
});

describe("simulation settings", () => {
  it("picks at most 4 concerns at moderate strength", () => {
    const r = normalizeSkinOutput(
      ["acne", "age_spot", "redness", "texture", "dark_circle_v2", "pore"].map((type, i) => ({
        type,
        raw_score: 30 + i,
        ui_score: 55 + i,
      })),
    );
    const s = buildSimSettings(r);
    const vals = Object.values(s);
    expect(vals.length).toBe(4);
    expect(Math.max(...vals)).toBeLessThanOrEqual(0.5);
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(0.2);
    expect(s.acne).toBeDefined();
  });
});

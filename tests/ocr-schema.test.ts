import { describe, expect, it } from "vitest";
import { extractJsonObject, parseLabelExtraction } from "@/lib/ocr/schema";

describe("parseLabelExtraction", () => {
  it("accepts a clean extraction", () => {
    const r = parseLabelExtraction(
      JSON.stringify({ product_name: "Glow Serum", ingredients: ["Aqua", "Niacinamide 5%"], claims: [], readable: true }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.ingredients).toEqual(["Aqua", "Niacinamide 5%"]);
  });

  it("strips code fences and think blocks", () => {
    const text = '<think>reading label</think>\n```json\n{"product_name":null,"ingredients":["Aqua"],"readable":true}\n```';
    const r = parseLabelExtraction(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.claims).toEqual([]);
  });

  it("removes duplicates and a stray 'Ingredients:' header item", () => {
    const r = parseLabelExtraction(
      JSON.stringify({ ingredients: ["Ingredients:", "Aqua", "aqua", "Glycerin"], readable: true }),
    );
    expect(r.ok && r.data.ingredients).toEqual(["Aqua", "Glycerin"]);
  });

  it("rejects wrong types", () => {
    const r = parseLabelExtraction(JSON.stringify({ ingredients: "Aqua, Glycerin", readable: true }));
    expect(r.ok).toBe(false);
  });

  it("rejects missing readable flag", () => {
    expect(parseLabelExtraction(JSON.stringify({ ingredients: [] })).ok).toBe(false);
  });

  it("rejects absurdly long items (model rambling)", () => {
    const r = parseLabelExtraction(JSON.stringify({ ingredients: ["x".repeat(500)], readable: true }));
    expect(r.ok).toBe(false);
  });

  it("rejects text with no JSON", () => {
    expect(parseLabelExtraction("I cannot read this label").ok).toBe(false);
    expect(() => extractJsonObject("no json")).toThrow();
  });
});

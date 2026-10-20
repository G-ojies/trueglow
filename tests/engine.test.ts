import { describe, expect, it } from "vitest";
import { checkCream, extractPercent, normalizeIngredient, parseIngredientList } from "@/lib/ingredients/engine";

const ids = (r: ReturnType<typeof checkCream>) => r.findings.map((f) => f.ruleId);

describe("parseIngredientList", () => {
  it("splits on commas, semicolons, newlines and bullets", () => {
    expect(parseIngredientList("Aqua, Glycerin; Niacinamide\nPanthenol • Allantoin")).toEqual([
      "Aqua",
      "Glycerin",
      "Niacinamide",
      "Panthenol",
      "Allantoin",
    ]);
  });
  it("keeps commas inside brackets and strips the Ingredients: prefix", () => {
    expect(parseIngredientList("Ingredients: Water, Butyrospermum Parkii (Shea, Karite) Butter, Parfum.")).toEqual([
      "Water",
      "Butyrospermum Parkii (Shea, Karite) Butter",
      "Parfum",
    ]);
  });
  it("does not split a comma between digits", () => {
    expect(parseIngredientList("Aqua, 1,4-Benzenediol, Clobetasol 0,05%")).toEqual(["Aqua", "1,4-Benzenediol", "Clobetasol 0,05%"]);
  });
  it("drops empty items", () => {
    expect(parseIngredientList("Water,, ,Glycerin,")).toEqual(["Water", "Glycerin"]);
  });
});

describe("helpers", () => {
  it("normalises accents, case and hyphens", () => {
    expect(normalizeIngredient("Mercúrio")).toBe("mercurio");
    expect(normalizeIngredient("1,4-Benzenediol")).toBe("1 4 benzenediol");
  });
  it("extracts a strength", () => {
    expect(extractPercent("Hydroquinone 4%")).toBe(4);
    expect(extractPercent("Clobetasol propionate (0,05 %)")).toBe(0.05);
    expect(extractPercent("Glycerin")).toBeUndefined();
  });
});

describe("dangerous ingredients", () => {
  it.each([
    ["Mercurous chloride"],
    ["Calomel"],
    ["Mercurio"],
    ["Ammoniated mercury"],
    ["Hydrargyri oxidum"],
    ["Phenylmercuric acetate"],
    ["Thimerosal"],
  ])("flags mercury as %s", (name) => {
    const r = checkCream({ ingredients: `Aqua, Petrolatum, ${name}, Parfum` });
    expect(r.verdict).toBe("avoid");
    expect(ids(r)).toContain("mercury");
  });

  it("does not flag the plant Mercurialis as mercury", () => {
    const r = checkCream({ ingredients: "Aqua, Glycerin, Mercurialis perennis extract" });
    expect(ids(r)).not.toContain("mercury");
  });

  it("flags clobetasol and betamethasone as strong steroids", () => {
    const r = checkCream({ ingredients: "Aqua, Clobetasol propionate 0.05%, Betamethasone dipropionate, Glycerin" });
    expect(r.verdict).toBe("avoid");
    expect(ids(r)).toEqual(expect.arrayContaining(["clobetasol", "betamethasone"]));
    expect(r.findings.find((f) => f.ruleId === "clobetasol")?.percent).toBe(0.05);
  });

  it.each(["Mometasone furoate", "Fluocinolone acetonide", "Dexamethasone", "Triamcinolone acetonide", "Halobetasol propionate"])(
    "flags %s as a strong steroid",
    (name) => {
      const r = checkCream({ ingredients: `Aqua, Cetearyl alcohol, ${name}` });
      expect(r.verdict).toBe("avoid");
      expect(ids(r)).toContain("other_potent_steroid");
    },
  );

  it("treats hydrocortisone as caution, not avoid", () => {
    const r = checkCream({ ingredients: "Aqua, Hydrocortisone 1%, Glycerin" });
    expect(r.verdict).toBe("care");
    expect(r.findings[0].level).toBe("caution");
  });

  it("flags a steroid medicine brand used as the product name", () => {
    const r = checkCream({ productName: "Dermovate cream", ingredients: "Propylene glycol, Glyceryl monostearate, Cetostearyl alcohol" });
    expect(ids(r)).toContain("clobetasol");
  });

  it("flags monobenzone without also reporting hydroquinone", () => {
    const r = checkCream({ ingredients: "Aqua, Monobenzyl ether of hydroquinone, Glycerin" });
    expect(ids(r)).toContain("monobenzone");
    expect(ids(r)).not.toContain("hydroquinone");
  });
});

describe("hydroquinone strength logic", () => {
  it("avoid above 2%", () => {
    const r = checkCream({ ingredients: "Aqua, Hydroquinone 4%, Glycerin" });
    expect(r.verdict).toBe("avoid");
    expect(r.findings[0].why).toMatch(/4%/);
  });
  it("caution at 2% or less", () => {
    const r = checkCream({ ingredients: "Aqua, Hydroquinone 2%, Glycerin" });
    expect(r.verdict).toBe("care");
  });
  it("avoid when strength is missing and the pack claims lightening", () => {
    const r = checkCream({ productName: "Extra Whitening Toning Lotion", ingredients: "Aqua, Hydroquinone, Glycerin" });
    expect(r.verdict).toBe("avoid");
    expect(ids(r)).toContain("lightening_claim");
  });
  it("caution when strength is missing and there is no claim", () => {
    const r = checkCream({ productName: "Night cream", ingredients: "Aqua, Hydroquinone, Glycerin" });
    expect(r.verdict).toBe("care");
  });
  it("recognises the chemical name 1,4-benzenediol", () => {
    const r = checkCream({ ingredients: "Aqua, 1,4-Benzenediol, Glycerin" });
    expect(ids(r)).toContain("hydroquinone");
  });
});

describe("safe products and matching", () => {
  const serum = "Aqua, Niacinamide 5%, Glycerin, Azelaic acid, Panthenol, Sodium hyaluronate, Phenoxyethanol";

  it("gives ok with no findings for a plain niacinamide serum", () => {
    const r = checkCream({ ingredients: serum });
    expect(r.verdict).toBe("ok");
    expect(r.findings).toHaveLength(0);
  });

  it("matches good ingredients to the user's concerns", () => {
    const r = checkCream({ ingredients: serum, concerns: ["spots", "acne", "texture"] });
    const spots = r.forYou.find((f) => f.concern === "spots")!;
    expect(spots.present.map((b) => b.id)).toEqual(expect.arrayContaining(["niacinamide", "azelaic"]));
    const texture = r.forYou.find((f) => f.concern === "texture")!;
    expect(texture.present).toHaveLength(0);
    expect(texture.lookFor.length).toBeGreaterThan(0);
  });

  it("reminds about sunscreen for dark marks when there is none", () => {
    const r = checkCream({ ingredients: serum, concerns: ["spots"] });
    expect(r.hasSunscreen).toBe(false);
    expect(r.tips.join(" ")).toMatch(/sunscreen/i);
  });

  it("detects sunscreen filters", () => {
    const r = checkCream({ ingredients: "Aqua, Zinc oxide, Octocrylene, Glycerin", concerns: ["spots"] });
    expect(r.hasSunscreen).toBe(true);
  });

  it("returns unknown when the list is too short to judge", () => {
    expect(checkCream({ ingredients: "Secret herbal formula" }).verdict).toBe("unknown");
  });

  it("still says avoid even with a short list if a poison is present", () => {
    expect(checkCream({ ingredients: "Mercury" }).verdict).toBe("avoid");
  });

  it("does not treat 'fair trade' as a lightening claim", () => {
    const r = checkCream({ productName: "Fair trade shea butter", ingredients: "Butyrospermum parkii butter, Tocopherol, Parfum" });
    expect(ids(r)).not.toContain("lightening_claim");
  });

  it("is deterministic", () => {
    const a = checkCream({ ingredients: serum, concerns: ["spots"] });
    const b = checkCream({ ingredients: serum, concerns: ["spots"] });
    expect(a).toEqual(b);
  });
});

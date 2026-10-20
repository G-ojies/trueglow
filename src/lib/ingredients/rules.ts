/**
 * Ingredient rules. Deterministic and reviewable: every warning a user sees
 * comes from this file, never from an LLM.
 *
 * Patterns run on a normalised ingredient (lower case, accents removed,
 * hyphens and slashes turned into spaces, spaces collapsed).
 */
import type { ConcernId } from "@/lib/skin/concerns";
import type { SourceId } from "./sources";

export type RiskLevel = "avoid" | "caution";

export interface RiskRule {
  id: string;
  name: string;
  level: RiskLevel;
  /** Any match flags the ingredient. */
  patterns: RegExp[];
  /** If any of these match the same ingredient, this rule is skipped. */
  unless?: RegExp[];
  why: string;
  todo: string;
  sources: SourceId[];
  group: "mercury" | "steroid" | "hydroquinone" | "bleach" | "metal" | "medicine" | "irritant" | "claim";
}

const STEROID_WHY =
  "This is a strong steroid medicine. In creams used every day for lightening it can thin the skin, cause stretch marks, pimples and dark or light patches, and can upset the body's own hormones.";
const STEROID_TODO =
  "Do not use this as a beauty cream. If you have used it daily for weeks, talk to a pharmacist or doctor before stopping, because stopping suddenly can cause a flare.";

export const RISK_RULES: RiskRule[] = [
  {
    id: "mercury",
    name: "Mercury",
    level: "avoid",
    group: "mercury",
    patterns: [
      /\bmercur(y|ic|ous|io)\b/,
      /\bcalomel\b/,
      /\bhydrargyr/,
      /\bquicksilver\b/,
      /\bhg\b/,
      /\bammoniated mercury\b/,
      /\bthi(o)?mersal\b|\bthimerosal\b/,
      /\bphenylmercur/,
    ],
    why: "Mercury is a poison. In skin creams and soaps it can damage the kidneys and nerves and cause rashes and scarring. It also harms people nearby and the environment.",
    todo: "Stop using it. Keep it away from children. If you have used it for a long time and feel tired, shaky or numb, see a doctor.",
    sources: ["who2011", "fda2022"],
  },
  {
    id: "clobetasol",
    name: "Clobetasol (very strong steroid)",
    level: "avoid",
    group: "steroid",
    patterns: [/\bclobetasol/, /\bclobetasone\b/, /\bdermovate\b/],
    why: STEROID_WHY,
    todo: STEROID_TODO,
    sources: ["ukzn2016", "mja2012"],
  },
  {
    id: "betamethasone",
    name: "Betamethasone (strong steroid)",
    level: "avoid",
    group: "steroid",
    patterns: [/\bbetamethason/, /\bbetnovate\b/, /\bdiprosone\b/],
    why: STEROID_WHY,
    todo: STEROID_TODO,
    sources: ["ukzn2016", "mja2012"],
  },
  {
    id: "other_potent_steroid",
    name: "Strong steroid medicine",
    level: "avoid",
    group: "steroid",
    patterns: [
      /\bhalobetasol\b|\bulobetasol\b/,
      /\bdiflucortolone\b/,
      /\bmometasone\b/,
      /\bfluocinon/,
      /\bfluocinolone\b/,
      /\bfluticasone\b/,
      /\btriamcinolone\b/,
      /\bdesoximetasone\b|\bdesoxymethasone\b/,
      /\bdexamethasone\b/,
      /\bbecl(o|ome)methasone\b|\bbeclometasone\b/,
      /\bamcinonide\b/,
      /\bhalcinonide\b/,
      /\bfluprednidene\b/,
      /\bprednisolone\b/,
      /\bcorticosteroid\b|\bsteroid\b/,
    ],
    why: STEROID_WHY,
    todo: STEROID_TODO,
    sources: ["ukzn2016", "mja2012"],
  },
  {
    id: "hydrocortisone",
    name: "Hydrocortisone (mild steroid)",
    level: "caution",
    group: "steroid",
    patterns: [/\bhydrocortison/],
    why: "A mild steroid medicine. Fine for a few days on a rash, but not as a daily face or lightening cream.",
    todo: "Use only for short periods, as a pharmacist advises. Not for daily beauty use.",
    sources: ["mja2012"],
  },
  {
    id: "monobenzone",
    name: "Monobenzone",
    level: "avoid",
    group: "bleach",
    patterns: [/\bmonobenzone\b/, /\bmonobenzyl ether of hydroquinone\b/, /\b4 benzyloxyphenol\b/],
    why: "A medicine that can permanently remove skin colour, including in places you did not apply it.",
    todo: "Do not use it as a cosmetic. It is only for rare medical cases under a skin doctor.",
    sources: ["ukzn2016"],
  },
  {
    id: "hydroquinone",
    name: "Hydroquinone",
    level: "caution",
    group: "hydroquinone",
    patterns: [/\bhydroquinon/, /\bquinol\b/, /\b1 4 benzenediol\b/, /\bbenzene 1 4 diol\b/, /\bhydroquinol\b/],
    unless: [/\bmonobenzyl ether\b/, /\bmonobenzone\b/],
    why: "A strong bleaching chemical. NAFDAC says creams with more than 2% are harmful. Long use can cause stubborn blue-black patches and irritation.",
    todo: "Only use it short term, under a pharmacist or doctor's guidance. Never above 2% without a prescription.",
    sources: ["nafdac2025", "ukzn2016"],
  },
  {
    id: "lead",
    name: "Lead",
    level: "avoid",
    group: "metal",
    patterns: [/^lead\b/, /\blead (acetate|oxide|carbonate)\b/, /\bplumbum\b/],
    why: "Lead is a poison and has no place in skin products.",
    todo: "Stop using it and keep it away from children.",
    sources: ["who2011"],
  },
  {
    id: "tretinoin",
    name: "Tretinoin (prescription retinoid)",
    level: "caution",
    group: "medicine",
    patterns: [/\btretinoin\b/, /\bretinoic acid\b/],
    why: "A prescription medicine. It works for pimples and dark marks, but it irritates at first, makes skin sun-sensitive, and must not be used in pregnancy.",
    todo: "Use only as a doctor or pharmacist advises, at night, with daily sunscreen.",
    sources: [],
  },
];

/** Marketing claims that often travel with hidden bleaching ingredients. */
export const CLAIM_RULE: RiskRule = {
  id: "lightening_claim",
  name: "Lightening claim on the pack",
  level: "caution",
  group: "claim",
  patterns: [
    /\bwhiten/,
    /\blighten/,
    /\bbleach/,
    /\btoning\b/,
    /\bfair(ness|er)?\b(?! trade)/,
    /\bbright(en|ening)? (fast|quick|in \d+ days)\b/,
    /\bextra white\b/,
  ],
  why: "Products sold to lighten skin are where mercury, high-strength hydroquinone and steroids are most often found, sometimes without being listed.",
  todo: "Be extra careful with unlabelled or imported lightening products. Buy from a registered pharmacy and check for a NAFDAC number.",
  sources: ["ukzn2016", "who2011"],
};

export interface GoodIngredient {
  id: string;
  name: string;
  patterns: RegExp[];
  helps: ConcernId[];
  note?: string;
  /** True for UV filters: counted as "this product has sunscreen". */
  uvFilter?: boolean;
}

export const GOOD_INGREDIENTS: GoodIngredient[] = [
  { id: "niacinamide", name: "Niacinamide", patterns: [/\bniacinamide\b/, /\bnicotinamide\b/], helps: ["spots", "oiliness", "redness", "pores", "acne", "radiance", "moisture"] },
  { id: "azelaic", name: "Azelaic acid", patterns: [/\bazelaic\b/, /\bazeloyl\b/], helps: ["spots", "acne", "redness"] },
  { id: "arbutin", name: "Alpha-arbutin", patterns: [/\barbutin\b/], helps: ["spots"] },
  { id: "tranexamic", name: "Tranexamic acid", patterns: [/\btranexamic\b/], helps: ["spots"] },
  {
    id: "vitamin_c",
    name: "Vitamin C",
    patterns: [/\bascorbic acid\b/, /\bascorbyl\b/, /\bascorbate\b/, /\bvitamin c\b/],
    helps: ["spots", "radiance", "dark_circles"],
  },
  {
    id: "licorice",
    name: "Licorice root extract",
    patterns: [/\bglycyrrhiza\b/, /\bglabridin\b/, /\bglycyrrhizate\b/, /\blicorice\b|\bliquorice\b/],
    helps: ["spots", "redness"],
  },
  { id: "kojic", name: "Kojic acid", patterns: [/\bkojic\b/], helps: ["spots"], note: "Can irritate some people. Patch test first." },
  { id: "salicylic", name: "Salicylic acid", patterns: [/\bsalicylic\b/, /\bbeta hydroxy\b/], helps: ["acne", "oiliness", "pores", "texture"] },
  { id: "benzoyl_peroxide", name: "Benzoyl peroxide", patterns: [/\bbenzoyl peroxide\b/], helps: ["acne"], note: "Can dry the skin and bleach towels and clothes." },
  { id: "adapalene", name: "Adapalene", patterns: [/\badapalene\b/], helps: ["acne", "texture"], note: "A retinoid. Start slowly, use sunscreen, and avoid in pregnancy." },
  {
    id: "retinol",
    name: "Retinol",
    patterns: [/\bretinol\b/, /\bretinal\b|\bretinaldehyde\b/, /\bretinyl\b/],
    helps: ["texture", "spots", "pores"],
    note: "Start two nights a week, use sunscreen, and avoid in pregnancy.",
  },
  {
    id: "aha",
    name: "Gentle exfoliating acid (AHA)",
    patterns: [/\bglycolic\b/, /\blactic acid\b/, /\bmandelic\b/],
    helps: ["texture", "spots"],
    note: "Overuse can cause new dark marks on deeper skin tones. Once or twice a week is plenty.",
  },
  { id: "sulfur", name: "Sulfur", patterns: [/^sulfur\b|^sulphur\b/], helps: ["acne", "oiliness"] },
  { id: "zinc_pca", name: "Zinc", patterns: [/\bzinc (pca|gluconate|sulfate|sulphate)\b/], helps: ["oiliness", "acne"] },
  { id: "clay", name: "Clay", patterns: [/\bkaolin\b/, /\bbentonite\b/], helps: ["oiliness"] },
  { id: "tea_tree", name: "Tea tree oil", patterns: [/\bmelaleuca alternifolia\b/, /\btea tree\b/], helps: ["acne"], note: "Can irritate if strong." },
  {
    id: "centella",
    name: "Centella (cica)",
    patterns: [/\bcentella\b/, /\bmadecassoside\b/, /\basiaticoside\b/, /\bcica\b/],
    helps: ["redness"],
  },
  { id: "allantoin", name: "Allantoin", patterns: [/\ballantoin\b/], helps: ["redness", "moisture"] },
  { id: "panthenol", name: "Panthenol (vitamin B5)", patterns: [/\bpanthenol\b/], helps: ["redness", "moisture"] },
  { id: "bisabolol", name: "Bisabolol", patterns: [/\bbisabolol\b/], helps: ["redness"] },
  { id: "oat", name: "Colloidal oatmeal", patterns: [/\bavena sativa\b/, /\bcolloidal oat/], helps: ["redness", "moisture"] },
  { id: "aloe", name: "Aloe vera", patterns: [/\baloe barbadensis\b/, /\baloe vera\b/], helps: ["redness", "moisture"] },
  { id: "glycerin", name: "Glycerin", patterns: [/\bglycerin(e)?\b/, /\bglycerol\b/], helps: ["moisture"] },
  { id: "hyaluronic", name: "Hyaluronic acid", patterns: [/\bhyaluron/], helps: ["moisture"] },
  { id: "ceramide", name: "Ceramides", patterns: [/\bceramide/], helps: ["moisture", "redness"] },
  { id: "squalane", name: "Squalane", patterns: [/\bsqualane\b/], helps: ["moisture"] },
  { id: "shea", name: "Shea butter", patterns: [/\bbutyrospermum parkii\b/, /\bvitellaria paradoxa\b/, /\bshea\b/], helps: ["moisture"] },
  { id: "urea", name: "Urea", patterns: [/^urea\b/], helps: ["moisture", "texture"] },
  { id: "caffeine", name: "Caffeine", patterns: [/\bcaffeine\b/], helps: ["dark_circles"] },
  {
    id: "sunscreen",
    name: "Sunscreen filter",
    uvFilter: true,
    patterns: [
      /\bzinc oxide\b/,
      /\btitanium dioxide\b/,
      /\bavobenzone\b/,
      /\bbutyl methoxydibenzoylmethane\b/,
      /\boctocrylene\b/,
      /\bethylhexyl methoxycinnamate\b|\boctinoxate\b/,
      /\bbis ethylhexyloxyphenol methoxyphenyl triazine\b|\bbemotrizinol\b/,
      /\bdiethylamino hydroxybenzoyl hexyl benzoate\b/,
      /\bethylhexyl triazone\b/,
      /\bhomosalate\b/,
      /\boctisalate\b|\bethylhexyl salicylate\b/,
      /\btinosorb\b/,
    ],
    helps: ["spots", "radiance", "dark_circles"],
  },
];

/** What to look for when a product has nothing for a concern. */
export const LOOK_FOR: Record<ConcernId, string[]> = {
  acne: ["Salicylic acid", "Benzoyl peroxide", "Azelaic acid", "Niacinamide", "Adapalene"],
  spots: ["Sunscreen (SPF 30 or more)", "Niacinamide", "Azelaic acid", "Alpha-arbutin", "Vitamin C", "Tranexamic acid"],
  oiliness: ["Niacinamide", "Salicylic acid", "Zinc", "Clay"],
  redness: ["Centella (cica)", "Panthenol", "Allantoin", "Colloidal oatmeal", "Niacinamide"],
  texture: ["Salicylic acid", "A gentle AHA such as lactic or mandelic acid", "Retinol"],
  moisture: ["Glycerin", "Ceramides", "Shea butter", "Hyaluronic acid"],
  dark_circles: ["Sunscreen", "Caffeine", "Vitamin C"],
  pores: ["Salicylic acid", "Niacinamide", "Retinol"],
  radiance: ["Sunscreen", "Vitamin C", "Niacinamide"],
};

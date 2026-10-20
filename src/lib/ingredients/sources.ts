/**
 * Sources behind the warnings. Each was opened and read on 2026-10-20.
 * Anything we could not verify is NOT used in user-facing text.
 */
export type SourceId = "who2011" | "fda2022" | "nafdac2025" | "ukzn2016" | "mja2012";

export interface Source {
  id: SourceId;
  title: string;
  publisher: string;
  year: number;
  url: string;
  /** What we rely on from this source. */
  supports: string;
}

export const SOURCES: Record<SourceId, Source> = {
  who2011: {
    id: "who2011",
    title: "Mercury in skin lightening products",
    publisher: "World Health Organization",
    year: 2011,
    url: "https://mercury.unitar.org/site/document/1284",
    supports: "Mercury is a common ingredient in skin lightening soaps and creams and can cause kidney damage, skin rashes and other harm.",
  },
  fda2022: {
    id: "fda2022",
    title: "Mercury Poisoning Linked to Skin Products",
    publisher: "U.S. Food and Drug Administration",
    year: 2022,
    url: "https://www.fda.gov/consumers/consumer-updates/mercury-poisoning-linked-skin-products",
    supports: "Label names for mercury: mercurous chloride, calomel, mercuric, mercurio, mercury. Lists symptoms of mercury poisoning.",
  },
  nafdac2025: {
    id: "nafdac2025",
    title: "NAFDAC warns against high-hydroquinone skin creams",
    publisher: "Voice of Nigeria, quoting NAFDAC's Bauchi State coordinator",
    year: 2025,
    url: "https://von.gov.ng/nafdac-warns-against-high-hydroquinone-skin-creams/",
    supports: "NAFDAC: creams with more than 2% hydroquinone are harmful; long-term use linked to serious conditions.",
  },
  ukzn2016: {
    id: "ukzn2016",
    title: "Skin lightening products in Ilorin, Nigeria (MPharm dissertation, M. Abdulkadir)",
    publisher: "University of KwaZulu-Natal",
    year: 2016,
    url: "https://researchspace.ukzn.ac.za/bitstream/10413/15301/1/Mahmoud_Abdulkadir_2016.pdf",
    supports: "Hydroquinone, mercury and very potent steroids such as clobetasol propionate and betamethasone dipropionate were still found in skin lightening products on the Nigerian market despite NAFDAC prohibition.",
  },
  mja2012: {
    id: "mja2012",
    title: "Skin lightening cream: an emerging medical challenge",
    publisher: "Medical Journal of Australia",
    year: 2012,
    url: "https://www.mja.com.au/journal/2012/196/11/skin-lightening-cream-emerging-medical-challenge",
    supports: "Case report: creams with hydroquinone, clobetasol propionate and betamethasone led to steroid side effects including skin fragility and stretch marks.",
  },
};

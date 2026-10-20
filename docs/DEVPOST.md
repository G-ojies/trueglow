# Devpost submission: TrueGlow

**Tagline:** Check your skin with YouCam AI, then check the cream before it touches your face.

**Links**
- Try it: https://trueglow-skin.vercel.app
- Code (MIT): https://github.com/G-ojies/trueglow
- Video: (YouTube link, after upload)

## Inspiration

In Nigeria, "toning", "whitening" and "carrot" creams sit on every market stall and in every beauty shop. Many people buy them to fix ordinary problems: pimples, the dark marks pimples leave behind, uneven tone. Some of those creams contain mercury, hydroquinone well above the 2% that NAFDAC says is harmful, or prescription steroids such as clobetasol, a very strong steroid medicine. A pharmacy dissertation that surveyed products in Ilorin found all three still on sale despite NAFDAC's ban. The damage is slow and hard to undo: thinned skin, stretch marks, blue-black patches, and steroid acne.

The buyer standing in front of that shelf has two questions and no one to ask: "What is actually wrong with my skin?" and "Is this cream safe, and will it help?" TrueGlow answers both, using YouCam's skin AI for the first and fixed safety rules for the second.

## What it does

TrueGlow is a mobile web app with three steps.

**1. Skin check (YouCam AI Skin Analysis + AI Fitzpatrick Skin Type Analysis).** One selfie. YouCam scores seven concerns chosen for this audience: pimples, dark marks and spots, irritation, oil, smoothness, hydration and under-eye darkness, plus skin type by zone. Fitzpatrick analysis reads skin tone. TrueGlow sorts the concerns by need, explains each in plain words (for example, irritation can look brown or purple on darker skin rather than red) and picks the three worth caring for.

**2. Cream check.** Type the ingredient list, or snap the label. A deterministic rule engine checks it and gives one of four verdicts: avoid, use with care, no red flags, or not enough information. It flags:
- mercury, under every label name the FDA lists (calomel, mercurous chloride, mercurio and others);
- hydroquinone, with the strength read off the label: above 2% is "avoid", and so is an unprinted strength on a pack that claims to lighten;
- clobetasol, betamethasone and other strong steroid medicines, including when the product name itself is a steroid brand;
- monobenzone, lead, prescription tretinoin, hydrocortisone in a beauty cream, and lightening claims on the pack.

Every warning says what to do and links to its source (WHO, FDA, NAFDAC via Voice of Nigeria, a University of KwaZulu-Natal dissertation on Nigerian products, and the Medical Journal of Australia). Then the cream is matched against your skin check: "Dark marks: nothing here targets this. Look for sunscreen, niacinamide, azelaic acid."

**3. Is it working?** Track a product you start using. Re-check your skin after four weeks in the same light, and TrueGlow compares YouCam raw scores against your starting check. Changes smaller than photo-to-photo noise are ignored. If irritation or pimples get worse, it tells you to stop. If it is too early, it says so, because dark marks often need 8 to 12 weeks.

**A safe-care preview (YouCam AI Skin Simulation).** After the skin check, you can see what months of steady, safe care could look like for your focus areas. Intensity is capped at 0.5 and the preview never changes skin tone, because the point of the app is that no cream should.

## Consumer and eCommerce value

TrueGlow sits at the moment of purchase, which is where the harm happens. For a shopper, it turns "this cream promises to clear my face" into "this cream has 4% hydroquinone and a strong steroid, and nothing in it targets the dark marks I actually have". For a pharmacy or an online beauty shop, the same check could screen a catalogue and recommend products by measured skin need instead of by "whitening" claims. The progress tracker gives people a reason to come back, and an honest answer when a product is not worth the money.

## How I built it

- **Next.js 16 (App Router), React 19, Tailwind CSS 4, Zod, Vitest.** Deployed on Vercel.
- **YouCam integration** (`src/lib/youcam/`): a typed client for the v2 file upload, task start and task polling flow, with Zod schemas for every response. The selfie is uploaded once and its `file_id` is reused for Skin Analysis, Fitzpatrick and Skin Simulation. A mock mode returns responses shaped exactly like the documented API, so the app could be built and tested before spending any units.
- **Unit budget** (`budget.ts`, `units.ts`): every call is costed from the published unit table and checked against a daily cap and a per-IP rate limit before it is sent. Fitzpatrick only runs after the skin analysis succeeds, so a rejected photo costs nothing.
- **Cream engine** (`src/lib/ingredients/`): pure, deterministic code with no network and no LLM. It splits real label text (commas inside brackets, "1,4-Benzenediol", "0,05%"), reads strengths, and applies the rules. The same label always gets the same answer.
- **Label photos** (optional): a vision model on Groq only copies the ingredient list off the photo. Its output must pass a strict schema before the engine sees it, and the verdict always comes from the rules, never from the model.
- **Privacy:** no accounts. Photos go to YouCam for analysis and are not stored by the app. Scores and tracked products stay in the browser.
- **Tests:** 67 unit tests cover the rule engine, label parsing, OCR validation, progress comparison and the YouCam client.

## Challenges

- **Getting a usable selfie.** My first live test came back `error_src_face_too_small` from a laptop webcam, where the face filled only a sixth of the frame. The app now shows YouCam's error as a plain instruction, and the capture guidance asks people to fill the photo with their face.
- **Not wasting units.** In the same test the Fitzpatrick task, started alongside the skin task, succeeded and was charged even though the skin analysis failed. I moved Fitzpatrick to run only after a successful skin analysis.
- **Writing rules that are strict but fair.** Hydroquinone is a legitimate short-term treatment at 2% or below, but dangerous above it, so the rule reads the printed strength. Hydrocortisone is mild but still a steroid, so it is "use with care", not "avoid". Every warning had to trace back to a source I had actually read; anything I could not verify was left out of the user-facing text.
- **Reading change honestly.** YouCam's `ui_score` is adjusted to read kindly, which is right for a report but wrong for tracking. The tracker compares `raw_score` and ignores changes smaller than lighting noise.

## Accomplishments I'm proud of

- A complete loop (measure, check, re-measure) rather than a one-off filter.
- The safety verdict is explainable and repeatable, with a source for every warning, while the AI does what it is good at: reading skin.
- The skin simulation is used responsibly: moderate, tone-preserving, and framed as "steady safe care", the opposite of a whitening advert.

## What I learned

How YouCam's task model works end to end (upload, start, poll, units charged only on success); the difference between `ui_score` and `raw_score` and when each one matters; and how much harm in this market comes from a few well-documented ingredients that are easy to check for once the label is in front of you.

## What's next

- Barcode lookup, so a shopper can scan a pack instead of typing.
- A NAFDAC registration number check alongside the ingredient check.
- Yoruba, Hausa, Igbo and Pidgin versions of the plain-language text.
- A pharmacy and shop mode that screens a whole product catalogue and recommends by measured skin need.

## Built with

nextjs, react, typescript, tailwindcss, zod, vitest, vercel, youcam-api, youcam-ai-skin-analysis, youcam-ai-fitzpatrick-skin-type-analysis, youcam-ai-skin-simulation, groq

## New this hackathon

TrueGlow was created from scratch during the submission period (first commit 20 October 2026).

## Screenshots to upload

1. Home: "Check your skin, then check the cream."
2. Skin check report with real scores and "What to focus on".
3. Safe-care preview (before and after).
4. Cream check: the "Do not use this on your skin" verdict with hydroquinone 4% and clobetasol findings and their sources.
5. Cream check: "For your skin", matched to the skin check.
6. Is it working?: a tracked product with the start and now comparison table.

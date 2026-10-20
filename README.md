# TrueGlow

**Check your skin, then check the cream.**

Live: https://trueglow-skin.vercel.app

Many "toning" and "whitening" creams sold in open markets in Nigeria contain mercury, hydroquinone above the 2% NAFDAC limit, or very strong steroids such as clobetasol. People buy them to fix pimples and dark marks, and the cream makes their skin worse. TrueGlow puts YouCam's skin AI in front of that purchase:

1. **Skin check.** One selfie. YouCam AI Skin Analysis scores pimples, dark marks, irritation, oil, smoothness, hydration and under-eye darkness, and YouCam AI Fitzpatrick Skin Type Analysis reads the skin tone. The app picks the three things worth caring for.
2. **Cream check.** Type the ingredient list or snap the label. A deterministic rule engine flags mercury, high-strength hydroquinone, potent steroids and lightening claims, links every warning to its source (WHO, FDA, NAFDAC, medical and academic reports), and says whether the product actually targets your concerns.
3. **Is it working?** Track a product, re-check after four weeks in the same light, and the app compares YouCam raw scores against your baseline, ignoring small lighting noise. It tells you to keep going, wait, or stop.

A gentle **YouCam AI Skin Simulation** preview shows what months of safe care could look like, at moderate intensity and with the same skin tone, because no cream should change your tone.

## Design choices

- **The verdict is never from an LLM.** `src/lib/ingredients/engine.ts` is pure, deterministic code: the same label always gets the same answer. An LLM (Groq, optional) only copies the ingredient list off a photo, and its output is schema-validated (`src/lib/ocr/schema.ts`) before the engine sees it.
- **Unit budget.** Every YouCam call is costed from the published unit table (`src/lib/youcam/units.ts`) and checked against a daily unit cap and a per-IP rate limit (`src/lib/youcam/budget.ts`) before it is sent. Units are only counted once a task succeeds.
- **Privacy.** Photos are sent to YouCam for analysis and never stored by the app. Scores and tracked products live in the browser's localStorage. There are no accounts.
- **Darker skin first.** Concern copy is written for darker skin tones (for example, irritation can look brown or purple rather than red), and the preview never lightens.

## Run it

```bash
npm install
cp .env.example .env.local   # YOUCAM_MODE=mock runs everything with no key
npm run dev
```

Set `YOUCAM_MODE=live` and `YOUCAM_API_KEY` to call the real YouCam API. Set `GROQ_API_KEY` to enable label photos.

```bash
npm test        # rule engine, OCR validation, progress comparison, YouCam client
npm run build
```

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Zod, Vitest. YouCam APIs: AI Skin Analysis, AI Fitzpatrick Skin Type Analysis, AI Skin Simulation.

TrueGlow gives general information, not medical advice.

## License

MIT

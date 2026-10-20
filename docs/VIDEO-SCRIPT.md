# TrueGlow demo video script

Target length: about 2:30 (the hard limit is 3:00; judges may stop watching after that).

Rules from the hackathon: explain the YouCam APIs used, show the app working on the device it was built for (a phone), upload publicly to YouTube, and use no third-party trademarks or copyrighted music. So: record on a phone, show only the built-in example cream (no real brand packs), and use no music, or a track you made or have rights to.

## Before recording

- Phone in Chrome at https://trueglow-skin.vercel.app, light mode, brightness up, notifications off (Do Not Disturb).
- On the phone, clear site data first so the skin check starts empty.
- Sit facing a window. Hold the phone close so your face fills most of the photo.
- Record the phone screen with Android's built-in screen recorder, and the voice-over separately or live.
- Budget: one take of the skin check costs 22 units, plus 4 for the preview. There are 978 left, so several takes are fine.

## Script

| Time | On screen | Voice-over |
| --- | --- | --- |
| 0:00 to 0:15 | Home page. Slow scroll over the headline and the three steps. | "In Nigeria, toning and whitening creams are everywhere. Some contain mercury, hydroquinone far above the legal limit, or strong steroid medicines. People buy them to fix pimples and dark marks, and end up with damaged skin. TrueGlow helps you check your skin, then check the cream." |
| 0:15 to 0:50 | Tap Skin check. Take a selfie. Show the "Reading your skin" state, then the report appearing. | "Step one is a skin check. I take one selfie. TrueGlow uploads it once to YouCam, then runs the YouCam AI Skin Analysis API on seven concerns: pimples, dark marks, irritation, oil, smoothness, hydration and under-eye darkness, plus skin type. When that succeeds, it runs YouCam's AI Fitzpatrick Skin Type Analysis on the same photo to read skin tone." |
| 0:50 to 1:10 | Scroll the scores. Pause on "What to focus on". | "Each score is explained in plain words, written for darker skin. Irritation, for example, often looks brown or purple rather than red. TrueGlow picks the three things worth caring for, here hydration, smoothness and under-eye darkness." |
| 1:10 to 1:25 | Tap "Show the preview". Before and after side by side. | "This preview uses the YouCam AI Skin Simulation API to show what months of steady, safe care could look like. I cap the intensity, and it never changes skin tone, because no cream should." |
| 1:25 to 2:05 | Tap Cream check. Tap "Try an example". Scroll the red verdict, the hydroquinone and clobetasol cards, and a source link. Then "For your skin". | "Step two: check the cream. I type the ingredient list or snap the label. This example has 4% hydroquinone and clobetasol, a very strong steroid. The verdict: do not use this on your skin. This verdict is not from a chatbot. It comes from fixed rules written from WHO, FDA and NAFDAC guidance, so the same label always gets the same answer, and every warning links to its source. TrueGlow also matches the cream to my skin check: it has glycerin for hydration, but nothing for smoothness or under-eye darkness, and it tells me what to look for instead." |
| 2:05 to 2:25 | Tap Is it working?. Load the 6-week demo history. Show the comparison table. | "Step three: is it working? Track a product, re-check after four weeks in the same light, and TrueGlow compares the YouCam scores against your starting check. It ignores small changes from lighting, and if irritation gets worse it tells you to stop." |
| 2:25 to 2:35 | Back to Home. Show the URL. | "TrueGlow: check your skin, then check the cream. It's live at trueglow-skin.vercel.app, and the code is open source." |

## Notes

- The 0:50 and 1:25 lines name your focus areas from the 20 October test (smoothness, under-eye darkness, hydration). If your report shows different ones on the day, change both lines to match.
- Leave out the "Snap the label" button unless a Groq key has been added (it is hidden without one).
- If a take runs long, cut the 1:10 preview segment first. The two required elements are the YouCam APIs explained and the phone footage.

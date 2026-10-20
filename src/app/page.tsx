import Link from "next/link";

const STEPS = [
  {
    href: "/scan",
    n: "1",
    title: "Check your skin",
    body: "One selfie. YouCam's skin AI scores pimples, dark marks, irritation, oil, smoothness, hydration and under-eye darkness.",
  },
  {
    href: "/check",
    n: "2",
    title: "Check the cream",
    body: "Type or snap the ingredient list. We flag mercury, hydroquinone over 2% and strong steroids, and say what actually helps your skin.",
  },
  {
    href: "/progress",
    n: "3",
    title: "See if it is working",
    body: "Re-check after four weeks in the same light. We compare the scores and tell you to keep going, wait, or stop.",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="pt-6">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">For buyers in Nigeria and beyond</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Check your skin, then check the cream.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Many &ldquo;toning&rdquo; creams sold in open markets contain mercury, high-strength hydroquinone or
          strong steroids. TrueGlow reads your skin with YouCam AI, checks the label before it touches your face, and
          tracks whether what you use is really helping.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/scan" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink">
            Start a skin check
          </Link>
          <Link href="/check" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">
            Check a cream now
          </Link>
        </div>
      </section>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block h-full rounded-2xl border border-line bg-surface p-5 hover:border-accent">
              <span className="font-display text-2xl text-accent">{s.n}</span>
              <h2 className="mt-1 font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </Link>
          </li>
        ))}
      </ol>

      <section className="rounded-2xl bg-surface p-5 text-sm text-muted ring-1 ring-line">
        <h2 className="font-semibold text-ink">How the verdict is made</h2>
        <p className="mt-2">
          The cream verdict comes from fixed rules written from WHO, FDA and NAFDAC guidance, not from a chatbot. The
          same label always gets the same answer, and every warning links to its source. AI is only used to score your
          skin (YouCam) and, if you choose, to copy the ingredient list off a photo.
        </p>
      </section>
    </div>
  );
}

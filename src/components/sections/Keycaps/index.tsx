import { sectionCopy } from "@/data/sections";

export function Keycaps() {
  const copy = sectionCopy.keycaps;

  return (
    <section
      id="keycaps"
      data-experience-section
      aria-labelledby="keycaps-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="max-w-3xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="keycaps-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
          {copy.body}
        </p>
        <ul className="mt-8 flex gap-4 text-sm text-white/80">
          {copy.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      </div>
    </section>
  );
}

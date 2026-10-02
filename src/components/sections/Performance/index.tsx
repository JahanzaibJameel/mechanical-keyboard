import { sectionCopy } from "@/data/sections";

export function Performance() {
  const copy = sectionCopy.performance;

  return (
    <section
      id="performance"
      data-experience-section
      aria-labelledby="performance-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-3xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="performance-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>
        <ul className="mt-9 grid gap-5 text-lg font-medium text-white sm:grid-cols-3">
          {copy.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      </div>
    </section>
  );
}

import { sectionCopy } from "@/data/sections";

export function Finale() {
  const copy = sectionCopy.finale;

  return (
    <section
      id="finale"
      data-experience-section
      aria-labelledby="finale-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 data-reveal="lead" id="finale-title" className="text-5xl font-semibold text-white sm:text-7xl">
          {copy.title}
        </h2>
        <p data-reveal="lead" className="mt-6 text-lg text-white/70">{copy.body}</p>
        <a className="mt-10 inline-flex border border-white/50 px-5 py-3 text-sm text-white transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" href="#intro">
          {copy.details[0]}
        </a>
      </div>
    </section>
  );
}

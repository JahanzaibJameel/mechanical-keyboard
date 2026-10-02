import { sectionCopy } from "@/data/sections";

export function Intro() {
  const copy = sectionCopy.intro;

  return (
    <section
      id="intro"
      data-experience-section
      aria-labelledby="intro-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="max-w-4xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="intro-title" className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
          {copy.body}
        </p>
      </div>
    </section>
  );
}

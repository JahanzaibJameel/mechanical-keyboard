import { sectionCopy } from "@/data/sections";

export function Construction() {
  const copy = sectionCopy.construction;

  return (
    <section
      id="construction"
      data-experience-section
      aria-labelledby="construction-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="max-w-3xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="construction-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
          {copy.body}
        </p>
        <ol className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/80">
          {copy.details.map((detail, index) => (
            <li key={detail}>{`${index + 1}. ${detail}`}</li>
          ))}
        </ol>
        {/* Exploded part list - appears progressively during explosion */}
        <ul className="mt-6 space-y-2">
          {[
            "KEYCAPS",
            "SWITCHES",
            "PLATE",
            "PCB",
            "CASE",
          ].map((part) => (
            <li key={part} className="text-xs text-white/50">
              {part}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { sectionCopy } from "@/data/sections";

export function ProductReveal() {
  const copy = sectionCopy.productReveal;

  return (
    <section
      id="productReveal"
      data-experience-section
      aria-labelledby="product-reveal-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-2xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="product-reveal-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
          {copy.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      </div>
    </section>
  );
}

import { sectionCopy } from "@/data/sections";

export function FinalProduct() {
  const copy = sectionCopy.finalProduct;

  return (
    <section
      id="finalProduct"
      data-experience-section
      aria-labelledby="final-product-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-2xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 data-reveal="lead" id="final-product-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p data-reveal="lead" className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
          {copy.details.map((detail) => <li data-reveal="detail" key={detail}>{detail}</li>)}
        </ul>
      </div>
    </section>
  );
}

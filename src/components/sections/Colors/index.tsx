"use client";

import { ColorSelector } from "@/components/ui/ColorSelector";
import { isCaseColorId, caseColorOptions } from "@/data/materials";
import { sectionCopy } from "@/data/sections";
import { useProductConfig } from "@/hooks/useProductConfig";

export function Colors() {
  const copy = sectionCopy.colors;
  const { config, setCase } = useProductConfig();

  return (
    <section
      id="colors"
      data-experience-section
      aria-labelledby="colors-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-2xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="colors-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>

        <div className="mt-10 border-l border-white/15 pl-6">
          <ColorSelector
            label="Case preview"
            onChange={(id) => {
              if (isCaseColorId(id)) {
                setCase(id);
              }
            }}
            options={caseColorOptions}
            value={config.case}
          />
          <p className="mt-4 max-w-md text-xs leading-relaxed text-white/50">
            Previewing the case finish. The full configurator lives in section 10.
          </p>
        </div>
      </div>
    </section>
  );
}
"use client";

import { ColorSelector } from "@/components/ui/ColorSelector";
import { ProductSelector } from "@/components/ui/ProductSelector";
import {
  caseColorOptions,
  isCaseColorId,
  isKeycapColorId,
  isSwitchTypeId,
  keycapColorOptions,
  switchTypeOptions,
} from "@/data/materials";
import { sectionCopy } from "@/data/sections";
import { useProductConfig } from "@/hooks/useProductConfig";

type SummaryCellProps = {
  readonly label: string;
  readonly value: string;
};

function SummaryCell({ label, value }: SummaryCellProps) {
  return (
    <div className="bg-[#0b0b0d] px-4 py-3">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/45">
        {label}
      </dt>
      <dd className="mt-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-white">
        {value}
      </dd>
    </div>
  );
}

function labelFor(options: readonly { readonly id: string; readonly label: string }[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

export function Configurator() {
  const copy = sectionCopy.configurator;
  const { config, setCase, setKeycaps, setSwitch, reset } = useProductConfig();

  return (
    <section
      id="configurator"
      data-experience-section
      aria-labelledby="configurator-title"
      className="relative z-10 min-h-[180dvh] px-8 sm:px-16"
    >
      <div className="sticky top-0 grid min-h-dvh items-center py-28">
        <div className="grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          <div>
            <p className="mb-5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-white/60">
              {copy.eyebrow}
            </p>
            <h2
              id="configurator-title"
              className="text-4xl font-semibold leading-tight text-white sm:text-6xl"
            >
              {copy.title}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{copy.body}</p>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-px border border-white/10 bg-white/10">
              <SummaryCell label="Case" value={labelFor(caseColorOptions, config.case)} />
              <SummaryCell label="Keycaps" value={labelFor(keycapColorOptions, config.keycaps)} />
              <SummaryCell label="Switch" value={labelFor(switchTypeOptions, config.switchType)} />
            </dl>
          </div>

          <div className="flex flex-col gap-8 border border-white/15 bg-[#0b0b0d]/80 p-6 backdrop-blur-sm sm:p-8">
            <ColorSelector
              label="Case"
              onChange={(id) => {
                if (isCaseColorId(id)) {
                  setCase(id);
                }
              }}
              options={caseColorOptions}
              value={config.case}
            />
            <ColorSelector
              label="Keycaps"
              onChange={(id) => {
                if (isKeycapColorId(id)) {
                  setKeycaps(id);
                }
              }}
              options={keycapColorOptions}
              value={config.keycaps}
            />
            <ProductSelector
              label="Switch"
              onChange={(id) => {
                if (isSwitchTypeId(id)) {
                  setSwitch(id);
                }
              }}
              options={switchTypeOptions}
              value={config.switchType}
            />

            <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/45">
                Session only
              </p>
              <button
                type="button"
                onClick={reset}
                className="border border-white/20 px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-white/70 transition-colors duration-200 ease-out motion-reduce:transition-none hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[24px]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
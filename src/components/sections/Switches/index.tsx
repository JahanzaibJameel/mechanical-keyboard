"use client";

import { useState } from "react";
import { ProductSelector } from "@/components/ui/ProductSelector";
import { setHeroSwitchPressed } from "@/components/three/heroSwitchPress";
import {
  isSwitchTypeId,
  switchTypeOptions,
} from "@/data/materials";
import { sectionCopy } from "@/data/sections";
import { useProductConfig } from "@/hooks/useProductConfig";

export function Switches() {
  const copy = sectionCopy.switches;
  const { config, setSwitch } = useProductConfig();
  const [pressed, setPressed] = useState(false);

  const pressSwitch = (): void => {
    setHeroSwitchPressed(true);
    setPressed(true);
  };

  const releaseSwitch = (): void => {
    setHeroSwitchPressed(false);
    setPressed(false);
  };

  return (
    <section
      id="switches"
      data-experience-section
      aria-labelledby="switches-title"
      className="relative z-10 grid min-h-dvh items-center px-8 py-24 sm:px-16"
    >
      <div className="ml-auto max-w-2xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2 id="switches-title" className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {copy.title}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>

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

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onPointerDown={pressSwitch}
            onPointerUp={releaseSwitch}
            onPointerLeave={releaseSwitch}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                pressSwitch();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === " " || event.key === "Enter") {
                releaseSwitch();
              }
            }}
            aria-pressed={pressed}
            className="group inline-flex min-h-[24px] items-center gap-3 border border-white/20 px-5 py-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-white transition-colors duration-200 ease-out motion-reduce:transition-none hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full border transition-transform duration-200 ease-out motion-reduce:transition-none ${
                pressed ? "scale-110 border-white/70 bg-white" : "border-white/25 group-hover:scale-110"
              }`}
            />
            {pressed ? "Releasing" : "Press the switch"}
          </button>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white/45">
            Mouse, touch or keyboard
          </p>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
          {copy.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      </div>
    </section>
  );
}
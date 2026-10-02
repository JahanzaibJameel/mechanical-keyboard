"use client";

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
      <div className="ml-auto max-w-2xl">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          {copy.eyebrow}
        </p>
        <h2
          id="keycaps-title"
          className="text-4xl font-semibold leading-tight text-white sm:text-6xl"
        >
          {copy.title}
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/70">{copy.body}</p>

        <ul className="mt-8 grid gap-6 text-sm text-white/80 sm:grid-cols-2">
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Profile
            </p>
            <p className="mt-1">
              A sculpted Cherry-profile shape keeps fingers aligned without
              fatigue, with a gently curved top surface and a rounded front face.
            </p>
          </li>
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Texture
            </p>
            <p className="mt-1">
              A lightly textured PBT surface resists slip and shine. The finish
              stays consistent through long days of typing.
            </p>
          </li>
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Legend
            </p>
            <p className="mt-1">
              Double-shot legends are molded into the cap rather than printed on
              top, so the legend stays crisp through wear and cleaning.
            </p>
          </li>
          <li>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Material
            </p>
            <p className="mt-1">
              PBT is colorfast and stiff. The plastic holds its shape and
              resists the oily sheen that appears on softer materials over time.
            </p>
          </li>
        </ul>

        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/80">
          {copy.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

# NØR 75

NØR 75 is a scroll-driven product experience for a fictional 75% mechanical
keyboard. The page is a single continuous scroll of twelve sections — intro,
hero, product reveal, materials, colors, construction, switches, keycaps,
performance, configurator, reassembly and finale — with one persistent WebGL
canvas behind them. Scroll position drives a single normalized progress value
that the camera rig and the part explosion both read from, so the copy and the
3D scene stay locked to the same timeline. The configurator lets a visitor pick
a case finish, a keycap set and a switch feel and see the model change in place.
It is a front-end demonstration, not a store: there is no checkout, no backend
and no product photography.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.3.7 (App Router, Turbopack) |
| UI runtime | React 19.2.8 |
| 3D | Three.js 0.182 + @react-three/fiber 9.8 + @react-three/drei 10.7 |
| Animation | GSAP 3.15 + @gsap/react (hero timeline only) |
| Styling | Tailwind CSS 4 |
| Unit tests | Vitest 4 |
| E2E tests | Playwright 1.63 |
| Language | TypeScript 5, strict, `noUncheckedIndexedAccess` |

## Architecture

Four layers. Each may import from the layers below it and never from the ones
above.

```
src/
  types/      no imports   — ProductConfig, CameraState, ProductPartsHandle
  data/       types        — sections, cameraStates, materials, productGeometry
  lib/        —            — brand tokens, storage key, tuning constants
  animation/  data, types  — timelines, camera transitions, reveal presets
  hooks/      data, lib    — progress, product config, reduced motion
  components/ all of above — sections, three/, layout/, ui/, typography/
  app/        components   — routes, metadata, globals
```

Two rules carry most of the weight:

- **Scroll progress is measured, not authored.** `useExperienceProgress` measures
  every `[data-experience-section]` in the document and writes normalized
  timeline windows back into the section table, so the camera schedule follows
  the real layout instead of drifting from hand-written constants.
- **The section components never drive the 3D scene.** They render copy and
  controls. The camera, the explosion and the part materials are all read from
  the shared progress value and the product config store, so no section needs to
  know about another.

## Commands

```bash
npm run dev             # development server on :3000
npm run build           # production build
npm run start           # serve the production build (required before e2e)
npm run lint            # eslint
npm run typecheck       # tsc --noEmit over the app and unit tests
npm run typecheck:tests # tsc over everything including tests/e2e; run after build
npm test                # vitest unit suite (tests/unit)
npm run e2e             # playwright suite (tests/e2e, starts the server itself)
```

The e2e suite and Lighthouse both measure the production build, so run
`npm run build` before either. `npm run typecheck:tests` inherits the root
config's include of `.next/types`, which Next generates during the build, so it
must also run after it. See [docs/architecture.md](docs/architecture.md#type-checking).

## Current status

Honest summary. The full item-by-item audit against the blueprint is the source
of truth for this section; the short version:

**Working and verified**

- Twelve sections render real, distinct copy, and every section has its own camera
  state — twelve sections, twelve states, no duplicates and no orphans, asserted
  by unit tests.
- Exploded view separates the five layers in the specified order
  (KEYCAPS → SWITCHES → PLATE → PCB → CASE) and Section 11 reverses it. Both are
  covered by unit tests.
- The configurator persists to `sessionStorage` and resets per tab. Case, keycap
  and switch selections all repaint the model immediately; the switch types are
  measurably distinct in the render.
- The hero switch is pressable by pointer, touch and keyboard, with the press
  state shared between the WebGL mesh and the DOM button.
- Three degradation paths are implemented and tested: no WebGL context, context
  loss mid-scroll, and a first-frame timeout. Each shows a static product image,
  the brand, an explanation, and a pointer to the specification, with the rest of
  the page still readable.
- A mobile tier renders below 768 px at a pinned device pixel ratio of 1 with
  antialiasing off.
- The specification is available as a semantic table bound to the canvas by
  `aria-describedby`, so there is a text equivalent of the scene.
- Lighthouse: Accessibility 100, Best Practices 100, SEO 100. Performance varies
  with host CPU contention; the blueprint target is 85 or better and the current
  median is above it. See [docs/performance.md](docs/performance.md).
- `npm run lint`, `npm run typecheck`, `npm run typecheck:tests`, `npm test` and
  `npm run build` all exit zero. `npm run e2e` passes 19 tests across 5 specs,
  including a 60-second scroll soak with a 0 MB heap delta and a reduced-motion
  walk over all twelve sections.

**Not built**

- **The 3D product is placeholder geometry.** There is no Blender source and no
  GLB. `ProductParts.tsx` assembles the keyboard from 78 untextured
  `boxGeometry` primitives — 1 case, 1 plate, 1 PCB, 75 switches, 75 keycaps.
  The keycap and material copy describes a sculpt and a PBT texture that exist
  only in prose. This is Tier 4 and is untouched.
- **No material pipeline.** `src/three/materials/` is empty. Surface values come
  from `src/data/materials.ts`, which is self-declared placeholder data.
- **No shaders or post-processing.** `src/three/shaders/**` is empty; there is no
  GLSL in the codebase and no `postprocessing` dependency. No custom cursor, no
  magnetic buttons, no Lenis smooth scroll — scrolling is native.
- **Camera and explosion regressions are not fully covered.** Reduced motion is
  discriminated by test for the Performance counters and the hero headline; the
  other ten sections are verified to render and log nothing, but the scene
  internals are not reachable from the page, so a camera regression there would
  not be caught.
- **The configurator uses `aria-pressed` in three groups rather than radio
  inputs.** Announced correctly and fully keyboard operable, but arrow-key roving
  focus is not implemented, because each option is its own tab stop.

**Also note**

- `docs/pre-development-spec.md` is a three-line placeholder. The original
  blueprint documents are not in this repository; the surviving specification is
  the milestone protocol in `.cursorrules`, which covers milestones E through K.
- The repository history begins at Milestone G. Milestones 0–F have no commits
  and no recoverable gate output.
- `.env.local` is committed on purpose: it holds `NEXT_PUBLIC_SITE_URL`, a public
  non-secret value that `metadataBase` needs to be deterministic. Replace the
  placeholder host at deploy time.

## Documentation

- [docs/architecture.md](docs/architecture.md) — the four layers and the
  dependency rules
- [docs/animation-system.md](docs/animation-system.md) — timelines, camera
  transitions, reduced-motion paths
- [docs/3d-pipeline.md](docs/3d-pipeline.md) — how the scene is actually built,
  and what is missing
- [docs/accessibility.md](docs/accessibility.md) — semantics, keyboard, focus,
  measured contrast and targets
- [docs/performance.md](docs/performance.md) — Lighthouse history and current
  baseline
- [docs/storyboard.md](docs/storyboard.md) — the twelve-section narrative and
  camera schedule
- [docs/pre-development-spec.md](docs/pre-development-spec.md) — scope note
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
npm run dev        # development server on :3000
npm run build      # production build
npm run start      # serve the production build (required before e2e)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest unit suite (tests/unit)
npm run e2e        # playwright suite (tests/e2e, starts the server itself)
```

The e2e suite and Lighthouse both measure the production build, so run
`npm run build` before either.

## Current status

Honest summary. The full item-by-item audit against the blueprint is the source
of truth for this section; the short version:

**Working and verified**

- Twelve sections render real, distinct copy. Nine of twelve have a dedicated
  camera state; Colors shares `threeQuarter` with Product reveal and Reassembly
  shares `exploded` with Construction.
- Exploded view separates the five layers in the specified order
  (KEYCAPS → SWITCHES → PLATE → PCB → CASE) and Section 11 reverses it. Both are
  covered by unit tests.
- The configurator persists to `sessionStorage` and resets per tab. Case and
  keycap selections repaint the model immediately.
- The hero switch is pressable by pointer, touch and keyboard, with the press
  state shared between the WebGL mesh and the DOM button.
- Lighthouse: Accessibility 100, Best Practices 100, SEO 100. Performance varies
  roughly 0.77–0.95 on the development host depending on CPU contention; the
  blueprint target is 85 or better. See [docs/performance.md](docs/performance.md).
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all exit
  zero. `npm run e2e` passes: 3 tests, including a 60-second scroll soak with a
  0 MB heap delta.

**Not built**

- **The 3D product is placeholder geometry.** There is no Blender source and no
  GLB. `ProductParts.tsx` assembles the keyboard from 78 untextured
  `boxGeometry` primitives — 1 case, 1 plate, 1 PCB, 75 switches, 75 keycaps.
  The keycap and material copy describes a sculpt and a PBT texture that exist
  only in prose.
- **No degradation tiers.** There is no WebGL fallback, no static fallback
  imagery, no context-loss or context-creation-failure handling, and no
  first-frame timeout. `MOBILE_LITE_BREAKPOINT` and `MOBILE_LITE_PIXEL_RATIO`
  are declared in `src/lib/constants.ts` and consumed by nothing. A visitor
  without WebGL gets the copy and no product.
- **No material pipeline.** `src/three/materials/` is empty. Surface values come
  from `src/data/materials.ts`, which is self-declared placeholder data.
- **Switch type has no visual effect.** All three options resolve to one
  identical material.
- **No shaders or post-processing.** `src/three/shaders/**` is empty; there is no
  GLSL in the codebase and no `postprocessing` dependency. No custom cursor, no
  magnetic buttons, no Lenis smooth scroll — scrolling is native.
- **The SEO surface is a shell.** Title, description and `metadataBase` only.
  No canonical URL, no `sitemap.ts`, no `robots.txt`, no Product JSON-LD, no
  icons in `public/icons/`, and the OG image is still an inline SVG with Arial
  text. Lighthouse SEO is 100 anyway, because that category does not require
  any of it.
- **Switch type, `MATERIAL_TRANSITION_LAMBDA` and `MATERIAL_SETTLE_EPSILON`**
  are declared but unused. Material changes are declarative prop swaps, so there
  is no damped transition in normal mode and nothing to suppress in reduced mode.

**Also note**

- `docs/pre-development-spec.md` and `docs/storyboard.md` are three-line
  placeholders. The original blueprint documents are not in this repository; the
  surviving specification is the milestone protocol in `.cursorrules`.
- Milestone J (Tier 3 fallback + SEO) and Milestone K (final QA) are unstarted.
- The repository history begins at Milestone G. Milestones 0–F have no commits
  and no recoverable gate output.

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
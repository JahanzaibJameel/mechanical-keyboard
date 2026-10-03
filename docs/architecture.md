# Architecture

How NØR 75 is put together as the code exists today.

## The four layers

Dependencies point strictly downward. A layer never imports from the one above
it.

| Layer | Path | May import | Contains |
| --- | --- | --- | --- |
| Types | `src/types/` | nothing | `ProductConfig`, `CameraState`, `ProductPartsHandle` |
| Data | `src/data/` | types | section table, camera states, materials, part dimensions |
| Logic | `src/lib/`, `src/animation/` | types, data | brand tokens, tuning constants, timelines, transitions, reveal presets |
| Hooks | `src/hooks/` | types, data, lib | scroll progress, product config store, reduced motion |
| Render | `src/components/`, `src/app/` | all of the above | sections, three/, layout/, ui/, typography/, routes |

`src/types/parts.ts` imports from `three` and `src/animation/config.ts` imports
`Vector3`, so "types imports nothing" is true of this codebase's own modules
rather than of the dependency graph at large.

## Two rules carry the design

### Scroll progress is measured, not authored

`src/data/sections.ts` ships a `sectionTable` with declared timeline windows,
used for the first paint, for SSR, and for no-JS clients. On mount,
`useExperienceProgress` walks every `[data-experience-section]` in the document,
converts each section's real pixel box into a normalized window against
`scrollHeight - innerHeight`, and writes the result back into the same table via
`applyMeasuredSectionRanges`.

Because the camera rig, the product timeline and the explosion all read from
that one table, they follow the real layout instead of drifting from constants
that were correct only until someone changed a section's height.
`applyMeasuredSectionRanges` rejects a partial set, so the schedule can never end
up half-measured.

Measurement is skipped when `window.scrollY === 0`: at scroll position zero the
answer is already known, and forcing the browser into a full synchronous layout
there cost roughly 170 ms on a throttled mobile CPU inside the window where the
intro copy is still waiting to paint. A reload that restores a scroll position
schedules the measurement immediately.

Re-measurement is triggered by a debounced `ResizeObserver` on
`document.documentElement`, by window resize, and by a change to the
reduced-motion media query — never by scroll, which only updates progress.

### Section components never drive the 3D scene

A section component renders copy and controls. It may read the product config
store (to render a selected state) and it may call `setHeroSwitchPressed`, but
it never touches the camera, the part transforms or the explosion amount.

Those are read directly from module state inside `useFrame`:
`ProductParts` reads `experienceProgressValue.current` to compute the explosion,
and `CameraRig` reads the same value plus the active section id. The only
cross-component imperative channel in the codebase is
`src/components/three/heroSwitchPress.ts`, a two-field module object that lets
the WebGL mesh and the Section 07 DOM button drive one press state.

## State

Two stores, both module-scoped rather than React context.

`useProductConfig` uses `useSyncExternalStore` over a module-level object with a
listener set. The comment in the file explains why: the canvas lives under a
dynamically imported client-only branch, so configuration cannot be threaded
down through context from the layout. Selection is persisted to
`sessionStorage` under `nor75:config` and validated field by field by
`parseStoredConfig`, so a partial or corrupt payload degrades to defaults rather
than throwing.

`heroSwitchPress` is a plain mutable object plus a registered invalidation
callback. It exists for the same reason — two very different callers, one shared
value.

## Rendering path

```
src/app/page.tsx
  └─ SiteShell (client)
       ├─ skip link
       ├─ Navigation, SectionRail      — next/dynamic, ssr: false
       ├─ fixed inset-0 layer
       │    └─ ExperienceCanvas (client)
       │         ├─ ProductCanvas      — runtime import() on first user intent
       │         │    └─ Canvas → ProductScene
       │         │         ├─ Environment
       │         │         ├─ CameraRig
       │         │         └─ ProductParts
       │         └─ Hero               — GSAP timeline
       └─ <main> — the twelve sections
```

`SiteShell` owns the reveal pass: on every active-section change it toggles
`opacity`/`translate` classes on the section nodes and, separately, fades the
hero. The hero query is scoped to `document` rather than to `<main>`, because the
hero is rendered inside the fixed canvas layer and is therefore a sibling of
`<main>`.

## Entry points

| File | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | fonts, `metadataBase`, title, description |
| `src/app/page.tsx` | mounts `SiteShell` and the twelve sections |
| `src/app/opengraph-image.tsx` | inline SVG response (still the original Arial placeholder) |
| `src/components/layout/SiteShell.tsx` | chrome, canvas slot, reveal pass, skip link |
| `src/components/three/ExperienceCanvas.tsx` | intent detection, deferred canvas import |
| `src/components/three/ProductCanvas.tsx` | the `Canvas` itself |
| `src/components/three/ProductScene.tsx` | environment + camera + parts |
| `src/components/three/CameraRig.tsx` | camera placement and damping |

## Known inconsistencies

- `src/components/sections/Performance/index.tsx` is the only section that does
  not read from `sectionCopy`. Its eyebrow, title and body are inlined in the
  component, so `sectionCopy.performance` in `src/data/sections.ts` is dead copy
  that has to be kept in sync by hand.
- `src/lib/constants.ts` exports `MOBILE_LITE_BREAKPOINT`,
  `MOBILE_LITE_PIXEL_RATIO`, `MATERIAL_TRANSITION_LAMBDA` and
  `MATERIAL_SETTLE_EPSILON`. None of the four has a consumer. They describe a
  mobile degradation tier and a damped material transition that were never built.
- `src/three/materials/`, `src/three/shaders/**` and `src/three/loaders/` exist
  as empty directories.

## What is not here

- No state management library. No Redux, Zustand or context beyond
  `ActiveSectionContext`, which exists only to pass the active section id to the
  canvas layer.
- No smooth-scroll library. Scrolling is native and progress is read from
  `window.scrollY`.
- No asset pipeline. See [3d-pipeline.md](3d-pipeline.md).
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

- `src/components/sections/Performance/index.tsx` inlines its own eyebrow, title
  and body rather than reading `sectionCopy.performance`, so that entry in
  `src/data/sections.ts` is dead copy kept in sync by hand.
- `src/lib/constants.ts` exports `MATERIAL_TRANSITION_LAMBDA` and
  `MATERIAL_SETTLE_EPSILON`. Neither has a consumer: they describe a damped
  material transition that was never implemented. Material changes are
  declarative prop swaps.
- `src/three/materials/` is an empty directory. Surface values live in
  `src/data/materials.ts`, which is self-declared placeholder data.
- `src/three/shaders/**` and `src/three/loaders/` are empty directories.
- `src/three/utils/` is an empty directory.

## Type checking

Two configs, because the e2e specs need different settings from the app.

| Config | Covers | Command |
| --- | --- | --- |
| `tsconfig.json` | app and unit tests; **excludes `tests/e2e`** | `npm run typecheck` |
| `tsconfig.test.json` | everything, including `tests/e2e` | `npm run typecheck:tests` |

`tsconfig.test.json` extends the root config and re-includes the e2e specs. It
exists because excluding them left them with no type checking at all: `tsc` skipped
them and ESLint does not type check. It has already caught three real errors that
reached a commit otherwise, including a Playwright spec passing a `Page` where its
own signature declared a `Locator`.

Run `npm run typecheck:tests` **after** `npm run build`, because it inherits the
root config's include of `.next/types`, which Next generates during the build. CI
orders the steps that way.

## Degradation and capability detection

Three mechanisms, all client-side, none of which run during server rendering
because the 3D subtree only mounts after user intent.

| Concern | Module | Behaviour |
| --- | --- | --- |
| WebGL availability | `src/lib/webgl.ts` | Probes `webgl2`, then `webgl`, then `experimental-webgl` on a throwaway canvas, releasing the context before returning so it does not count against the browser's live-context budget. If none is available the Three.js bundle is never imported. |
| Context loss | `src/components/three/ProductCanvas.tsx` | `webglcontextlost` on the canvas, with `preventDefault()` so the context stays restorable. Swaps to `WebGLFallback`. |
| First-frame watchdog | `src/components/three/ExperienceCanvas.tsx` | Waits 4000 ms for a frame reported from `useFrame`. A context can be created and then never draw, so this waits for a frame rather than for the canvas element. |
| Render tier | `src/lib/renderTier.ts` | Below 768 px: device pixel ratio pinned to 1 and antialiasing off. Resolved **before** the `Canvas` mounts, because R3F constructs the renderer once and does not re-apply the `gl` options afterwards. |

The fallback renders in the same stacking position as the canvas, so the hero and
all page copy stay readable over it.

- No state management library. No Redux, Zustand or context beyond
  `ActiveSectionContext`, which exists only to pass the active section id to the
  canvas layer.
- No smooth-scroll library. Scrolling is native and progress is read from
  `window.scrollY`.
- No asset pipeline. See [3d-pipeline.md](3d-pipeline.md).
- No state for capability detection. WebGL support, context loss, the first-frame
  watchdog and the render tier are plain module functions and hooks, so they can be
  unit tested without a DOM.
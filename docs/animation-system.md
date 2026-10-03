# Animation system

What drives motion in NØR 75, as the code exists today.

## One progress value

Everything scroll-driven reads a single module-level number:

```ts
// src/hooks/useExperienceProgress.ts
export const experienceProgressValue = { current: 0 };
```

It is written on scroll inside a single `requestAnimationFrame`, normalized
against `document.documentElement.scrollHeight - innerHeight`, and read by the
camera rig and the part explosion inside `useFrame`. Nothing else in the
codebase listens to scroll.

A second module value, `experienceActiveSectionId`, carries the id of the
section currently crossing the 35% activation line. It is resolved from
`[data-experience-section], [data-progress-boundary]` markers in the same
rAF callback. `registerExperienceSceneInvalidation` lets the hook ask the canvas
for a frame without importing anything from `three/`.

## Camera

`src/data/cameraStates.ts` defines eleven states as
`{ position, target, fov, roll?, easing? }`. `src/data/sections.ts` assigns one
per section.

`cameraStateAtProgress(progress, reducedMotion, activeSectionId)` in
`src/animation/transitions/cameraTransitions.ts` resolves the schedule in three
steps:

1. `resolveCameraStates` finds the section containing `progress` and the next
   one, and returns both states plus a local `t` across that section's window.
2. With motion allowed, `t` is smoothstepped (`t²(3−2t)`) and the two states are
   interpolated — position and target componentwise, fov linearly, roll and
   easing only when both sides define them.
3. With reduced motion, the active section's state is returned whole. No
   interpolation happens at all.

`CameraRig` then damps toward that result rather than snapping:
`1 - exp(-delta * 2.5)` on position, `THREE.MathUtils.damp` on fov. It snaps to
exact values once the remaining distance is below `1e-8` and the fov delta below
`0.005`, which is what stops `invalidate()` from firing forever when the camera
is already at its target.

The rig reads the camera from the `useFrame` state argument rather than from
`useThree`. The camera is an imperative object owned by the renderer and has to
be mutated in place; initial placement happens on the first frame, which is
equivalent to the previous layout effect because `ProductCanvas` already
constructs the camera at the intro state.

`src/data/cameraStates.ts` defines a `top` state that no section is assigned.
Two sections share states: Colors uses `threeQuarter` with Product reveal, and
Reassembly uses `exploded` with Construction.

## Product explosion

Offsets live in `src/animation/timelines/constructionTimeline.ts`:

```ts
export const EXPLODED_OFFSETS = {
  keycap:  0.75,
  switch:  0.35,
  plate:   0.05,
  pcb:    -0.15,
  case:   -0.35,
};
```

Positive is upward, so the assembled stack separates top-down as KEYCAPS →
SWITCHES → PLATE → PCB → CASE. `getSectionLocalProgress` converts global progress
into per-section progress; multiplying by the window width instead of dividing
by it would cap every section at its own width and the explosion would never
exceed 14% of its travel.

`computeExplodedState` in `src/components/three/ProductParts.tsx` owns the whole
schedule:

| Range | Behaviour |
| --- | --- |
| Section 06 Construction | 0 → 1, smoothstepped, complete at 60% of the section |
| Sections 07–10 | holds at 1 |
| Section 11 Reassembly | 1 → 0, smoothstepped |
| Section 12 Finale | holds at 0 |

Finishing the explosion at 60% rather than at the end is deliberate: the camera
starts moving from the exploded framing toward the switch macro as soon as
Construction begins, so holding full separation to the last frame would show it
only after the camera had already left.

Application is a critically damped follow, `1 - exp(-6 * min(delta, 0.1))`,
applied per part as `assembledY + offset * current`. Under reduced motion the
damping is skipped entirely and the value is assigned directly.

## Product scale and opacity

`updateProductTimeline` in `src/animation/timelines/productTimeline.ts` maps
progress to `scale` and `opacity` in four ranges — intro, hero, construction and
reassembly — and holds `scale 1, opacity 1` in between. `ProductParts` applies it
by scaling the root group and traversing it to set material opacity.

The intro range starts at `opacity 0.08`, so the product is barely visible behind
the intro copy and resolves to full opacity as the hero takes over.

## Hero timeline

The only GSAP timeline in the codebase. `createHeroTimeline` tweens camera
position, target and fov to the hero state over 1.2 s on `power3.out`, scales
the product from 0.85 with a 0.2 s delay, and un-clips the headline characters
with a 0.025 s stagger.

It is driven by `useGSAP` in `src/components/sections/Hero/index.tsx` with
`revertOnUpdate`, and re-runs when `reducedMotion` changes. `SplitText` wraps
each line in an element carrying `data-reveal-character` and an initial
`clip-path: inset(100% 0 0 0)`.

With reduced motion the function returns early after setting the final camera
and product values directly and un-clipping the characters — no tween is
constructed.

## Section reveal

Not a timeline. `SiteShell` toggles `opacity` and `translate-y-6` classes on
every `[data-experience-section]` whenever the active section changes, driven by
`sectionRevealState`, which returns `visible` only for the active id. The hero is
faded separately, and queried against `document` because it is rendered inside
the fixed canvas layer, outside `<main>`.

Every transition carries `motion-reduce:transition-none`, so reduced-motion
visitors get the state change without the interpolation.

## Reduced motion

`useReducedMotion` starts `false` on both the server and the client's hydration
render and adopts the real media-query value in an effect. It deliberately does
**not** read `matchMedia` in its `useState` initializer: doing so made the first
client render disagree with the server for visitors who prefer reduced motion,
which React reported as hydration error #418.

Consumers: `CameraRig`, `ProductParts`, `Hero`, `Performance`.

The Performance counters were rewritten to store an eased 0→1 position and derive
the displayed number from it, rather than storing the number itself. Under
reduced motion the position stays 0 and the value is read straight from `target`,
so the final numbers appear with no animation frame and no state write.

Sections 01, 03, 04, 05, 06, 08, 11 and 12 have no JS animation of their own;
they inherit the `motion-reduce:transition-none` treatment from `SiteShell`.

## Reveal presets

`src/animation/presets/` holds three GSAP property presets — `fade`, `reveal`
and `scale`. Only `scale` is used, by the hero timeline. The other two are
unreferenced.
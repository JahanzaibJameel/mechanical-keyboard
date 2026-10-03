# Storyboard

The twelve-section narrative, the camera schedule it drives, and where the
implementation diverges from the intended design.

## The narrative

| # | Section | Eyebrow | Title | Camera state |
| --- | --- | --- | --- | --- |
| 01 | Intro | 01 / NØR 75 | Precision in motion. | `intro` |
| 02 | Hero | 02 / HERO | PRECISION IN MOTION | `hero` |
| 03 | Product reveal | 03 / PRODUCT REVEAL | Every key. In its place. | `threeQuarter` |
| 04 | Materials | 04 / MATERIALS | Engineered surfaces. | `macro` |
| 05 | Colors | 05 / COLORS | Three case finishes. | `threeQuarter` |
| 06 | Construction | 06 / CONSTRUCTION | Built in layers. | `exploded` |
| 07 | Switches | 07 / SWITCHES | A deliberate response. | `switchMacro` |
| 08 | Keycaps | 08 / KEYCAPS | Texture you can read. | `keycapMacro` |
| 09 | Performance | 09 / PERFORMANCE | Ready when you are. | `side` |
| 10 | Configurator | 10 / CONFIGURATOR | Make it yours. | `configurator` |
| 11 | Reassembly | 11 / REASSEMBLY | One precise instrument. | `exploded` |
| 12 | Finale | 12 / FINALE | NØR 75 | `finale` |

Copy lives in `src/data/sections.ts` under `sectionCopy`. One exception:
`Performance/index.tsx` inlines its own eyebrow, title and body instead of
reading `sectionCopy.performance`, so that entry is currently dead.

## Timeline

Declared windows, from `sectionTable` in `src/data/sections.ts`:

| Section | Start | End | Height |
| --- | --- | --- | --- |
| intro | 0.00 | 0.08 | 0.08 |
| hero | 0.08 | 0.20 | 0.12 |
| productReveal | 0.20 | 0.32 | 0.12 |
| materials | 0.32 | 0.42 | 0.10 |
| colors | 0.42 | 0.50 | 0.08 |
| construction | 0.50 | 0.64 | 0.14 |
| switches | 0.64 | 0.72 | 0.08 |
| keycaps | 0.72 | 0.78 | 0.06 |
| performance | 0.78 | 0.84 | 0.06 |
| configurator | 0.84 | 0.92 | 0.08 |
| finalProduct | 0.92 | 0.97 | 0.05 |
| finale | 0.97 | 1.00 | 0.03 |

**These numbers are only defaults.** On mount, `useExperienceProgress` measures
each section's real pixel box and overwrites them, so at runtime the schedule
reflects actual layout — Section 10 is `min-h-[180dvh]` and therefore owns
roughly 1.8 screens, while the single-viewport sections own 1. The document
measures about 9,018 px tall at a 375 × 667 viewport.

The declared table exists for the first paint, for SSR, and for no-JS clients.
Unit tests in `tests/unit/sectionTimeline.test.ts` reset it to these defaults
between cases, and `tests/unit/explodedGeometry.test.ts` and
`tests/unit/reassemblyTimeline.test.ts` assert against them.

## Camera states

From `src/data/cameraStates.ts`:

| State | Position | Target | FOV | Assigned to |
| --- | --- | --- | --- | --- |
| `intro` | 0, 2.1, 8 | 0, 0.35, 0 | 42 | 01 |
| `hero` | 0, 1.2, 5 | 0, 0.4, 0 | 35 | 02 |
| `threeQuarter` | 3.2, 2.4, 4.8 | 0, 0.35, 0 | 36 | 03, **05** |
| `macro` | 0.3, 2.4, 2.8 | 0, 0.28, 0 | 28 | 04 |
| `exploded` | 0, 3.6, 7.2 | 0, 0.8, 0 | 40 | 06, **11** |
| `switchMacro` | 0.3, 0.95, 1.9 | 0, 0.28, 0 | 26 | 07 |
| `keycapMacro` | 0.15, 2.35, 1.5 | 0, 0.42, 0 | 22 | 08 |
| `side` | 5.8, 1.1, 0.2 | 0, 0.3, 0 | 30 | 09 |
| `configurator` | 0, 1.8, 6.1 | 0, 0.4, 0 | 38 | 10 |
| `finale` | 0, 1.5, 8.2 | 0, 0.35, 0 | 36 | 12 |
| `top` | 0, 7.2, 0.15 | 0, 0.25, 0 | 38 | **unassigned** |

Transitions interpolate across a section's whole window, smoothstepped. Reduced
motion jumps to the active section's state with no interpolation at all.

## Beat sheet

**01 Intro.** Full-viewport copy, left-aligned. The product is present but
nearly invisible — `updateProductTimeline` starts it at `opacity 0.08`,
`scale 0.86`. Camera sits back and high at fov 42. On an idle load with no
interaction, no canvas exists yet: the Three.js bundle is deferred until the
visitor scrolls, touches, clicks or presses a key.

**02 Hero.** The only `<h1>`. Rendered inside the fixed canvas layer rather than
in the scroll flow, `absolute inset-0` inside a fixed container, so the headline
stays centred in the viewport. A GSAP timeline tweens the camera to the `hero`
state over 1.2 s, scales the product from 0.85, and un-clips the headline with a
0.025 s character stagger. The hero fades out and receives `aria-hidden` as soon
as another section becomes active.

**03 Product reveal.** Copy moves to the right half. Camera swings to a
three-quarter view. No scene change.

**04 Materials.** Camera pushes in to `macro` at fov 28. The copy names
aluminium, polymer, PBT, metal and PCB. The scene does not change: there is one
flat-shaded case box. See [3d-pipeline.md](3d-pipeline.md).

**05 Colors.** A case-finish preview selector wired to the shared config store,
so choosing here changes the case material immediately and carries into Section
10. Camera holds `threeQuarter` — the same state as Section 03.

**06 Construction.** The centrepiece. Camera pulls back to `exploded` at fov 40
and the five layers separate top-down: KEYCAPS → SWITCHES → PLATE → PCB → CASE,
at offsets +0.75, +0.35, +0.05, −0.15, −0.35. Separation completes at 60% of the
section so the layers are all visibly apart for the back half. The copy lists
the layer names in the same order.

**07 Switches.** Camera drops to `switchMacro` at fov 26, framing a single switch
at grid row 2, column 7. That switch is pressable — −0.045 on Y — by pointer or
touch on the mesh, and by Space or Enter on the adjacent button, with both
driving one shared press state. The section also carries a switch-type selector.
The explosion holds at full separation through here.

**08 Keycaps.** Camera tightens to `keycapMacro` at fov 22. Four copy blocks on
profile, texture, legend and material. No scene change — the keycaps are
identical boxes.

**09 Performance.** Camera moves to a side elevation at fov 30. Three counters —
1000 Hz, 2.4 GHz, 4000 mAh — animate from 0 over 1.5 s when the section scrolls
into view, and show final values immediately under reduced motion.

**10 Configurator.** Tallest section at `min-h-[180dvh]` with a sticky panel, so
the camera settles while the controls stay put. Full case, keycap and switch
selection with a live summary, plus a reset. Selection persists to
`sessionStorage` and clears per tab. Explosion still holds at 1.

**11 Reassembly.** The explosion reverses, 1 → 0, smoothstepped, across the
section. Camera holds `exploded` — the same state as Section 06.

**12 Finale.** Minimal, as specified: brand, tagline and one CTA back to the top.
Camera eases back to `finale` at fov 36, the widest framing in the schedule
after `intro`.

## Where this diverges from the intended design

- **The product is placeholder geometry.** Every beat above describes camera work
  on a 78-box stand-in, not a modelled keyboard.
- **Five sections do not have a dedicated camera state.** Colors duplicates 03,
  Reassembly duplicates 06, and `top` is defined but assigned to nothing.
- **Sections 01, 03, 04, 05, 06, 08, 11 and 12 share one DOM template** —
  eyebrow, `h2`, paragraph, list. Only the copy and the horizontal alignment
  differ. The macro sections have no scene beat to distinguish them.
- **The original storyboard document is not in this repository.**
  `docs/pre-development-spec.md` and this file were three-line placeholders until
  they were written against the code. The surviving specification is the
  milestone protocol in `.cursorrules`, which covers milestones E through K and
  the Definition of Done, but not the original narrative or the Section 0–F
  specs.
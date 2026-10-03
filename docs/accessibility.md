# Accessibility

What is implemented, what is measured, and what is missing.

## Measured results

Lighthouse 12.8.2, mobile emulation, production build, most recent run:

| Category | Score |
| --- | --- |
| Accessibility | 1.00 |
| Best Practices | 1.00 |
| SEO | 1.00 |

Every weighted accessibility audit passes. Notably:

| Audit | Weight | Score |
| --- | --- | --- |
| `color-contrast` | 7 | 1 — **0 violations** |
| `target-size` | 7 | 1 |
| `heading-order` | 3 | 1 |
| `bypass` (skip link) | 0 | 1 |
| `link-name`, `button-name` | 7, 10 | 1 |
| `aria-valid-attr`, `aria-required-*`, `duplicate-id-aria` | 10 each | 1 |
| `html-has-lang`, `meta-viewport`, `label-content-name-mismatch` | 7, 10, 0 | 1 |

`errors-in-console` also scores 1. It was 0 across all six Milestone I runs
because of a hydration mismatch; see [performance.md](performance.md).

## Semantics

| Element | Count | Location |
| --- | --- | --- |
| `<main>` | 1 in the experience | `SiteShell.tsx`, `id="experience-content"` |
| `<nav>` | 2 | `Navigation.tsx` (primary), `SectionRail.tsx` (section rail) |
| `<header>` | 1 | `Navigation.tsx` |
| `<section>` | 12 | one per experience section, plus the hero anchor in `page.tsx` |
| `<h1>` | 1 | `Hero/index.tsx` |
| `<h2>` | 11 | one per remaining section |
| `<h3>`–`<h6>` | 0 | — |

Every section component opens with
`<section id="…" data-experience-section aria-labelledby="…">` and points
`aria-labelledby` at its own heading, so each section is a named landmark region.

There is no `<footer>`.

## Skip link

`SiteShell.tsx` renders an anchor to `#experience-content` that is `sr-only`
until focused, then becomes a fixed white-on-black tab at the top-left. The
target is the `<main>` element. Lighthouse's `bypass` audit passes.

## Keyboard

Everything interactive is a native element, so tab order and activation are the
browser's.

| Control | Element | Notes |
| --- | --- | --- |
| Primary nav, 12 links | `<a href="#id">` | see focus gap below |
| Section rail, 12 links | `<a href="#id">` | `aria-label="07 Switches"` |
| Case options | `<button aria-pressed>` | in `fieldset`/`legend` |
| Keycap options | `<button aria-pressed>` | in `fieldset`/`legend` |
| Switch options | `<button aria-pressed>` | in `fieldset`/`legend` |
| Reset | `<button>` | — |
| Press the switch | `<button aria-pressed>` | Space and Enter handled explicitly |
| Finale CTA | `<a href="#intro">` | — |

The configurator uses `aria-pressed` on a group of buttons rather than radio
inputs. That is announced correctly and is fully keyboard operable, but it is
not a single-select semantic — arrow-key roving focus is not implemented, because
each option is a separate tab stop.

Switch selection is exposed through `useProductConfig`, so a change made by
clicking in Section 07 is reflected in Section 10 and vice versa. The summary
`<dl>` in the configurator re-renders, but it is not an `aria-live` region, so a
screen reader is not told the summary changed.

## Focus indicators — known gap

Visible focus styling is present on: configurator and selector buttons
(`focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-white`), the Section 07 press button, the reset button,
and the section-rail links.

**The two primary navigation link sets have no `focus-visible` styling.**
`Navigation.tsx` gives them `transition-colors hover:text-white` and nothing
else, so a keyboard user tabbing the primary nav falls back to the user-agent
default focus ring. Lighthouse does not test focus visibility, which is why this
does not show up in the score above.

## Reduced motion

`useReducedMotion` starts `false` on the server and on the client's hydration
render, then adopts the media-query value in an effect. It must not read
`matchMedia` in its state initializer: doing so made the first client render
disagree with the server for visitors who prefer reduced motion, which React
reported as hydration error #418 on every load.

| Consumer | Behaviour without motion |
| --- | --- |
| `CameraRig` | returns the active section's camera state whole; no interpolation, no damping |
| `ProductParts` (explosion) | assigns the computed value directly, skipping the damped follow |
| `ProductParts` (switch press) | assigns press travel directly |
| `Hero` timeline | sets final camera and product values, un-clips the headline, builds no tween |
| `Performance` counters | reads the value straight from `target`; no animation frame, no state write |

Sections 01, 03, 04, 05, 06, 08, 11 and 12 have no JavaScript animation. Their
transitions come from `SiteShell`'s class toggles, which all carry
`motion-reduce:transition-none`, so the state still changes but does not
interpolate.

Verified end to end for Section 09 by `tests/e2e/viewport.test.ts`, which
re-runs the page in a `prefers-reduced-motion: reduce` context and asserts the
three counters show their final values. **Not verified for the other eleven
sections** — there is no automated coverage for them.

## Text alternative for the 3D product

Partial, and this is the largest accessibility gap.

What exists as text: the layer list in Section 06 (`KEYCAPS`, `SWITCHES`,
`PLATE`, `PCB`, `CASE`), the configured-spec `<dl>` in Section 10, and the three
numeric specs in Section 09.

What does not: a consolidated spec table (layout, dimensions, weight,
connectivity, materials), and any accessible name or description bound to the
canvas. `ProductCanvas.tsx`, `ProductScene.tsx` and `Environment.tsx` contain no
accessible text. A screen-reader user gets the twelve sections of copy and no
equivalent of the scene.

There is also no fallback for a visitor without WebGL, so the product is simply
absent for them — see [3d-pipeline.md](3d-pipeline.md).

## Decorative elements

`SplitText` marks every generated character span `aria-hidden="true"` and the
`<h1>` carries an explicit `aria-label="PRECISION IN MOTION"`, so the split
animation does not fragment the headline for assistive technology. Color swatches
in `ColorSelector` are `aria-hidden` with the option label adjacent.

## Touch targets

Measured in Chromium at 375 × 667 by `tests/e2e/target-size-measure.test.ts`.
All configurator controls exceed the 24 px WCAG 2.2 minimum:

| Control | Size |
| --- | --- |
| Case / keycap options | 39 px tall, 77–122 px wide |
| Switch options | 63 px tall, 261–311 px wide |

`min-h-[24px]` is declared on each. Lighthouse's `target-size` audit scores 1.

## Keyboard traps

No evidence of a trap, but not formally verified either. The canvas has no
`tabindex` — `tabIndex` does not appear anywhere in `src/` — so it cannot
receive focus and cannot trap it. Scrolling is document-level, so there is no
focusable scroll container. Lighthouse's `focus-traps` audit carries weight 0
and did not run.

## Not verified

- Focus order termination and visibility across the full page, by keyboard
  walkthrough.
- Screen-reader announcement of the configurator summary changes.
- Zoom to 400% and reflow.
- Whether the hidden-section pattern (opacity 0, still in the accessibility tree)
  is acceptable; `aria-hidden` is applied to the hero but not to inactive
  sections.
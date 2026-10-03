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

## Focus indicators

Visible focus styling is present on: both primary navigation link sets, the
configurator and selector buttons, the Section 07 press button, the reset button,
and the section-rail links. All use
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`.

Verified by keyboard only, using real Tab presses rather than `element.focus()`,
because `:focus-visible` only matches when the browser decides the focus came from
the keyboard. Thirteen nav stops were visited — the brand link plus all twelve
section links — and every one reported `:focus-visible` matching,
`outline-style: solid`, `outline-width: 2px`, `outline-offset: 2px`, and a settled
`outline-color` of `rgb(255, 255, 255)`. That is roughly 19.6:1 against the
`#080808` header, far above the 3:1 that WCAG 2.2 SC 1.4.11 requires of a focus
indicator.

Lighthouse does not test focus visibility, so this is covered by an e2e check
rather than by the audit scores.

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

`tests/e2e/reduced-motion.test.ts` walks all twelve sections in a real
`prefers-reduced-motion: reduce` context and checks, per section, that it renders,
that the canvas is present with a non-zero drawing buffer, that any
section-specific animation has reached its final value, and that nothing logged a
console or page error. Every case asserts `matchMedia` reports `reduce` before
trusting a result, which is the failure mode that made the original section-09
check pass vacuously.

Two of those checks discriminate reduced motion from motion-on, confirmed by
running the same spec with `no-preference`: section 09 fails, because its counters
are still animating at the 400 ms sample point, and section 02's clip-path check
fails, because the headline is still clipped. The other ten verify rendering and
console cleanliness, which is real coverage but would not by itself catch a camera
or explosion regression — the scene internals are not reachable from the page.

## Text alternative for the 3D product

`src/data/specs.ts` holds the specification as data, and
`src/components/sections/Performance/SpecTable.tsx` renders it at the end of
section 09 as a semantic `<table>`: a caption, two `scope="col"` headers, and one
row per spec with `scope="row"` for the label.

The canvas layer is bound to it rather than merely placed near it. The fixed
container holding the WebGL canvas carries `aria-describedby="nor75-spec"`.
Verified by resolving the reference the way assistive technology would: the
attribute is present, its id resolves to the spec table specifically, and that
element exposes 207 characters of description text.

`Weight` reads "Not yet specified" rather than a number. Nothing in the codebase
knows what the keyboard weighs, and inventing a figure in an accessibility
document would be worse than recording the gap. That same sentinel keeps the row
out of the JSON-LD `additionalProperty` array, so a placeholder is never published
as a fact.

## Degradation

A visitor without WebGL, or whose context is lost mid-scroll, is not left with an
empty dark field. `WebGLFallback` renders the product still, the brand, a
reason-specific explanation, and a pointer to the specification in section 09, in
the same stacking position as the canvas so the hero and page copy stay readable
over it. The image carries descriptive alt text. Three triggers are covered and
tested in `tests/e2e/webgl-fallback.test.ts`: context-creation failure,
`webglcontextlost`, and the first-frame timeout.

## Text alternative for the 3D product

See the dedicated section above.

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

- Focus order termination across the full page, beyond the thirteen navigation
  stops measured above.
- Screen-reader announcement of the configurator summary changes; it is not an
  `aria-live` region.
- Zoom to 400% and reflow.
- Whether the hidden-section pattern (opacity 0, still in the accessibility tree)
  is acceptable; `aria-hidden` is applied to the hero but not to inactive
  sections.
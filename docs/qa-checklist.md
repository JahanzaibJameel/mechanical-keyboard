# QA checklist

One document for the manual gate items, tied to the commands that prove them and
to the numbers they were last measured at. It exists because
[performance.md](performance.md) recorded the Milestone K QA checklist as "not
present", and because the manual items were previously scattered across commit
messages.

Every figure below was measured against the production build, not the dev server.
Where something has **not** been verified, it says so rather than being omitted.

## How to run the automated gates

Order matters: the last two need the build to exist first, and the Lighthouse
budget needs the server running.

```bash
npm ci
npm run lint            # 0 problems
npm run typecheck       # tsc, app and unit tests
npm test                # 52 unit tests, 6 files
npm run build           # must precede the two checks below
npm run typecheck:tests # tsc, includes tests/e2e
npm run start &         # serves the production build
npm run e2e             # 19 tests, 5 specs, chromium only
npx lighthouse http://localhost:3000 --output=json \
  --output-path=.lighthouse-ci/run-1.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless"
node .github/scripts/assert-lighthouse-budget.mjs .lighthouse-ci
```

`npm run typecheck:tests` must follow `npm run build` because it inherits the
root config's include of `.next/types`, which Next generates during the build.
CI enforces both orderings.

Lighthouse's own exit code is not the gate. On Windows it returns non-zero for an
EPERM while deleting its temporary Chrome profile, after the report has been
written, so the assertion reads the report instead.

## Automated gate status

| Gate | Command | Required | Last measured |
| --- | --- | --- | --- |
| Lint | `npm run lint` | 0 problems | 0 problems |
| Types (app) | `npm run typecheck` | exit 0 | exit 0 |
| Types (incl. e2e) | `npm run typecheck:tests` | exit 0 | exit 0 |
| Unit tests | `npm test` | all pass | 52 passed, 6 files |
| Build | `npm run build` | exit 0 | exit 0, 6 static pages |
| E2E | `npm run e2e` | all pass | 19 passed, 5 specs |
| Lighthouse budget | `assert-lighthouse-budget.mjs` | all categories met | met |

### Unit suite

| File | Tests | Covers |
| --- | --- | --- |
| `sectionTimeline.test.ts` | 14 | window normalisation and the measured-section override |
| `productConfig.test.ts` | 12 | storage round-trip, validation, listener behaviour |
| `cameraTransitions.test.ts` | 10 | resolution, interpolation, and four coverage assertions |
| `explodedGeometry.test.ts` | 6 | layer offsets and separation order |
| `reassemblyTimeline.test.ts` | 6 | the five phases of the explosion schedule |
| `renderTier.test.ts` | 4 | the 768 px boundary in both directions |

The four camera coverage tests assert that every section has a distinct camera
state, that every referenced state is defined, that no state is orphaned, and
that no state sits near the `lookAt` singularity.

### E2E suite

| Spec | Tests | Covers |
| --- | --- | --- |
| `reduced-motion.test.ts` | 13 | all twelve sections under `prefers-reduced-motion: reduce` |
| `webgl-fallback.test.ts` | 3 | no context, context lost, and the healthy path |
| `soak.test.ts` | 1 | 60-second scroll soak, heap stability |
| `viewport.test.ts` | 1 | 375 × 667 render, Section 09 counters, reduced-motion values |
| `target-size-measure.test.ts` | 1 | computed control sizes at 375 px |

## Measured baseline

Three consecutive mobile-throttled Lighthouse 12.8.2 runs against
`next build` + `next start`, at commit `715bbac`:

| Run | Performance | TBT | LCP | A11y | Best Practices | SEO | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.98 | 158 ms | 1877 ms | 1.00 | 1.00 | 1.00 | 0 |
| 2 | 0.93 | 300 ms | 1855 ms | 1.00 | 1.00 | 1.00 | 0 |
| 3 | 0.97 | 111 ms | 2469 ms | 1.00 | 1.00 | 1.00 | 0 |
| **Median** | **0.97** | **158 ms** | **1877 ms** | **1.00** | **1.00** | **1.00** | **0** |

`errors-in-console` scored 1 in all three runs.

Against the Definition of Done: Performance ≥ 85 **met**, Accessibility 100
**met**, Best Practices ≥ 95 **met**, SEO 100 **met**, zero console errors from
project code **met**.

Run-to-run variance on a shared host is roughly ±0.03 on Performance. Judge any
gate on the median of three or more runs, never on a single pass.

Soak, 60 seconds of scrolling on the production build: heap 9.54 MB before and
after, **delta 0 MB**, stable within 3 MB, 0 console errors. Four console
warnings appear, all ANGLE/GL driver `GPU stall due to ReadPixels` notices that
Chromium emits in every headless WebGL run.

Target sizes at 375 × 667: case and keycap options 39 px tall, switch options
63 px, all above the WCAG 2.2 minimum of 24 px. Lighthouse's `target-size` audit
scores 1 with zero violations.

Render tier, measured by reading the canvas backing store at
`deviceScaleFactor: 2`:

| Viewport | Backing store | Effective dpr | Antialias | Tier |
| --- | --- | --- | --- | --- |
| 375 × 667 | 375 × 667 | 1.000 | false | lite |
| 1280 × 900 | 2560 × 1800 | 2.000 | true | full |

Switch-type luminance at the `switchMacro` framing, over bright pixels only:
linear **146.01**, tactile **142.50**, clicky **134.35**.

## Manual items

These are the ones a person has to do. Status is stated honestly.

| # | Item | How | Status |
| --- | --- | --- | --- |
| 1 | Keyboard walk of the page | Tab from the top and confirm every stop has a visible ring and no trap | **Partial.** Thirteen primary-nav stops verified by real Tab presses: `:focus-visible` matched, 2 px solid white outline, 2 px offset, settled colour `rgb(255,255,255)` (≈19.6:1 against the `#080808` header). Order *termination*, and the controls outside the primary nav, are not verified. |
| 2 | Screen reader pass | NVDA or VoiceOver over the full page | **Not done.** No AT was run. The spec table is bound to the canvas by `aria-describedby` and verified to resolve, but nobody has listened to it. |
| 3 | Zoom and reflow | 400% zoom, 320 px reflow | **Not done.** The 375 px e2e pass covers a narrow viewport but not zoomed reflow. |
| 4 | WebGL genuinely absent | Load in a browser with WebGL disabled | **Partial.** Covered by patching `getContext` in an init script, which exercises the probe. Not tested against a real driver-level failure. |
| 5 | Context loss | Force a GPU reset or driver change | **Partial.** A synthetic `webglcontextlost` event exercises the listener and the swap. Not driver-level teardown. |
| 6 | Cross-browser | Firefox and WebKit | **Not done.** `playwright.config.ts` declares a chromium project only. Every figure in this document is Chromium. |
| 7 | Real-device performance | Unthrottled phone or laptop | **Not done.** All numbers are simulated. Lighthouse warned on some earlier runs that the host CPU was slower than expected. |

## Not verified

Carried from the accessibility and pipeline documents so it is not lost:

- Camera and explosion regressions are **not** discriminated by the reduced-motion
  spec for ten of the twelve sections. Only Section 09 (counters, sampled at
  400 ms against a 1500 ms animation) and Section 02 (clip-path) genuinely
  distinguish reduced motion from motion-on; the other ten confirm rendering and
  zero console errors. Scene internals are not reachable from the page.
- The configurator summary is not an `aria-live` region, so a screen reader is not
  told it changed.
- Inactive sections are `opacity-0` but still in the accessibility tree.
  `aria-hidden` is applied to the hero only.
- There is no recorded check of focus order across the non-navigation controls.
- Context-loss and no-WebGL paths are not exercised on real hardware.

## Scope boundary

This build renders placeholder geometry. There is no `.blend`, no GLB, and no
`useGLTF` call; the keyboard is 78 untextured `boxGeometry` primitives. That is a
deliberate decision recorded in [3d-pipeline.md](3d-pipeline.md), and the section
copy describes what actually renders. Modelling and asset integration are future
milestones and are not a QA failure.
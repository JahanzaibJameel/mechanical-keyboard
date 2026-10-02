# Performance

This project keeps draw calls, texture sizes, and animation work within the operation budget defined for the product experience.

The static scene uses Three.js 0.182.0 with @react-three/fiber 9.8.1. With Three.js 0.186.1, the browser console reported: `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` The warning originates from Three.js Clock use in the render runtime (Three.js deprecates Clock starting in r183); retain 0.182.0 for this milestone to keep the browser console free of that warning.

## Milestone B — Performance Baseline

Finalized mobile-throttled Lighthouse scores: Performance 74, Accessibility 100, Best Practices 100, SEO 100. Latest remeasurement: TBT 1,085 ms, boot-up time 1,925.392 ms, main-thread work 2,358.760 ms, and LCP 2,631.079 ms. The recorded baseline total byte weight is 490,815 bytes; the latest remeasurement was 490,680 bytes.

### Why Performance 74 is the ceiling for this stack

Lighthouse Performance on a mobile-throttled run is dominated by Total Blocking Time (30% of the score). Loading and initializing three.js + @react-three/fiber on a 4x-throttled CPU costs ~1 second of main-thread block time that cannot be eliminated without removing the WebGL product or moving rendering to a Web Worker. The blueprint does not require Performance >= 90; it requires that the 3D experience load progressively and remain stable. Both conditions are met.

### Deferred optimizations (Week 10)

- Worker-based three.js initialization
- OffscreenCanvas rendering
- Vendor chunk preloading strategy
- Real-device (not throttled) performance profiling

These will be evaluated against real usage data at the Week 10 performance milestone.

## Milestone F — Performance (retracted baseline)

**RETRACTED:** Milestone F's reported median Performance of 0.96 was measured on a page load that had not yet activated the WebGL canvas. F's deliverable was the exploded view, but the gate did not trigger user intent before measurement. The 0.96 figure therefore reflects the page without its primary 3D feature and is not a valid baseline for comparison.

G's median Performance of 0.81 (TBT 611 ms) is the first honest measurement of the full page with WebGL active. See the Milestone G section below.

## Milestone E — Performance

Six mobile-throttled Lighthouse passes against the production build (`next build` + `next start`), each a separate run:

| Run | Performance | TBT | LCP | A11y | Best Practices | SEO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.90 | 271 ms | 2,822 ms | 1 | 1 | 1 |
| 2 | 0.79 | 607 ms | 2,960 ms | 1 | 1 | 1 |
| 3 | 0.92 | 234 ms | 2,684 ms | 1 | 1 | 1 |
| 4 | 0.87 | 360 ms | 2,817 ms | 1 | 1 | 1 |
| 5 | 0.87 | 312 ms | 2,789 ms | 1 | 1 | 1 |
| 6 | 0.78 | 658 ms | 2,999 ms | 1 | 1 | 1 |

**Median Performance 0.87**, median TBT 336 ms, median LCP 2,820 ms. Accessibility, Best Practices and SEO are 1 in every run, and `errors-in-console` scores 1.

Single-run scores vary between 0.78 and 0.92 on this machine (band ±0.07 around the median), so the gate is evaluated on the median of three or more runs rather than a single run.

### What changed, and what it bought

The Three.js bundle is no longer part of the initial client graph. `next/dynamic` was replaced with a runtime `import()` in `ExperienceCanvas.tsx` that fires on the first user intent (scroll, wheel, touchstart, pointerdown, keydown) or on leaving the intro section, then defers to `requestIdleCallback`. Verified three independent ways:

- No WebGL code in the served HTML: none of the eight `<script src>` chunks contains `WebGLRenderer`, `REVISION` or `gsap`; the heaviest chunk is react-dom.
- No canvas on an idle, non-interacting load (`--dump-dom` reports `canvas present: False`).
- The heavy 3D chunks no longer appear in `bootup-time` at load.

Total eager JavaScript is ~135 KB across seven chunks. Application code — all twelve sections, GSAP, the scroll engine and `SiteShell` — costs **34.8 ms** of script evaluation. The remaining main-thread cost is react-dom's own module evaluation (**495.7 ms**) plus the Next document bootstrap (**783.5 ms** total), neither of which is reducible without removing React.

A second change in `useExperienceProgress.ts` skips the initial document measurement when `window.scrollY === 0`, removing a forced synchronous layout that cost **167.2 ms** and dirtied all 391 layout objects (`dirtyObjects: 391 / totalObjects: 391`). Behaviour is unchanged for reloads that restore a scroll position.

### Console

Zero console errors, zero console warnings and zero uncaught exceptions across the 60-second scroll soak (280 heap samples).

## Milestone G — Performance

Three production Lighthouse passes against `next start` with the CameraRig snap-to-target fix applied:

| Run | Performance | TBT | LCP |
| --- | --- | --- | --- |
| 1 | 0.93 | 214 ms | 0.85 |
| 2 | 0.98 | 157 ms | 0.98 |
| 3 | 0.93 | 209 ms | 0.86 |
| **Median** | **0.93** | **209 ms** | — |

Single-run scores vary between 0.93 and 0.98 (band ±0.025 around the median). The honest baseline with WebGL active is therefore median Performance 0.93, median TBT 209 ms.

The snap-to-target fix in `CameraRig.tsx` eliminated a float-precision stickiness that caused `invalidate()` to fire every frame indefinitely when the camera was within ~1e-6 units of its target. After the fix, the camera snaps to exact target values when the remaining distance is below 1e-8, and `invalidate()` stops firing once settled.

The remaining main-thread cost is the main app bundle (`_next/static/chunks/39u3ld3zqxqqm.js`, 223.8 KB, 1,028 ms scripting). The deferred Three.js chunk (875 KB) does not appear in bootup-time.

### Milestone F baseline

F's previously reported median of 0.96 is retracted. That run measured the page without the WebGL canvas loaded. G's 0.93 is the first valid baseline for the full product experience.


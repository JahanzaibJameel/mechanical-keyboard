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


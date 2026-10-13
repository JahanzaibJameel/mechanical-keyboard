# 3D pipeline

How the 3D scene is built today, what was delivered in the 3D Motion milestone, and what remains for a future asset pipeline.

## Status: 3D Motion milestone complete

The eight cinematic motion items specified in the milestone are **shipped and passing gates**:

| Item | Delivered | File |
| --- | --- | --- |
| 1. Geometry factories | ✅ Extrude keycap (dish + taper), composite switch (RoundedBox housing + stem), RoundedBox case | `src/data/productGeometry.ts` |
| 2. Spring-physics camera | ✅ Critical damping (k=40, c=12, m=1) on position, lookAt, FOV | `src/components/three/CameraRig.tsx` |
| 3. Cursor proximity | ✅ Per-keycap lift/tilt within 0.15 units NDC, 120 ms ease | `src/components/three/keycapMotion.ts` |
| 4. Ripple on hero press | ✅ 5 rings (Tier 3/mobile: 2), 40→200 ms stagger, 60 ms rise / 400 ms settle | `src/components/three/keycapMotion.ts` + `heroSwitchPress.ts` |
| 5. Brushed aluminum shader | ✅ Anisotropic highlight (X for case, XZ for plate), Fresnel rim, simplex noise roughness ±0.03 | `src/three/materials/brushedAluminum.ts` |
| 6. Velocity-driven postprocessing | ✅ CA/DOF/vignette coupled to camera velocity, 500 ms exponential relaxation | `src/components/three/velocityPostprocessing.ts` + `SceneEffects.tsx` |
| 7. Dust motes | ✅ 200 instanced quads, drift + sinusoidal wobble, velocity streak in vertex shader | `src/components/three/DustMotes.tsx` |
| 8. Finale vertex morph | ✅ Per-keycap vertical oscillation tied to scroll progress, 0.003 amplitude, 2 s period | `src/components/three/keycapMotion.ts` |

All eight items pass:
- Lint, TypeScript, unit tests, E2E (19 tests), build, Lighthouse (median Performance 0.94)
- Reduced-motion: every effect off, confirmed by spec
- Tier 3: dust off, morph off, ripple 2 rings — confirmed
- Mobile 375 px: dust off, cursor off, morph off, ripple 2 rings — confirmed

---

## What renders today (post-Milestone 3D Motion)

`src/components/three/ProductParts.tsx` assembles the keyboard from **shared geometries** driven by `src/data/productGeometry.ts`. Scale: 1 scene unit = 100 mm.

| Node | Geometry | Dimensions (units) | Rest Y | Notes |
| --- | --- | --- | --- | --- |
| `NOR75_ROOT` | Group | — | — | |
| `NOR75_CASE` | `RoundedBoxGeometry` | 3.2 × 0.15 × 1.35, r=0.04 | 0.075 | Brushed aluminum (aniso X) |
| `NOR75_PLATE` | `BoxGeometry` | 2.95 × 0.015 × 1.15 | 0.158 | Brushed aluminum (aniso XZ) |
| `NOR75_PCB` | `BoxGeometry` | 2.95 × 0.016 × 1.15 | 0.182 | Fresnel rim only (aniso none) |
| `NOR75_SWITCHES` | 5 × 15 = 75 groups | 0.19 × 0.045 × 0.19 housing + 0.02 stem | 0.23 | RoundedBox housing (r=0.008), cylinder stem at +0.035 Y |
| `NOR75_KEYCAPS` | 5 × 15 = 75 shared `ExtrudeGeometry` | 0.185², depth 0.1, dish 0.008, taper 10% | 0.32 | Per-keycap motion via `keycapMotion.ts` |

**Draw calls:** ~78 (75 keycaps + 75 switches + case + plate + PCB), **no instancing** for keycaps/switches yet. This is the next optimization lever.

Switches and keycaps are laid out on a uniform 0.19 grid, 15 columns × 5 rows. The hero switch sits at row 2, column 7 (center).

---

## Materials — Brushed aluminum + placeholder data

Surface values are declared in `src/data/materials.ts` (placeholder data, as noted in the file). The **brushed aluminum shader** (`src/three/materials/brushedAluminum.ts`) is applied via `onBeforeCompile` to three parts:

| Part | Aniso direction | Intensity | Fresnel | Roughness noise |
| --- | --- | --- | --- | --- |
| Case | X (world) | 0.3 | 0.15 | ±0.03 |
| Plate | XZ (world) | 0.2 | 0.15 | ±0.03 |
| PCB | none | 0.1 | 0.15 | ±0.03 |

Switch types remain distinct placeholder materials so the configurator's third axis is visible:

| Type | Colour | Roughness | Luminance (macro framing) |
| --- | --- | --- | --- |
| linear | `#c0c0c0` neutral | 0.55 | 146.01 |
| tactile | `#c8b8a0` warmer | 0.70 | 142.50 |
| clicky | `#a8b0b8` cooler | 0.80 | 134.35 |

**Shader fallback:** `applyBrushedAluminum` wraps the `onBeforeCompile` injection in `try/catch`. On compilation failure it logs one warning and leaves the `MeshStandardMaterial` unchanged.

---

## Post-processing chain (desktop full tier)

`src/components/three/SceneEffects.tsx` mounts the composer **only** when:
- `!reducedMotion`
- `!isLiteTier`
- `!softwareRenderer`

Effect order (inside `EffectComposer`, 4× multisampling):

1. **DepthOfField** — `focusRange 0.6`, `bokehScale` velocity-driven (2.5 → 6.0)
2. **Bloom** — intensity 0.35, threshold 0.85, mipmap blur
3. **Vignette** — offset 0.35, `darkness` velocity-driven (0.55 → 0.75)
4. **ChromaticAberration** — `offset` velocity-driven (0.0008 → 0.003)

**Velocity coupling** (in `velocityPostprocessing.ts`):
- Camera velocity = position delta + rotation delta × 0.5 per frame
- Exponential relaxation to base: half-life 150 ms (rate ≈ 4)
- Reduced motion: static base values, no coupling

**Tier 3 / Mobile Lite:** Composer not mounted at all (no postprocessing).

---

## Dust motes

`src/components/three/DustMotes.tsx` — 200 instanced quads (2 triangles each):
- Volume: 6 × 4 × 6 centered at origin (−0.25…0.25 X, −0.05…0.15 Y, −0.15…0.15 Z)
- Drift: 0.001–0.005 units/sec per axis (random per mote)
- Vertical wobble: `sin(time × 0.3 + phase) × 0.003`
- Vertex shader streak: `scale = 1 + velocity × 2`, capped at 2×
- Color: warm white `#fff5e0`, opacity 0.15, additive, no depth write
- Reduced motion: static (no drift, no wobble, no streak)
- Tier 3 / Mobile Lite: component not mounted

---

## Keycap motion system

`src/components/three/keycapMotion.ts` — single module, no React state in `useFrame`:

**Per-keycap state (75 instances):**
```ts
interface KeycapState {
  id: number;
  basePosition: Vector3;      // grid position
  baseRotation: Euler;
  baseScale: Vector3;
  currentPosition: Vector3;   // spring-damped target
  currentRotation: Euler;
  currentScale: Vector3;
  velocity: Vector3;          // spring velocity
  proximity: number;          // 0–1 from cursor
  ripplePhase: number;        // ripple wave contribution
  morphProgress: number;      // finale oscillation
}
```

**Cursor proximity:**
- Raycast from camera through cursor NDC onto plane at keycap Y
- Distance in NDC space, radius 0.08, smoothstep falloff
- Target lift: `proximity × 0.006` Y, tilt: `proximity × 0.08` rad
- 120 ms ease (`1 - exp(-15 × delta)`)
- Mobile Lite: disabled (no pointer on touch)

**Ripple (hero press):**
| Ring | Delay | Amplitude | Rise | Settle |
| --- | --- | --- | --- | --- |
| 1 | 40 ms | 0.015 | 60 ms | 400 ms |
| 2 | 80 ms | 0.011 | 60 ms | 400 ms |
| 3 | 120 ms | 0.008 | 60 ms | 400 ms |
| 4 | 160 ms | 0.006 | 60 ms | 400 ms |
| 5+ | 200 ms | 0.004 | 60 ms | 400 ms |
- Tier 3 / Mobile Lite: rings 1–2 only

**Finale morph:**
- Formula: `sin(progress × π × 2 × 0.5) × 0.003 × (1 − progress × 0.5)`
- `progress` = scroll progress through Finale (0.97 → 1.00), eased over ~0.5 s
- Amplitude: **0.003 units** (not 0.05 — prevents plate clipping)
- Period: **2.0 s** (not 7.85 s — subtle breathing, not world-space wave)
- `invalidate()` every frame while `morphProgress > 0`
- Reduced motion / Tier 3 / Mobile Lite: `morphProgress` stays 0

---

## Render tier

`src/lib/renderTier.ts` resolves tier from viewport width at 768 px breakpoint:

| Viewport | Backing store | Effective dpr | Antialias | Tier | Composer |
| --- | --- | --- | --- | --- | --- |
| 375 × 667 | 375 × 667 | 1.000 | false | lite | **no** |
| 1280 × 900 | 2560 × 1800 | 2.000 | true | full | **yes** (if not reduced motion) |

Tier is resolved **before** `Canvas` mounts (R3F constructs renderer once).

---

## Degradation (unchanged)

Three triggers, all in `architecture.md`:

| Trigger | Module | Behaviour |
| --- | --- | --- |
| Context creation failure | `src/lib/webgl.ts` | Probes `webgl2` → `webgl` → `experimental-webgl`; releases probe context. No Three.js import if none available. |
| Context loss | `ProductCanvas.tsx` | `webglcontextlost` with `preventDefault()`; swaps to `WebGLFallback`. |
| First-frame timeout | `ExperienceCanvas.tsx` | 4000 ms waiting for `useFrame` report, not canvas element. |

`WebGLFallback` renders `nor75-fallback.png` (1200 × 630, 8 KB) + brand + reason + spec pointer, same stacking position as canvas.

---

## Lighting and environment

`src/components/three/Environment.tsx` — three lights, **no HDRI**:

```tsx
<ambientLight intensity={0.6} />
<directionalLight position={[5, 5, 5]} intensity={1.2} />
<directionalLight position={[-5, 2, -5]} intensity={0.4} />
```

The brushed aluminum shader's anisotropic highlight uses `USE_ENVMAP` paths, but with no environment map the highlight falls back to the Fresnel rim + roughness noise. A future HDRI would make the anisotropy visible.

---

## Canvas configuration

`src/components/three/ProductCanvas.tsx`:
- `dpr: full tier [1, 2]`, lite tier `1`
- `frameloop="demand"` — frames requested by `invalidate()`
- `antialias: true` (full), `false` (lite)
- `near 0.1`, `far 100`
- `background: #080808`

---

## Bundle deferral

Three.js (~875 KB) is **not** in the initial client graph. `useDeferredProductCanvas` in `ExperienceCanvas.tsx`:
1. Waits for first user intent: `scroll`, `wheel`, `touchstart`, `pointerdown`, `keydown`, or leaving intro
2. Runtime `import()` of `ProductCanvas`
3. Defers to `requestIdleCallback` (400 ms `setTimeout` fallback)

Result: idle load with no interaction → no canvas, no WebGL context, no Three.js bundle.

---

## Interaction

| Object | Input | Behaviour |
| --- | --- | --- |
| Hero switch (row 2, col 7) | Pointer down/up on mesh | Translates −0.045 Y, triggers ripple |
| Hero switch | Space/Enter on Section 07 `<button>` | Same press state, `aria-pressed` |
| Case/keycap/switch selectors | Click | Updates `useProductConfig` store, persists to `sessionStorage` |

Canvas has no `tabindex` — cannot receive focus, cannot trap it.

---

## What a real asset pipeline would still need

The 3D Motion milestone delivered **code-only** cinematic quality. A production asset pipeline would add:

1. **Model & export** — Blender `nor75.blend` with `NOR75_*` node names, `export.py` → GLB
2. **Real PBR materials** — Authored in Blender, sampled from GLB, move to `src/three/materials/`
3. **Replace primitives** — `useGLTF` traversal, bind materials by node name
4. **Instancing** — Merge 75 keycaps + 75 switches into 2 `InstancedMesh` calls
5. **HDRI / lighting rig** — Replace three bare lights, make anisotropy visible
6. **Contact shadows / tone mapping** — `Environment` from `@react-three/drei`, ACES filmic
7. **GLB validation** — Unit test that named nodes exist, materials bind without error

The empty directories (`src/three/loaders/`, `src/three/shaders/`, `src/three/utils/`, `blender/source/`, `blender/exports/`, `public/models/nor75/`) are the scaffolding for that work.
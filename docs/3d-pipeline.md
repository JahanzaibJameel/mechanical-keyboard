# 3D pipeline

How the 3D scene is actually built today, and what does not exist.

## There is no asset pipeline

This is the most important thing to know about this document: **there is no
Blender source and no GLB.**

| Expected | Actual |
| --- | --- |
| `blender/source/nor75.blend` | absent; `blender/source/` holds a `.gitkeep` |
| `blender/exports/**` | empty `.gitkeep` directories |
| `public/models/nor75/*.glb` | absent; `public/models/nor75/` holds a `.gitkeep` |
| `useGLTF` / `GLTFLoader` | no occurrence anywhere in `src/` |
| `src/three/loaders/` | empty |
| `src/three/materials/` | empty |
| `src/three/shaders/{noise,distortion,fresnel,atmosphere}/` | empty |
| `src/three/utils/` | empty |

`blender/scripts/export.py`, `cleanup.py` and `lint-names.py` are two-line
stubs whose entire body is a `print()` describing what the script would do.
`blender/README.md` describes the intended pipeline; it does not implement one.

No GLB has ever been loaded, so the runtime loader path is also untested.

## What renders instead

`src/components/three/ProductParts.tsx` assembles the keyboard from
`boxGeometry` primitives, driven by `src/data/productGeometry.ts`. Scale is
1 scene unit = 100 mm.

| Node | Geometry | Dimensions (units) | Rest Y |
| --- | --- | --- | --- |
| `NOR75_ROOT` | group | — | — |
| `NOR75_CASE` | 1 box | 3.2 × 0.15 × 1.35 | 0.075 |
| `NOR75_PLATE` | 1 box | 2.95 × 0.015 × 1.15 | 0.158 |
| `NOR75_PCB` | 1 box | 2.95 × 0.016 × 1.15 | 0.182 |
| `NOR75_SWITCHES` | 5 × 15 = 75 boxes | 0.19 × 0.05 × 0.19 | 0.23 |
| `NOR75_KEYCAPS` | 5 × 15 = 75 boxes | 0.185 × 0.12 × 0.185 | 0.32 |

The node names follow the `NOR75_*` convention, and the explosion code depends
on them resolving to the five parts named in `EXPLODED_OFFSETS`.

Switches and keycaps are laid out on a uniform 0.19 grid, 15 columns × 5 rows.
There is no row-width variation, so there is no Enter key, no arrow cluster, no
space bar and no modifier staggering — the layout is a grid, not a keyboard.

**78 draw calls, no instancing, no merged geometry, no textures.**

The copy in Section 08 describes a sculpted Cherry profile, a lightly textured
PBT surface and moulded double-shot legends. None of that is represented in the
scene. Section 04 describes anodized aluminium; the case is one flat-shaded box.

## Materials

There is no material pipeline. Surface values are declared in
`src/data/materials.ts` as `PlaceholderMaterial` — the file says so in its own
header comment — and are applied declaratively as `meshStandardMaterial` props:

| Part | Source | Applied at |
| --- | --- | --- |
| Case | `caseMaterials[config.case]` | `ProductParts.tsx` |
| Keycaps | `keycapMaterials[config.keycaps]` | `ProductParts.tsx` |
| Switches | `switchMaterials[config.switchType]` | `ProductParts.tsx` |
| Plate | hardcoded `#8d8f92`, metalness 0.6, roughness 0.45 | `ProductParts.tsx` |
| PCB | hardcoded `#1f3b2c`, metalness 0.1, roughness 0.8 | `ProductParts.tsx` |

Because materials are React props rather than animated values, a selection
change is an instant swap with no interpolation in any motion mode.
`MATERIAL_TRANSITION_LAMBDA` and `MATERIAL_SETTLE_EPSILON` in
`src/lib/constants.ts` describe a damped transition that was never implemented;
neither has a consumer.

`switchMaterials` returns the same value for `linear`, `tactile` and `clicky`, so
switch selection repaints nothing. Only the summary `<dl>` in the configurator
reflects it.

## Lighting and environment

`src/components/three/Environment.tsx` is three lights and nothing else:

```tsx
<ambientLight intensity={0.6} />
<directionalLight position={[5, 5, 5]} intensity={1.2} />
<directionalLight position={[-5, 2, -5]} intensity={0.4} />
```

No `Environment` from `@react-three/drei`, no HDRI, no lightmaps, no contact
shadows, no tone mapping configuration, no environment map.
`public/textures/hdr/` and `public/textures/**` are empty.

## Canvas configuration

`src/components/three/ProductCanvas.tsx`:

- `dpr={[1, 2]}` from `CANVAS_DPR`
- `frameloop="demand"` — frames are requested by `invalidate()`, never free-running
- `antialias: true`
- camera `near 0.1`, `far 100`, positioned at the intro state
- `background: #080808`, also applied to the wrapper element

`frameloop="demand"` is what keeps the scene off the critical path, and it is
also why `CameraRig` and `ProductParts` both have to call `invalidate()`
themselves whenever a damped value has not yet settled. That is the purpose of
the settle-epsilon checks in both files.

## Bundle deferral

Three.js is not part of the initial client graph. `next/dynamic` was tried and
rejected: a `next/dynamic` call site is emitted into the page's initial client
chunk graph, which spent roughly 1.1 s of script evaluation during hydration
before the intro copy could paint.

`useDeferredProductCanvas` in `ExperienceCanvas.tsx` uses a runtime `import()`
instead, gated on first user intent — `scroll`, `wheel`, `touchstart`,
`pointerdown` or `keydown`, or leaving the intro section — and then defers to
`requestIdleCallback` with a 400 ms `setTimeout` fallback.

Consequence: on an idle load with no interaction, no canvas exists in the
document at all.

## Interaction

One interactive object: the hero switch at grid row 2, column 7, which is what
the `switchMacro` camera state looks at.

- Pointer events are attached to that mesh only (`onPointerDown`, `onPointerUp`,
  `onPointerOver`, `onPointerOut`). It presses by translating −0.045 on Y.
- Press state lives in `src/components/three/heroSwitchPress.ts`, a module object,
  so the Section 07 DOM button and the mesh drive the same value.
- The mesh itself is not keyboard reachable — the canvas has no `tabindex`. The
  keyboard path is the `<button>` in `src/components/sections/Switches/index.tsx`,
  which handles Space and Enter and reports `aria-pressed`.

## Post-processing and shaders

None. No GLSL in the codebase, no `postprocessing` or
`@react-three/postprocessing` dependency, no effect composer. The scene is
rendered directly by WebGLRenderer with the default pipeline.

## What a real pipeline would need

1. Model and export the keyboard in Blender with the `NOR75_*` node names, and
   implement `export.py` to emit a GLB.
2. Author real PBR materials and move them into `src/three/materials/`, sampled
   from the GLB rather than hand-declared.
3. Replace the primitives with `useGLTF`, traversing to the named nodes and
   binding materials by name.
4. Give switch types distinct materials so the configurator's third axis becomes
   visible.
5. Add instancing or geometry merging for the 75+75 repeated parts.
6. Add an HDRI or authored lighting rig in place of the three bare lights.
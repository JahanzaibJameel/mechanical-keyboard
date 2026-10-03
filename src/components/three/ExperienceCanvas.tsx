"use client";

import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  HERO_ANIMATION,
  type CameraRigTarget,
  type ProductMotionTarget,
} from "@/animation/config";
import { ActiveSectionContext } from "@/components/layout/SiteShell";
import { Hero } from "@/components/sections/Hero";
import { WebGLFallback } from "@/components/three/WebGLFallback";
import { cameraStates } from "@/data/cameraStates";
import {
  detectWebGLSupport,
  type WebGLFailureReason,
  type WebGLSupport,
} from "@/lib/webgl";
import type { ProductCanvasProps } from "@/components/three/ProductCanvas";

type ProductCanvasComponent = ComponentType<ProductCanvasProps>;

const FIRST_FRAME_TIMEOUT_MS = 4000;

/**
 * Probes for a WebGL context once on mount.
 *
 * Starts as null rather than assuming support, so the deferred import is never
 * started until the probe has actually answered. The probe itself runs in a
 * timeout so the result lands off the critical path and no state is written
 * synchronously inside the effect body.
 */
function useWebGLSupport(): WebGLSupport | null {
  const [support, setSupport] = useState<WebGLSupport | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSupport(detectWebGLSupport());
    }, 0);

    return () => window.clearTimeout(handle);
  }, []);

  return support;
}

/**
 * True once the visitor has shown intent to move past the intro, either by
 * interacting with the page or by scrolling into a later section.
 */
function useProductExperienceIntent(activeSectionId: string | null): boolean {
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const markIntent = (): void => setHasInteracted(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    const signals: (keyof WindowEventMap)[] = [
      "scroll",
      "wheel",
      "touchstart",
      "pointerdown",
      "keydown",
    ];

    for (const signal of signals) {
      window.addEventListener(signal, markIntent, options);
    }

    return () => {
      for (const signal of signals) {
        window.removeEventListener(signal, markIntent);
      }
    };
  }, []);

  // Leaving the intro is itself the signal. Both terms only ever turn true, so
  // they combine without an effect writing state after render.
  return hasInteracted || (activeSectionId !== null && activeSectionId !== "intro");
}

/**
 * The Three.js bundle is loaded with a runtime import rather than
 * next/dynamic, and only once the 3D scene is actually reachable. A
 * next/dynamic call site is emitted into the page's initial client chunk
 * graph, which spends ~1.1s of script evaluation during hydration before the
 * intro copy can paint, and an idle callback alone fires before that paint
 * happens on an otherwise idle page. Loading on intent keeps the cost off the
 * critical path while still warming the scene before it is scrolled into.
 */
function useDeferredProductCanvas(enabled: boolean): ProductCanvasComponent | null {
  const [component, setComponent] = useState<ProductCanvasComponent | null>(null);

  useEffect(() => {
    if (!enabled || component !== null) {
      return;
    }

    let cancelled = false;

    const load = (): void => {
      void import("@/components/three/ProductCanvas").then((module) => {
        if (!cancelled) {
          setComponent(() => module.ProductCanvas);
        }
      });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const handle = idleWindow.requestIdleCallback(load, { timeout: 2000 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(load, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [enabled, component]);

  return component;
}

type MotionVector = {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => MotionVector;
};

function createMotionVector(
  [x, y, z]: readonly [number, number, number],
): CameraRigTarget["position"] {
  const vector: MotionVector = {
    x,
    y,
    z,
    set(nextX, nextY, nextZ) {
      vector.x = nextX;
      vector.y = nextY;
      vector.z = nextZ;
      return vector;
    },
  };

  // The DOM timeline uses only coordinates and set; the Three.js camera stays in the lazy chunk.
  return vector as CameraRigTarget["position"];
}

export function ExperienceCanvas() {
  const activeSectionId = useContext(ActiveSectionContext);
  const hasIntent = useProductExperienceIntent(activeSectionId);
  const support = useWebGLSupport();
  const [failure, setFailure] = useState<WebGLFailureReason | null>(null);
  const [firstFrameSeen, setFirstFrameSeen] = useState(false);

  const shouldLoadCanvas = hasIntent && support?.supported === true && failure === null;
  const ProductCanvas = useDeferredProductCanvas(shouldLoadCanvas);
  const showCanvas =
    ProductCanvas !== null && failure === null && (activeSectionId !== "intro" || hasIntent);

  // A context can be created and then never draw, so the watchdog waits for a
  // reported frame rather than for the canvas element to exist.
  useEffect(() => {
    if (!showCanvas || firstFrameSeen) {
      return;
    }

    const handle = window.setTimeout(() => {
      setFailure("no-first-frame");
    }, FIRST_FRAME_TIMEOUT_MS);

    return () => window.clearTimeout(handle);
  }, [showCanvas, firstFrameSeen]);

  const failureReason: WebGLFailureReason | null =
    failure ?? (support !== null && !support.supported ? "unsupported" : null);

  const cameraRigRef = useRef<CameraRigTarget>({
    position: createMotionVector(cameraStates.intro.position),
    target: createMotionVector(cameraStates.intro.target),
    fov: cameraStates.intro.fov,
  });
  const productRef = useRef<ProductMotionTarget>({
    scale: HERO_ANIMATION.productStartScale,
    opacity: 0,
  });

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-auto absolute inset-0 bg-background">
        {/* ProductCanvas is resolved from a runtime import() held in state so the
            Three.js bundle stays off the initial client graph. That is a
            deliberate deferral, not an accidentally unstable component type:
            the module resolves exactly once and `next/dynamic` was measured to
            cost ~1.1s of hydration script evaluation. See docs/performance.md. */}
        {failureReason !== null ? (
          <WebGLFallback reason={failureReason} />
        ) : showCanvas ? (
          // eslint-disable-next-line react-hooks/static-components
          <ProductCanvas
            productRef={productRef}
            onFirstFrame={() => setFirstFrameSeen(true)}
            onContextLost={() => setFailure("context-lost")}
          />
        ) : null}
      </div>
      <Hero cameraRigRef={cameraRigRef} productRef={productRef} />
    </div>
  );
}

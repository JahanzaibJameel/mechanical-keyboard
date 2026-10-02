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
import { cameraStates } from "@/data/cameraStates";
import { BRAND_BACKGROUND } from "@/lib/constants";
import type { ProductCanvasProps } from "@/components/three/ProductCanvas";

type ProductCanvasComponent = ComponentType<ProductCanvasProps>;

/**
 * True once the visitor has shown intent to move past the intro, either by
 * interacting with the page or by scrolling into a later section.
 */
function useProductExperienceIntent(activeSectionId: string | null): boolean {
  const [hasIntent, setHasIntent] = useState(false);

  useEffect(() => {
    if (activeSectionId !== null && activeSectionId !== "intro") {
      setHasIntent(true);
    }
  }, [activeSectionId]);

  useEffect(() => {
    if (hasIntent) {
      return;
    }

    const markIntent = (): void => setHasIntent(true);
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
  }, [hasIntent]);

  return hasIntent;
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
  const hasEnteredProductExperience = useRef(false);
  const hasIntent = useProductExperienceIntent(activeSectionId);
  const ProductCanvas = useDeferredProductCanvas(hasIntent);
  const cameraRigRef = useRef<CameraRigTarget>({
    position: createMotionVector(cameraStates.intro.position),
    target: createMotionVector(cameraStates.intro.target),
    fov: cameraStates.intro.fov,
  });
  const productRef = useRef<ProductMotionTarget>({
    scale: HERO_ANIMATION.productStartScale,
    opacity: 0,
  });

  useEffect(() => {
    if (activeSectionId !== null && activeSectionId !== "intro") {
      hasEnteredProductExperience.current = true;
    }
  }, [activeSectionId]);

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-auto absolute inset-0 bg-background">
        {ProductCanvas !== null &&
        (activeSectionId !== "intro" || hasEnteredProductExperience.current) ? (
          <ProductCanvas productRef={productRef} />
        ) : null}
      </div>
      <Hero cameraRigRef={cameraRigRef} productRef={productRef} />
    </div>
  );
}

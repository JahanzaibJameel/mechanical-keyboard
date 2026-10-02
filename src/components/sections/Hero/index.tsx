"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { createHeroTimeline } from "@/animation/timelines/heroTimeline";
import type { CameraRigTarget, ProductMotionTarget } from "@/animation/config";
import { SplitText } from "@/components/typography/SplitText";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type HeroProps = {
  readonly cameraRigRef: { readonly current: CameraRigTarget };
  readonly productRef: { readonly current: ProductMotionTarget };
};

export function Hero({ cameraRigRef, productRef }: HeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!textRef.current) return;

      const timeline = createHeroTimeline({
        cameraRigRef,
        productRef,
        textRef,
        reducedMotion,
      });
      timeline.play();
    },
    {
      scope: rootRef,
      dependencies: [cameraRigRef, productRef, reducedMotion],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={rootRef}
      aria-label="NØR 75 hero"
      className="pointer-events-none absolute inset-0 z-10 flex items-center px-8 sm:px-16"
    >
      <div className="max-w-5xl">
        <h1
          ref={textRef}
          aria-label="PRECISION IN MOTION"
          className="text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-foreground sm:text-7xl lg:text-8xl"
        >
          <SplitText text="PRECISION" className="block" />
          <SplitText text="IN MOTION" className="block" />
        </h1>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.3em] text-white/70">
          EXPLORE ↓
        </p>
      </div>
    </section>
  );
}
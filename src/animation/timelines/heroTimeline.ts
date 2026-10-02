import gsap from "gsap";
import {
  HERO_ANIMATION,
  type CameraRigTarget,
  type ProductMotionTarget,
} from "@/animation/config";
import { scale } from "@/animation/presets/scale";
import { cameraStates } from "@/data/cameraStates";

export type HeroTimelineOptions = {
  readonly cameraRigRef: { readonly current: CameraRigTarget };
  readonly productRef: { readonly current: ProductMotionTarget };
  readonly textRef: { readonly current: HTMLElement | null };
  readonly reducedMotion: boolean;
};

function invalidateProduct(product: ProductMotionTarget): void {
  if ("invalidate" in product && typeof product.invalidate === "function") {
    product.invalidate();
  }
}

export function createHeroTimeline({
  cameraRigRef,
  productRef,
  textRef,
  reducedMotion,
}: HeroTimelineOptions): gsap.core.Timeline {
  const camera = cameraRigRef.current;
  const product = productRef.current;
  const timeline = gsap.timeline({
    paused: true,
    onUpdate: () => invalidateProduct(product),
  });
  const text = textRef.current;
  const hero = cameraStates.hero;
  const characters = text?.querySelectorAll<HTMLElement>("[data-reveal-character]");

  if (reducedMotion) {
    camera.position.set(...hero.position);
    camera.target.set(...hero.target);
    camera.fov = hero.fov;
    product.scale = 1;
    product.opacity = 1;
    if (characters) {
      gsap.set(characters, { clipPath: "inset(0)" });
    }
    return timeline;
  }

  timeline.to(
    camera.position,
    {
      x: hero.position[0],
      y: hero.position[1],
      z: hero.position[2],
      duration: HERO_ANIMATION.cameraDuration,
      ease: HERO_ANIMATION.ease,
    },
    0,
  );
  timeline.to(
    camera.target,
    {
      x: hero.target[0],
      y: hero.target[1],
      z: hero.target[2],
      duration: HERO_ANIMATION.cameraDuration,
      ease: HERO_ANIMATION.ease,
    },
    0,
  );
  timeline.to(
    camera,
    {
      fov: hero.fov,
      duration: HERO_ANIMATION.cameraDuration,
      ease: HERO_ANIMATION.ease,
    },
    0,
  );
  timeline.fromTo(
    product,
    scale.hidden,
    {
      ...scale.visible,
      duration: HERO_ANIMATION.productDuration,
      ease: HERO_ANIMATION.ease,
    },
    HERO_ANIMATION.productDelay,
  );
  if (characters) {
    timeline.fromTo(
      characters,
      { clipPath: "inset(100% 0 0 0)" },
      {
        clipPath: "inset(0)",
        duration: 0.5,
        stagger: HERO_ANIMATION.characterStagger,
        ease: HERO_ANIMATION.ease,
      },
      0,
    );
  }

  return timeline;
}
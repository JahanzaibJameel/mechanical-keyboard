import type { ProductMotionTarget } from "@/animation/config";
import { getSectionById } from "@/data/sections";

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function rangeProgress(progress: number, start: number, end: number): number {
  if (end <= start) {
    return 1;
  }
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

export function updateProductTimeline(
  progress: number,
  target: ProductMotionTarget,
): void {
  const intro = getSectionById("intro");
  const hero = getSectionById("hero");
  const construction = getSectionById("construction");
  const finalProduct = getSectionById("finalProduct");

  if (progress < intro.timelineEnd) {
    const amount = rangeProgress(progress, intro.timelineStart, intro.timelineEnd);
    target.scale = mix(0.86, 0.9, amount);
    target.opacity = mix(0.08, 0.35, amount);
    return;
  }

  if (progress < hero.timelineEnd) {
    const amount = rangeProgress(progress, hero.timelineStart, hero.timelineEnd);
    target.scale = mix(0.9, 1, amount);
    target.opacity = mix(0.35, 1, amount);
    return;
  }

  if (progress >= construction.timelineStart && progress <= construction.timelineEnd) {
    const amount = rangeProgress(
      progress,
      construction.timelineStart,
      construction.timelineEnd,
    );
    target.scale = mix(1, 0.9, amount);
    target.opacity = 1;
    return;
  }

  if (progress >= finalProduct.timelineStart) {
    const amount = rangeProgress(
      progress,
      finalProduct.timelineStart,
      finalProduct.timelineEnd,
    );
    target.scale = mix(0.9, 1, amount);
    target.opacity = 1;
    return;
  }

  target.scale = 1;
  target.opacity = 1;
}

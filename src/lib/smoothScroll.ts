// Bridge between Lenis and the rest of the app.
//
// useExperienceProgress reads frames from here rather than importing Lenis, for
// two reasons: the hook stays unit testable with no DOM and no Lenis instance,
// and the native-scroll fallback path stays reachable in the same code shape
// rather than living in a separate branch somewhere else in the tree.

export type SmoothScrollFrame = {
  /** Normalized scroll position, 0 to 1. */
  readonly progress: number;
  /** Lenis velocity in scroll units per second. */
  readonly velocity: number;
};

type FrameSubscriber = (frame: SmoothScrollFrame) => void;

const subscribers = new Set<FrameSubscriber>();

/**
 * True while a Lenis instance owns the scroll position. While it is true the
 * native scroll handler is ignored, because Lenis is already writing
 * window.scrollY and the two would fight over the same value.
 */
export const smoothScrollActive = { current: false };

export function subscribeSmoothScrollFrames(subscriber: FrameSubscriber): () => void {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

/**
 * Called by the scroll owner on every frame it produces. Under Lenis this is
 * driven by Lenis's own rAF loop, which keeps running while the damped tail is
 * still settling, which is what makes the camera carry on moving after the
 * wheel stops.
 */
export function publishSmoothScrollFrame(frame: SmoothScrollFrame): void {
  for (const subscriber of subscribers) {
    subscriber(frame);
  }
}

export function setSmoothScrollActive(active: boolean): void {
  smoothScrollActive.current = active;
}

export function resetSmoothScrollSubscribers(): void {
  subscribers.clear();
  smoothScrollActive.current = false;
}
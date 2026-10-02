/**
 * Press state for the hero switch in Section 07.
 *
 * Kept outside React so the same state can be driven from two places: pointer
 * events on the WebGL switch itself, and the keyboard-accessible button in the
 * Section 07 copy. Module scope keeps it a single source of truth for both,
 * mirroring `useProductConfig`'s external store pattern.
 */
export const heroSwitchPress = {
  pressed: false,
};

let requestFrame: (() => void) | null = null;

/**
 * Lets the press store ask for another frame. The canvas runs on
 * `frameloop="always"`, so a press started from the DOM is picked up by the
 * next useFrame tick automatically. The invalidation path is retained as a
 * safety net for any future return to `frameloop="demand"`.
 */
export function registerHeroSwitchInvalidation(invalidate: () => void): () => void {
  requestFrame = invalidate;

  return () => {
    if (requestFrame === invalidate) {
      requestFrame = null;
    }
  };
}

export function setHeroSwitchPressed(pressed: boolean): void {
  if (heroSwitchPress.pressed === pressed) {
    return;
  }

  heroSwitchPress.pressed = pressed;
  requestFrame?.();
}

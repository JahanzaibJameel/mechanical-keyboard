"use client";

import { Vector2 } from "three";
import { triggerHeroRipple } from "./keycapMotion";

export const heroSwitchPress = {
  pressed: false,
};

let requestFrame: (() => void) | null = null;

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

  if (pressed) {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const centerY = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
      triggerHeroRipple(new Vector2(centerX, centerY));
    }
  }
}
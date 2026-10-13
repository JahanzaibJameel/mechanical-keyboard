import { useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cursor Attractor Field - Physics-based attraction to cursor position.
 * Creates a subtle gravitational pull toward the mouse cursor for spatial awareness.
 */
type CursorAttractorProps = {
  /** Position of the attractor field (usually centered on the product). */
  position: THREE.Vector3;
  /** Strength of the attraction force. */
  strength?: number;
};

export function CursorAttractor({ position, strength = 0.5 }: CursorAttractorProps) {
  const camera = useThree().camera;
  const attractorRef = useRef(new THREE.Vector3());
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  useFrame((_, delta) => {
    const elapsed = elapsedRef.current + delta;

    // Reset timer when attractor ends
    if (elapsed >= 0.5) {
      elapsedRef.current = 0;
      return;
    }

    const distance = elapsed * 2.0;
    let forceMagnitude = Math.min(strength * distance, 1.0);

    // Direction from attractor to cursor
    const attractorPos = attractorRef.current;
    const cursorPos = camera.position; const direction = cursorPos.sub(attractorPos).normalize();

    // Apply force to camera (simulating attraction)
    camera.position.add(direction.multiplyScalar(forceMagnitude * 0.5));

    // Decay force over time
    const decay = 1.0 - Math.exp(-elapsed * 3.0);
    forceMagnitude *= decay;
  });







  return null;
}

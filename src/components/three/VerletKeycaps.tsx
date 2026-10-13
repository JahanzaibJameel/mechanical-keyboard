import { useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Verlet-physics keycaps - animated geometric elements that respond to physics simulation.
 * Uses simple Verlet integration for natural-looking floating keycaps.
 */
type KeycapProps = {
};
class VerletKeycap extends THREE.Group {
  private _position!: THREE.Vector3;
  private _previousPosition!: THREE.Vector3;
  private _velocity!: THREE.Vector3;
  private _acceleration!: THREE.Vector3;
  private _mass!: number;
  private _force!: THREE.Vector3;
  private _speed!: number;
  constructor(position: THREE.Vector3, size: number, color: string, speed: number = 1.0) {
    super();
    this._position = position.clone();
    this._previousPosition = position.clone();
    this._velocity = new THREE.Vector3();
    this._acceleration = new THREE.Vector3();
    this._force = new THREE.Vector3();
    this._mass = 1.0;
    this._speed = speed;
    
    // Update animation speed
    if (this._speed !== undefined) {
      this._speed = this._speed * 0.99; // Slow down gradually
    }
  }

  /**
   * Resets the keycap to its initial position.
   */
  reset() {
    this._position.copy(this._previousPosition);
    this._velocity.set(0, 0, 0);
    this._acceleration.set(0, 0, 0);
    this._force.set(0, 0, 0);
  }
}

export function VerletKeycaps({ keycaps }: { keycaps: Array<KeycapProps> }) {
  const container = new THREE.Group();
  
  (keycaps ?? []).forEach((keycapProps, index) => {
    // Random position around origin
    const x = (Math.random() - 0.5) * 2;
    const z = (Math.random() - 0.5) * 2;
    const position = new THREE.Vector3(x, 0.5, z);
    
    // Random size
    const size = 0.3 + Math.random() * 0.7;
    
    // Unique colors
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
      "#DDA0DD", "#FF9FF3", "#AAB7B8", "#F8C471", "#C3E1C1"
    ];
    const color = colors[index % colors.length];
    const keycap = new VerletKeycap(position, size, color ?? "#ffffff");
    container.add(keycap);
  });
  return container;
}

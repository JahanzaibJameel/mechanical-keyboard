/**
 * Staggered explosion.
 *
 * Previously every layer was multiplied by one shared scalar, so all five moved
 * simultaneously and only their destinations differed. The timing is what makes
 * the stack read as engineered rather than mechanical, so each layer now has its
 * own start offset within the section window and its own overshoot.
 *
 * Pure, so the schedule can be asserted without a renderer.
 */

/** The five layers, in the order they separate: KEYCAPS -> CASE. */
export type ExplosionLayer = "keycaps" | "switches" | "plate" | "pcb" | "case";

/**
 * Where each layer's motion begins within the section window.
 *
 * Keycaps go first because they are the outermost layer and have the furthest to
 * travel; the case goes last because it is the base everything else lifts off.
 */
export const LAYER_START: Readonly<Record<ExplosionLayer, number>> = {
  keycaps: 0.0,
  switches: 0.12,
  plate: 0.24,
  pcb: 0.32,
  case: 0.4,
};

export const EXPLOSION_DAMPING = 6;
export const EXPLOSION_SETTLE_EPSILON = 0.0005;

/**
 * Overshoot strength per layer, as the `c1` of the standard easeOutBack curve.
 *
 * The relationship between c1 and the resulting peak is
 * peak = 1 + 4c1^3 / (27(c1 + 1)^2), so these values give approximately:
 * keycaps 8%, switches 5%, plate 4.5%, pcb 3%, case 3%. The keycaps overshoot
 * most because they are the lightest, fastest-moving layer and can afford it;
 * the board and the case barely move past their seats at all.
 */
export const LAYER_OVERSHOOT: Readonly<Record<ExplosionLayer, number>> = {
  keycaps: 1.5,
  switches: 1.17,
  plate: 1.1,
  pcb: 0.9,
  case: 0.9,
};

const ALL_LAYERS: readonly ExplosionLayer[] = [
  "keycaps",
  "switches",
  "plate",
  "pcb",
  "case",
];

/**
 * easeOutBack with the standard shape, reaching exactly 0 and 1 at the ends so a
 * layer still arrives precisely on its keyframe.
 */
export function easeOutBack(t: number, c1: number): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  const u = t - 1;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
}

/** How far past 1 an overshoot of this strength travels. */
export function overshootPeak(c1: number): number {
  let peak = 1;
  for (let i = 0; i <= 4000; i++) {
    peak = Math.max(peak, easeOutBack(i / 4000, c1));
  }
  return peak;
}

/**
 * Where one layer is, given the shared explosion amount in 0..1.
 *
 * Each layer maps that amount into its own window, so every layer still reaches
 * exactly 1 when the shared amount does and the stack is fully separated at the
 * same point it always was. Only the timing differs.
 *
 * On reassembly the shared amount runs 1 -> 0 through the same forward window,
 * which reverses the stagger for free: the case, whose window ends soonest,
 * completes first, and the keycaps, whose window is the full width, arrive last.
 *
 * The result is deliberately NOT clamped at the top. An earlier version clamped
 * to 1, which silently deleted the whole effect: with the keycaps' overshoot
 * strength the curve is already past 1 from local 0.4 onward, so clamping pinned
 * the keycaps at their seat for the entire back half of the section and the 8%
 * overshoot could never be seen. The curve is exact at both endpoints and never
 * dips below 0, so the only excursion is the intended overshoot.
 */
export function layerExplosion(
  layer: ExplosionLayer,
  explosion: number,
): number {
  const amount = Math.min(1, Math.max(0, explosion));
  const start = LAYER_START[layer];
  const span = 1 - start;

  if (span <= 0) {
    return amount;
  }

  const local = Math.min(1, Math.max(0, (amount - start) / span));

  return easeOutBack(local, LAYER_OVERSHOOT[layer]);
}

/** Every layer's position at a given explosion amount, for tests and diagnostics. */
export function allLayerExplosions(
  explosion: number,
): Readonly<Record<ExplosionLayer, number>> {
  return {
    keycaps: layerExplosion("keycaps", explosion),
    switches: layerExplosion("switches", explosion),
    plate: layerExplosion("plate", explosion),
    pcb: layerExplosion("pcb", explosion),
    case: layerExplosion("case", explosion),
  };
}

export { ALL_LAYERS };
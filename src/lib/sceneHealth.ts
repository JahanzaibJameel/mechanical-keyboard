// Scene health, reported from inside the canvas and read by the fallback
// watchdog outside it.
//
// The distinction matters: a context that was created and is still healthy but
// has not drawn its first frame yet is a slow machine, not a broken one. On a
// software rasteriser, compiling the scene and postprocessing shaders can push
// the first frame well past any short timeout. Swapping a healthy scene for the
// static fallback because it was slow is worse than showing a slow 3D view, so
// the watchdog asks this before it gives up.

/** True once the browser has taken the context away. */
export const sceneContextLost = { current: false };

/** True once the scene has rendered at least one frame. */
export const sceneHasRenderedFrame = { current: false };

export function resetSceneHealth(): void {
  sceneContextLost.current = false;
  sceneHasRenderedFrame.current = false;
}
// WebGL availability probing. Pure browser utilities with no React and no
// three.js, so this stays inside the logic layer and can be unit tested.

export type WebGLFailureReason = "unsupported" | "context-lost" | "no-first-frame";

export type WebGLSupport = {
  readonly supported: boolean;
  readonly renderer: string | null;
};

const UNSUPPORTED: WebGLSupport = { supported: false, renderer: null };

const CONTEXT_NAMES = ["webgl2", "webgl", "experimental-webgl"] as const;

type AnyWebGLContext = WebGL2RenderingContext | WebGLRenderingContext;

/**
 * Attempts to create a WebGL context on a throwaway canvas.
 *
 * The context is released before returning, because browsers cap the number of
 * live WebGL contexts per page (commonly 16) and a leaked probe context would
 * count against the budget the real canvas needs.
 */
export function createProbeContext(): AnyWebGLContext | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  for (const name of CONTEXT_NAMES) {
    let context: AnyWebGLContext | null = null;

    try {
      context = canvas.getContext(name, {
        failIfMajorPerformanceCaveat: false,
      }) as AnyWebGLContext | null;
    } catch {
      context = null;
    }

    if (context !== null) {
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return context;
    }
  }

  return null;
}

/**
 * Reports whether this browser can provide a WebGL context, and which renderer
 * it resolved to. Returns supported: false during server rendering.
 */
export function detectWebGLSupport(): WebGLSupport {
  const context = createProbeContext();

  if (context === null) {
    return UNSUPPORTED;
  }

  const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo
    ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : null;

  return { supported: true, renderer };
}

/** Human-readable copy for each way the 3D view can fail. */
export const WEBGL_FAILURE_COPY: Readonly<
  Record<WebGLFailureReason, { readonly heading: string; readonly detail: string }>
> = {
  unsupported: {
    heading: "Your browser cannot run the 3D view",
    detail:
      "NØR 75 is an interactive WebGL experience. This browser did not provide a WebGL context, so the live product view has been replaced with a still.",
  },
  "context-lost": {
    heading: "The 3D view was interrupted",
    detail:
      "The browser released the graphics context, usually after a GPU reset, a driver change or the tab being backgrounded for a long time. The live product view has been replaced with a still.",
  },
  "no-first-frame": {
    heading: "The 3D view did not start",
    detail:
      "The graphics context was created but no frame was rendered. This usually means the GPU is unavailable or blocked. The live product view has been replaced with a still.",
  },
};
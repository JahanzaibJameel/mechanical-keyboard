import Image from "next/image";
import { WEBGL_FAILURE_COPY, type WebGLFailureReason } from "@/lib/webgl";

export type WebGLFallbackProps = {
  readonly reason: WebGLFailureReason;
};

const IMAGE_ALT =
  "Top-down view of the NØR 75: a low rectangular aluminium case in obsidian, " +
  "holding a grid of grey keycaps, with three signal-yellow accent keys at the " +
  "escape cluster and along the bottom row.";

/**
 * Static stand-in for the WebGL scene.
 *
 * Replaces the canvas in the same stacking position, so the hero copy and the
 * page's own copy still render over it and a visitor without WebGL is left with
 * the product and an explanation rather than an empty dark field.
 */
export function WebGLFallback({ reason }: WebGLFallbackProps) {
  const copy = WEBGL_FAILURE_COPY[reason];

  return (
    <section
      aria-labelledby="webgl-fallback-heading"
      data-webgl-fallback={reason}
      className="pointer-events-auto absolute inset-0 z-0 flex items-center justify-center overflow-y-auto bg-background px-8 py-24"
    >
      <div className="w-full max-w-2xl">
        <Image
          src="/images/fallback/nor75-fallback.png"
          alt={IMAGE_ALT}
          width={1200}
          height={630}
          sizes="(max-width: 640px) 100vw, 42rem"
          className="w-full rounded-sm border border-white/10"
          priority
        />

        <p className="mt-8 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
          NØR 75
        </p>
        <h2
          id="webgl-fallback-heading"
          className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl"
        >
          {copy.heading}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/70">{copy.detail}</p>
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          The full specification is still available as text in section 09, and every
          section of this page remains readable and navigable without the 3D view.
        </p>
      </div>
    </section>
  );
}
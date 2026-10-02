"use client";

import { forwardRef, type CSSProperties } from "react";

export type SplitTextProps = {
  readonly text: string;
  readonly className?: string;
};

const initialClipStyle: CSSProperties & { "--split-clip-top": string } = {
  "--split-clip-top": "100%",
};

export const SplitText = forwardRef<HTMLSpanElement, SplitTextProps>(
  function SplitText({ text, className }, ref) {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={`${className ?? ""} [clip-path:inset(var(--split-clip-top)_0_0_0)]`}
        data-reveal-character
        style={initialClipStyle}
      >
        <span aria-hidden="true" className="inline-flex">
          {Array.from(text).map((character, characterIndex) => (
            <span
              key={`${character}-${characterIndex}`}
              aria-hidden="true"
              className="inline-block align-bottom"
            >
              {character === " " ? "\u00a0" : character}
            </span>
          ))}
        </span>
      </span>
    );
  },
);

SplitText.displayName = "SplitText";
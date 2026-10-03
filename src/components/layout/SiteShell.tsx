"use client";

import { createContext, useEffect, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { sectionRevealState } from "@/animation/transitions/sectionTransitions";
import { siteCopy } from "@/data/sections";
import { useExperienceProgress } from "@/hooks/useExperienceProgress";

type Props = {
  readonly children: ReactNode;
  readonly canvas?: ReactNode;
};

export const ActiveSectionContext = createContext<string | null>("intro");

const Navigation = dynamic(
  () =>
    import("@/components/layout/Navigation").then((module) => ({
      default: module.Navigation,
    })),
  { ssr: false },
);

const SectionRail = dynamic(
  () =>
    import("@/components/layout/SectionRail").then((module) => ({
      default: module.SectionRail,
    })),
  { ssr: false },
);

export function SiteShell({ children, canvas }: Props) {
  const mainRef = useRef<HTMLElement>(null);
  const { activeSectionId } = useExperienceProgress();

  useEffect(() => {
    const main = mainRef.current;
    if (!main) {
      return;
    }

    const sectionNodes = main.querySelectorAll<HTMLElement>("[data-experience-section]");
    sectionNodes.forEach((node) => {
      const visible = sectionRevealState(node.id, activeSectionId) === "visible";
      node.classList.add("transition-[opacity,transform]", "duration-700", "motion-reduce:transition-none");
      node.classList.toggle("opacity-0", !visible);
      node.classList.toggle("translate-y-6", !visible);
      node.classList.toggle("opacity-100", visible);
      node.classList.toggle("translate-y-0", visible);
    });

    // The hero is rendered inside the fixed canvas layer, which is a sibling of
    // <main> rather than a descendant, so this cannot be scoped to `main`. It
    // covers the viewport from inside a fixed container, so inset-0 means the
    // viewport and the headline stays centred regardless of scroll position.
    const hero = document.querySelector<HTMLElement>('[aria-label="NØR 75 hero"]');
    if (hero) {
      const isHeroActive = activeSectionId === "hero";
      hero.classList.add("transition-opacity", "duration-700", "motion-reduce:transition-none");
      hero.classList.toggle("opacity-0", !isHeroActive);
      hero.classList.toggle("opacity-100", isHeroActive);
      hero.setAttribute("aria-hidden", String(!isHeroActive));
    }
  }, [activeSectionId]);

  return (
    <ActiveSectionContext.Provider value={activeSectionId}>
      <div className="relative min-h-dvh bg-background text-foreground">
        <a
          className="sr-only z-50 bg-white px-4 py-3 text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          href="#experience-content"
        >
          {siteCopy.skipLink}
        </a>
        <Navigation activeSectionId={activeSectionId} />
        <SectionRail activeSectionId={activeSectionId} />
        <div className="fixed inset-0 z-0 pointer-events-none">
          {canvas}
        </div>
        <main ref={mainRef} id="experience-content" className="relative isolate min-h-dvh">
          {children}
        </main>
      </div>
    </ActiveSectionContext.Provider>
  );
}

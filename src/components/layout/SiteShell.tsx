"use client";

import { createContext, useEffect, useRef, type ReactNode } from "react";
import { sectionRevealState } from "@/animation/transitions/sectionTransitions";
import { Navigation } from "@/components/layout/Navigation";
import { SectionRail } from "@/components/layout/SectionRail";
import { siteCopy } from "@/data/sections";
import { useExperienceProgress } from "@/hooks/useExperienceProgress";

type Props = {
  readonly children: ReactNode;
  readonly canvas?: ReactNode;
};

export const ActiveSectionContext = createContext<string | null>("intro");

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

    const hero = main.querySelector<HTMLElement>('[aria-label="NØR 75 hero"]');
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

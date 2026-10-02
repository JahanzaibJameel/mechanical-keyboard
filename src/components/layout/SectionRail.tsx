import { sections, siteCopy } from "@/data/sections";

type Props = {
  readonly activeSectionId: string | null;
};

export function SectionRail({ activeSectionId }: Props) {
  return (
    <nav
      aria-label={siteCopy.sectionRailLabel}
      className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-sm border border-white/15 bg-black/75 px-3 py-2 backdrop-blur-sm sm:bottom-auto sm:left-auto sm:right-5 sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2 sm:px-2"
    >
      <ol className="flex max-w-[calc(100vw-2rem)] gap-2 overflow-x-auto sm:flex-col sm:gap-1">
        {sections.map((section, index) => (
          <li key={section.id} className="shrink-0">
            <a
              aria-current={activeSectionId === section.id ? "location" : undefined}
              aria-label={`${String(index + 1).padStart(2, "0")} ${section.label}`}
              className="flex size-10 min-w-[24px] min-h-[24px] items-center justify-center text-xs font-medium tabular-nums text-white/50 transition-colors hover:text-white aria-[current=location]:bg-white aria-[current=location]:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href={`#${section.id}`}
            >
              {String(index + 1).padStart(2, "0")}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

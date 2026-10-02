import { sections, siteCopy } from "@/data/sections";

type Props = {
  readonly activeSectionId: string | null;
};

export function Navigation({ activeSectionId }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#080808]/85 px-5 py-3 backdrop-blur-sm sm:px-10">
      <nav aria-label={siteCopy.navigationLabel} className="mx-auto flex max-w-7xl items-center gap-8">
        <a className="shrink-0 text-sm font-semibold tracking-[0.2em] text-white" href="#intro">
          {siteCopy.brand}
        </a>
        <ul className="flex min-w-0 flex-1 gap-6 overflow-x-auto text-xs text-white/65">
          {sections.map((section) => (
            <li key={section.id} className="shrink-0">
              <a
                aria-current={activeSectionId === section.id ? "location" : undefined}
                className="inline-flex min-h-[24px] items-center py-2 transition-colors hover:text-white aria-[current=location]:text-white"
                href={`#${section.id}`}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

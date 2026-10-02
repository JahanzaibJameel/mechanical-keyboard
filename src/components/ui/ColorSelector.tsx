"use client";

type ColorSelectorOption = {
  readonly id: string;
  readonly label: string;
  readonly swatch: string;
};

type Props = {
  readonly label: string;
  readonly value: string;
  readonly options: readonly ColorSelectorOption[];
  readonly onChange: (id: string) => void;
};

export function ColorSelector({ label, value, options, onChange }: Props) {
  return (
    <fieldset className="group/selector border-0 p-0">
      <legend className="mb-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-white/60">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.id === value;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.id)}
              className={`flex min-h-[24px] items-center gap-2.5 border px-3.5 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] transition-colors duration-200 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isActive
                  ? "border-white/70 bg-white/10 text-white"
                  : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full border transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  isActive
                    ? "scale-110 border-white/70"
                    : "border-white/25 group-hover:scale-110"
                }`}
                style={{ backgroundColor: option.swatch }}
              />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
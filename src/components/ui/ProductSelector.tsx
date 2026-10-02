"use client";

type ProductSelectorOption = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
};

type Props = {
  readonly label: string;
  readonly value: string;
  readonly options: readonly ProductSelectorOption[];
  readonly onChange: (id: string) => void;
};

export function ProductSelector({ label, value, options, onChange }: Props) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-white/60">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const isActive = option.id === value;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.id)}
              className={`flex flex-col gap-1 border px-3.5 py-3 text-left transition-colors duration-200 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isActive
                  ? "border-white/70 bg-white/10"
                  : "border-white/15 hover:border-white/40"
              }`}
            >
              <span
                className={`font-mono text-[0.6875rem] uppercase tracking-[0.18em] transition-colors duration-200 ease-out motion-reduce:transition-none ${
                  isActive ? "text-white" : "text-white/60"
                }`}
              >
                {option.label}
              </span>
              <span className="text-xs leading-snug text-white/50">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
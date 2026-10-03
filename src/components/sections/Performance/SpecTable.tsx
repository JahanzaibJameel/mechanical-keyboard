import { SPEC_ROWS, SPEC_TABLE_CAPTION, SPEC_TABLE_ID } from "@/data/specs";

/**
 * The product specification as a semantic table.
 *
 * This is the text alternative for the 3D scene, not a design flourish. The
 * table id is referenced by aria-describedby on the canvas wrapper, so a
 * screen-reader user arriving at the 3D layer is pointed at these rows, and the
 * WebGL fallback tells sighted users without WebGL where to find them.
 */
export function SpecTable() {
  return (
    <table id={SPEC_TABLE_ID} className="mt-14 w-full border-collapse text-left">
      <caption className="mb-4 text-left text-xs font-medium uppercase tracking-[0.3em] text-white/60">
        {SPEC_TABLE_CAPTION}
      </caption>
      <thead>
        <tr className="border-b border-white/20">
          <th scope="col" className="py-3 pr-6 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            Specification
          </th>
          <th scope="col" className="py-3 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {SPEC_ROWS.map((row) => (
          <tr key={row.label} className="border-b border-white/10">
            <th
              scope="row"
              className="py-3 pr-6 align-top text-sm font-normal text-white/70"
            >
              {row.label}
            </th>
            <td className="py-3 align-top text-sm text-white">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
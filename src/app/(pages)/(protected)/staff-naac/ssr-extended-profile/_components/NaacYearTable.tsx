import { Input } from "@/components/ui/input";
import type { YearValue } from "../../_data/ssr-extended-data";

/** Angular `table-year` — year labels on top row, inputs below. */
export function NaacYearTable({
  years,
  values,
  onChange,
}: {
  years: YearValue[];
  values?: Record<string, string>;
  onChange: (year: string, value: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className="w-full border-collapse text-center text-sm"
        style={{ border: "1px solid #707070" }}
      >
        <tbody>
          <tr>
            {years.map((y) => (
              <td
                key={`h-${y.year}`}
                className="border border-[#707070] px-2 py-1.5 font-normal text-[#333]"
              >
                {y.year}
              </td>
            ))}
          </tr>
          <tr>
            {years.map((y) => (
              <td key={`v-${y.year}`} className="border border-[#707070] p-1">
                <Input
                  className="h-9 rounded-sm border-[#ccc] bg-white text-center shadow-none"
                  value={values?.[y.year] ?? y.value}
                  onChange={(e) => onChange(y.year, e.target.value)}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

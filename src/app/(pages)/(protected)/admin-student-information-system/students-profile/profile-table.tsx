/** Shared Angular-style HTML table tokens for Student Details tabs. */

export const PROFILE_TH =
  "border border-[#c3d9ff] bg-[#C3D9FF] px-2 py-1.5 text-left text-xs font-medium text-[#333]";
export const PROFILE_TD =
  "border border-[#e8e8e8] px-2 py-1.5 text-left text-xs text-[#333]";

export function profileStatusClass(code: string): string {
  switch (code.toUpperCase().replace(/\s+/g, "")) {
    case "INCOLLEGE":
      return "font-bold text-[green]";
    case "DTND":
      return "font-bold text-[red]";
    case "PASSEDOUT":
      return "font-bold text-[#461eb6]";
    case "DETAINRECOMMENDED":
      return "font-bold text-[orangered]";
    case "DISCONTINUED":
      return "font-bold text-[red]";
    default:
      return "font-medium text-[#333]";
  }
}

export function ProfileEmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={PROFILE_TD}>
        <span className="text-sm font-medium text-[red]">{message}</span>
      </td>
    </tr>
  );
}

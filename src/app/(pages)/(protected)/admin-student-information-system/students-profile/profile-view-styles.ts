/** Angular `students-profile` view tokens. */
export const STUDENT_PROFILE_VIEW = {
  darkBlue: "#00008b",
  linkBlue: "#007bff",
  gold: "#ffc107",
  border: "#dee2e6",
  photoBoxBorder: "#b3d4fc",
  photoBoxBg: "#e8f4fc",
  statusGreen: "#008000",
  tabActiveBg: "#ffc107",
  label: "#333333",
} as const;

export function formatAdmissionDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export function studentProfileStatusClass(code: string): string {
  switch (code.toUpperCase().replace(/\s+/g, "")) {
    case "INCOLLEGE":
      return "font-bold text-[#008000]";
    case "DTND":
      return "font-semibold text-red-600";
    case "PASSEDOUT":
      return "font-semibold text-[#007bff]";
    case "DISCONTINUED":
      return "font-semibold text-slate-500";
    default:
      return "font-medium text-[#333333]";
  }
}

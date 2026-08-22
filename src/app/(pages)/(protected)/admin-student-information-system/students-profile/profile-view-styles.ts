/** Angular `students-profile` view tokens. */
export const STUDENT_PROFILE_VIEW = {
  darkBlue: "#042956",
  linkBlue: "#007bff",
  gold: "#ffcf46",
  border: "#dee2e6",
  photoBoxBorder: "#c3d9ff",
  photoBoxBg: "#e8f4fc",
  statusGreen: "#008000",
  tabActiveBg: "#ffcf46",
  label: "#333333",
  sectionTitle: "#0c51a4",
} as const;

export function formatAdmissionDate(value: unknown): string {
  if (!value) return "";
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
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export function studentProfileStatusClass(code: string): string {
  switch (code.toUpperCase().replace(/\s+/g, "")) {
    case "INCOLLEGE":
      return "font-bold text-[green]";
    case "DTND":
      return "font-bold text-[red]";
    case "PASSEDOUT":
      return "font-bold text-[#461eb6]";
    case "DISCONTINUED":
      return "font-bold text-[red]";
    case "DETAINRECOMMENDED":
      return "font-bold text-[orangered]";
    default:
      return "font-medium text-[#333333]";
  }
}

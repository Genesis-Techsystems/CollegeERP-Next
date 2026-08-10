/** Shared helpers for ERP module href / label → App Router mapping. */

export function normalizeLabelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Student portal viewer (Academics Class Diary / Assignments / …).
 * DB menus often reuse bare labels / `staff-classes/...` hrefs for both
 * staff Academics and student Academics — role picks the correct App Router page.
 */
export function isStudentPortalViewer(): boolean {
  if (typeof globalThis.window === "undefined") return false;
  try {
    const storage = globalThis.localStorage;
    const role = (storage.getItem("userRole") ?? "").toUpperCase();
    if (role === "STUDENT" || role === "MSTUDENT") return true;
    const studentId = Number(storage.getItem("studentId") || 0);
    const employeeId = Number(storage.getItem("employeeId") || 0);
    return (
      Number.isFinite(studentId) &&
      studentId > 0 &&
      !(Number.isFinite(employeeId) && employeeId > 0)
    );
  } catch {
    return false;
  }
}

/** @deprecated Prefer `isStudentPortalViewer` — same predicate. */
export const isStudentClassDiaryViewer = isStudentPortalViewer;

export function mapModuleTail(
  href: string,
  angularSegment: string,
  base: string,
  slugAliases: Record<string, string>,
  defaultSlug: string,
): string | null {
  const hrefLower = href.toLowerCase();
  if (!hrefLower.includes(angularSegment)) return null;
  const idx = hrefLower.indexOf(angularSegment);
  const tail = href
    .slice(idx + angularSegment.length)
    .replace(/^\/+/, "")
    .split("?")[0];
  if (!tail) return `${base}/${defaultSlug}`;

  const tailLower = tail.toLowerCase();
  if (slugAliases[tailLower]) {
    return `${base}/${slugAliases[tailLower]}`;
  }

  const first = tail.split("/")[0]!.toLowerCase();
  const slug =
    slugAliases[first] ?? slugAliases[first.replace(/-/g, "")] ?? first;
  const rest = tail.split("/").slice(1).join("/");
  return rest ? `${base}/${slug}/${rest}` : `${base}/${slug}`;
}

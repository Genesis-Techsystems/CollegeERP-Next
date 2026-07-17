/**
 * Angular `student-exam-section` module → App Router `/examination-section/*`.
 * Student portal examination links (Exam Fee Registration, Hall Tickets, etc.)
 * must not fall through to admin pre-examination routes or 404 → dashboard.
 */

export const EXAMINATION_SECTION_BASE = "/examination-section";

/** Angular student-exam-section.module.ts child routes. */
const EXAMINATION_SECTION_SLUGS: Record<string, string> = {
  "exam-fee-registration": "exam-fee-registration",
  "student-exam-hallticket": "student-exam-hallticket",
  "student-exam-timetable": "student-exam-timetable",
  "exam-online-test": "exam-online-test",
  "revaluation-fee-registration": "revaluation-fee-registration",
  "student-reevaluation-registration": "student-reevaluation-registration",
  "student-photocopy-download": "student-photocopy-download",
};

function slugFromHref(href: string): string | null {
  const lower = href.toLowerCase();
  const markers = [
    "examination-section/",
    "student-exam-section/",
    "apps/examination-section/",
    "apps/student-exam-section/",
  ];
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx === -1) continue;
    const tail = lower.slice(idx + marker.length).split(/[?#]/)[0];
    const slug = tail.replace(/\/+$/, "").split("/")[0];
    if (slug) return slug;
  }
  return null;
}

function isAdminExaminationContext(
  hrefLower: string,
  labelLower: string,
): boolean {
  return (
    hrefLower.includes("admin-examination-management") ||
    hrefLower.includes("examination-management") ||
    hrefLower.includes("/pre-examination/") ||
    hrefLower.includes("admin-pre-examination") ||
    labelLower.includes("examination management") ||
    labelLower.includes("pre examination") ||
    labelLower.includes("online exam fee regi") ||
    labelLower.includes("student exam fee col")
  );
}

/**
 * Resolve DB/sidebar href + label to the live student examination-section route.
 */
export function mapExaminationSectionNavRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefLower = (href ?? "").toLowerCase();
  const labelLower = (label ?? "").toLowerCase();

  if (isAdminExaminationContext(hrefLower, labelLower)) return null;

  const hrefSlug = slugFromHref(hrefLower);
  if (hrefSlug) {
    const mapped = EXAMINATION_SECTION_SLUGS[hrefSlug] ?? hrefSlug;
    return `${EXAMINATION_SECTION_BASE}/${mapped}`;
  }

  if (
    labelLower.includes("exam fee registration") ||
    labelLower.includes("exam fee regi")
  ) {
    return `${EXAMINATION_SECTION_BASE}/exam-fee-registration`;
  }

  if (
    labelLower.includes("download hall ticket") ||
    (labelLower.includes("hall ticket") && labelLower.includes("download"))
  ) {
    return `${EXAMINATION_SECTION_BASE}/student-exam-hallticket`;
  }

  if (
    labelLower.includes("exam timetable") &&
    !labelLower.includes("college")
  ) {
    return `${EXAMINATION_SECTION_BASE}/student-exam-timetable`;
  }

  if (labelLower.includes("revaluation fee registration")) {
    return `${EXAMINATION_SECTION_BASE}/revaluation-fee-registration`;
  }

  if (labelLower.includes("reevaluation registration")) {
    return `${EXAMINATION_SECTION_BASE}/student-reevaluation-registration`;
  }

  if (labelLower.includes("photocopy download")) {
    return `${EXAMINATION_SECTION_BASE}/student-photocopy-download`;
  }

  return null;
}

export function isExaminationSectionPath(pathname: string): boolean {
  const norm = pathname.replace(/\/+$/, "") || "/";
  return (
    norm === EXAMINATION_SECTION_BASE ||
    norm.startsWith(`${EXAMINATION_SECTION_BASE}/`)
  );
}

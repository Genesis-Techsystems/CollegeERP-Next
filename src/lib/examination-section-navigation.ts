/**
 * Angular `student-exam-section` module → App Router `/examination-section/*`.
 * Student portal examination links (Exam Fee Registration, Hall Tickets, etc.)
 * must not fall through to admin pre-examination routes or 404 → dashboard.
 *
 * Note: `/admin-examination-section/*` is a different module (e.g. Student Exam
 * Results). Never rewrite it to `/examination-section/*`.
 */

export const EXAMINATION_SECTION_BASE = "/examination-section";
export const ADMIN_EXAMINATION_SECTION_BASE = "/admin-examination-section";

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

/**
 * Extract slug after a real path segment. Must not match the substring
 * `examination-section/` inside `admin-examination-section/`.
 */
function slugFromHref(href: string): string | null {
  const lower = href.toLowerCase();
  // Longer / more specific markers first.
  const markers = [
    "apps/student-exam-section/",
    "apps/examination-section/",
    "student-exam-section/",
    "/examination-section/",
  ];
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx === -1) continue;
    // Reject `…admin-examination-section/…` false positives for `/examination-section/`.
    if (
      marker === "/examination-section/" &&
      idx >= 6 &&
      lower.slice(idx - 6, idx) === "admin-"
    ) {
      continue;
    }
    const tail = lower.slice(idx + marker.length).split(/[?#]/)[0];
    const slug = tail.replace(/\/+$/, "").split("/")[0];
    if (slug) return slug;
  }
  // Bare `examination-section/…` at start (no leading slash in DB href).
  if (
    lower.startsWith("examination-section/") &&
    !lower.startsWith("admin-examination-section/")
  ) {
    const slug = lower
      .slice("examination-section/".length)
      .split(/[?#]/)[0]
      .replace(/\/+$/, "")
      .split("/")[0];
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
  const labelKey = labelLower.replace(/[^a-z0-9]+/g, " ").trim();

  // Student Exam Results lives under admin-examination-section (not examination-section).
  // Pin before slug rewrite so sidebar does not 404 → dashboard.
  if (
    hrefLower.includes("student-exam-results") ||
    hrefLower.includes("student_exam_results") ||
    (labelKey === "exam results" &&
      !labelLower.includes("sheet") &&
      (hrefLower.includes("admin-examination-section") ||
        hrefLower.includes("student-examination") ||
        hrefLower.includes("student-exam"))) ||
    labelKey === "student exam results"
  ) {
    return `${ADMIN_EXAMINATION_SECTION_BASE}/student-exam-results`;
  }

  // Other admin-examination-section pages: do not rewrite to /examination-section.
  if (hrefLower.includes("admin-examination-section")) return null;

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

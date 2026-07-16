/**
 * Shared sidebar + Search pages route resolution.
 * Extracted from NavItem so Search navigates to the same URLs as the sidebar.
 */
import {
  resolveAdminExamReportDbSlug,
  resolveExaminationReportHref,
  resolveExamReportDbSlug,
} from "@/lib/exam-reports-navigation";
import { resolveSidebarLabelPin } from "@/lib/sidebar-route-pins";
import {
  EXAM_REPORTS_LIVE_UNDER_EXAM_REPORTS,
  normalizeHref,
  normalizePageHref,
  toNavSlug,
} from "@/lib/navigation";
import {
  mapErpModuleLabelToRoute,
  mapErpModuleNavRoute,
} from "@/lib/erp-modules-navigation";
import {
  isTimetableModuleLabel,
  mapTimetableLabelToRoute,
  mapTimetableNavRoute,
} from "@/lib/timetable-navigation";
import {
  mapAdminInstitutionalRoomRoute,
  mapLegacyInstitutionalMastersHref,
} from "@/lib/admin-institutional-navigation";
import { mapHostelNavRoute } from "@/lib/hostel-navigation";

export function mapLegacyMasterSettingsHref(href?: string): string | null {
  if (!href) return null;
  const normalized = href.toLowerCase().replace(/\/+$/, "");
  const marker = "master-settings/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) return null;

  const slug = normalized.slice(markerIndex + marker.length);
  if (!slug) return null;

  const routeMap: Record<string, string> = {
    banks: "/admin/banks",
    "caste-master": "/admin/caste-master",
    department: "/admin/departments",
    departments: "/admin/departments",
    "sub-reservation-categories": "/admin/reservation-sub-categories",
    "reservation-sub-categories": "/admin/reservation-sub-categories",
    "student-category": "/admin/student-categories",
    "student-categories": "/admin/student-categories",
    "subject-type": "/admin/course-types",
    "subject-types": "/admin/course-types",
    "course-type": "/admin/course-types",
    "course-types": "/admin/course-types",
    "courses-type": "/admin/course-types",
    "courses-types": "/admin/course-types",
    designation: "/admin/designations",
    designations: "/admin/designations",
    "qualification-group": "/admin/qualification-groups",
    "qualification-groups": "/admin/qualification-groups",
    "qualification-groups-master": "/admin/qualification-groups",
    "workflow-stages": "/admin/workflow-stages",
    "workflow-stage": "/admin/workflow-stages",
    "holidays-calendar": "/admin/holidays-calendar",
    "holiday-calendar": "/admin/holidays-calendar",
    "holidays-calender": "/admin/holidays-calendar",
    holidayscalendar: "/admin/holidays-calendar",
    holidaycalendar: "/admin/holidays-calendar",
    holidays: "/admin/holidays-calendar",
    holiday: "/admin/holidays-calendar",
    qualification: "/admin/qualifications",
    qualifications: "/admin/qualifications",
    "designation-master": "/admin/designations",
    "general-settings": "/admin/general-settings",
    "general-master-settings": "/admin/general-master-settings",
    "general-master-setting": "/admin/general-master-settings",
    "general-masters": "/admin/general-master-settings",
    "document-repository": "/admin/document-repository",
    documentrepository: "/admin/document-repository",
    "document-repository-settings": "/admin/document-repository",
    "week-days": "/admin/weekdays",
    weekdays: "/admin/weekdays",
    weekday: "/admin/weekdays",
    "configuration-auto-number": "/admin/configure-auto-numbers",
    "configuration-auto-numbers": "/admin/configure-auto-numbers",
    "configure-auto-number": "/admin/configure-auto-numbers",
    "configure-auto-numbers": "/admin/configure-auto-numbers",
    "config-auto-number": "/admin/configure-auto-numbers",
    "config-autonumber": "/admin/configure-auto-numbers",
    configautonumber: "/admin/configure-auto-numbers",
    "room-details": "/admin/room-details",
    "room-detail": "/admin/room-details",
    roomdetails: "/admin/room-details",
  };

  return routeMap[slug] ?? `/admin/${slug}`;
}

const EXAM_MASTERS_PATH = "/admin-examination-management/admin-exam-masters";

/**
 * Sidebar/Search shared route pins (legacy Angular → App Router).
 * Returns a forced path, or null to keep the item href.
 */
export function resolveForcedNavRoute(
  href: string | undefined,
  label: string,
  id?: string,
  hasChildren?: boolean,
): string | null {
  const labelLower = (label ?? "").toLowerCase();
  const preExamBase = "/admin-examination-management/pre-examination";
  const reEvalBase = "/admin-examination-management/re-evaluation";
  const evalProcessBase = "/admin-examination-management/evaluation-process";
  const postExamBase = "/admin-examination-management/post-examination";

  const hrefLower = (href ?? "").toLowerCase();

  const sidebarPin = resolveSidebarLabelPin(href, label);
  if (sidebarPin) return sidebarPin;

  // Label + href pins for all Examination Reports pages — must run before any
  // generic `/exam-reports/{slug}` passthrough (wrong DB slugs like
  // `subject-wise-percentage-report` would otherwise 404).
  const examinationReportPin = resolveExaminationReportHref(href, label);
  if (examinationReportPin) return examinationReportPin;

  // ── Exam Reports ─────────────────────────────────────────────────────────
  // DB menu often builds `/reports/admin-exam-reports/...` (Reports module URL).
  // App Router pages are under `/admin-examination-management/admin-exam-reports`.
  // Resolve BEFORE ERP mappers so the wrong prefix never wins.
  const examReportsBase = "/admin-examination-management/admin-exam-reports";
  const examReportsAltBase = "/admin-examination-management/exam-reports";
  if (
    hrefLower.includes("admin-exam-reports/") ||
    hrefLower.includes("/exam-reports/")
  ) {
    const afterAdmin = hrefLower.includes("admin-exam-reports/")
      ? (hrefLower.split("admin-exam-reports/")[1] ?? "")
      : "";
    const afterExam = hrefLower.includes("/exam-reports/")
      ? (hrefLower.split("/exam-reports/")[1] ?? "")
      : "";
    const rawSlug = (afterAdmin || afterExam)
      .split(/[?#]/)[0]
      .replace(/\/+$/, "");
    const slug = hrefLower.includes("admin-exam-reports/")
      ? resolveAdminExamReportDbSlug(rawSlug)
      : resolveExamReportDbSlug(rawSlug);
    // Pages that live under /exam-reports/ (Search + sidebar must not use admin-exam-reports).
    if (
      slug &&
      new RegExp(`^(?:${EXAM_REPORTS_LIVE_UNDER_EXAM_REPORTS})$`, "i").test(
        slug,
      )
    ) {
      return `${examReportsAltBase}/${slug}`;
    }
    if (slug && hrefLower.includes("admin-exam-reports/")) {
      return `${examReportsBase}/${slug}`;
    }
    // Do NOT blindly passthrough unknown `/exam-reports/{slug}` — fall through to
    // label pins below so mismatched DB slugs resolve to real page folders.
  }
  if (
    hrefLower.includes("moderation-benefited") ||
    hrefLower.includes("moderation_benefited") ||
    hrefLower.includes("jntu-moderation-benefited") ||
    (labelLower.includes("moderation") &&
      labelLower.includes("benefited") &&
      (labelLower.includes("student") || labelLower.includes("report")))
  ) {
    return `${examReportsBase}/moderation-benefited-students-report`;
  }
  if (
    hrefLower.includes("grace-marks-benefited") ||
    hrefLower.includes("grace-benefited-students") ||
    hrefLower.includes("gracemarks-benefited") ||
    hrefLower.includes("exam-gracemarks") ||
    ((labelLower.includes("grace") || labelLower.includes("gracemarks")) &&
      labelLower.includes("benefited") &&
      (labelLower.includes("student") || labelLower.includes("report")))
  ) {
    return `${examReportsBase}/grace-marks-benefited-students-report`;
  }
  if (
    hrefLower.includes("detention-report") ||
    hrefLower.includes("batch-wise-detention") ||
    hrefLower.includes("batchwise-detention") ||
    labelLower.includes("batch wise detention") ||
    labelLower.includes("batch-wise detention") ||
    (labelLower.includes("detention") &&
      labelLower.includes("report") &&
      !labelLower.includes("backlog"))
  ) {
    return `${examReportsBase}/detention-report`;
  }
  if (
    hrefLower.includes("student-backlog-data") ||
    hrefLower.includes("batch-wise-student-backlog") ||
    hrefLower.includes("batchwise-student-backlog") ||
    labelLower.includes("batch wise student backlog") ||
    labelLower.includes("batch-wise student backlog") ||
    labelLower.includes("student backlog data") ||
    (labelLower.includes("backlog") &&
      labelLower.includes("batch") &&
      !labelLower.includes("detention"))
  ) {
    return `${examReportsBase}/student-backlog-data`;
  }
  if (
    hrefLower.includes("student-wise-grade-point") ||
    hrefLower.includes("grade-and-grade-points") ||
    hrefLower.includes("grade_and_grade_points") ||
    labelLower.includes("grade and grade points") ||
    labelLower.includes("grade & grade points") ||
    labelLower.includes("student wise grade point") ||
    (labelLower.includes("grade") &&
      labelLower.includes("grade point") &&
      labelLower.includes("report") &&
      !labelLower.includes("setup"))
  ) {
    return `${examReportsBase}/student-wise-grade-point-report`;
  }
  if (
    hrefLower.includes("exam-absentees-report") ||
    hrefLower.includes("exam-absentee-report") ||
    hrefLower.includes("exam-absenties") ||
    labelLower.includes("exam absentees") ||
    labelLower.includes("exam absentee") ||
    labelLower.includes("exam absenties") ||
    (labelLower.includes("absentee") &&
      labelLower.includes("report") &&
      !labelLower.includes("sms"))
  ) {
    return `${examReportsBase}/exam-absentees-report`;
  }
  if (
    hrefLower.includes("re-evaluation-comparision-report") ||
    hrefLower.includes("re-evaluation-comparison-report") ||
    hrefLower.includes("reevaluation-comparision") ||
    hrefLower.includes("reevaluation-comparison") ||
    labelLower.includes("re-evaluation comparision") ||
    labelLower.includes("re-evaluation comparison") ||
    labelLower.includes("reevaluation comparision") ||
    labelLower.includes("reevaluation comparison") ||
    ((labelLower.includes("re-evaluation") ||
      labelLower.includes("reevaluation")) &&
      (labelLower.includes("comparision") ||
        labelLower.includes("comparison")) &&
      labelLower.includes("report"))
  ) {
    return `${examReportsBase}/re-evaluation-comparision-report`;
  }
  if (
    hrefLower.includes("re-evaluation-exam-report") ||
    hrefLower.includes("re-evaluation-result-report") ||
    hrefLower.includes("reevaluation-exam-report") ||
    labelLower.includes("re-evaluation exam report") ||
    labelLower.includes("re evaluation exam report") ||
    labelLower.includes("re-evaluation result report") ||
    labelLower.includes("reevaluation result report") ||
    ((labelLower.includes("re-evaluation") ||
      labelLower.includes("reevaluation")) &&
      labelLower.includes("exam") &&
      labelLower.includes("report") &&
      !labelLower.includes("comparison") &&
      !labelLower.includes("comparision") &&
      !labelLower.includes("branch") &&
      !labelLower.includes("analysis") &&
      !labelLower.includes("student"))
  ) {
    return `${examReportsBase}/re-evaluation-exam-report`;
  }
  if (
    hrefLower.includes("consolidated-exam-report") ||
    hrefLower.includes("consolidated_exam_report") ||
    labelLower.includes("consolidated exam report") ||
    (labelLower.includes("consolidated") &&
      labelLower.includes("exam") &&
      labelLower.includes("report"))
  ) {
    return `${examReportsBase}/consolidated-exam-report`;
  }
  if (
    hrefLower.includes("internal-marks-report") ||
    hrefLower.includes("internal-marks-entry-report") ||
    labelLower.includes("internal marks report") ||
    (labelLower.includes("internal marks") &&
      labelLower.includes("report") &&
      !labelLower.includes("entry") &&
      !labelLower.includes("average") &&
      !labelLower.includes("avg"))
  ) {
    return `${examReportsBase}/internal-marks-report`;
  }
  if (
    hrefLower.includes("academic-year-curriculum-report") ||
    hrefLower.includes("academic-curriculum-report") ||
    hrefLower.includes("academic_curriculum_report") ||
    labelLower.includes("academic year curriculum") ||
    labelLower.includes("academic curriculum report") ||
    (labelLower.includes("academic") &&
      labelLower.includes("curriculum") &&
      labelLower.includes("report"))
  ) {
    return `${examReportsBase}/academic-year-curriculum-report`;
  }
  if (
    hrefLower.includes("batchwise-sgpa-report") ||
    hrefLower.includes("batch-wise-sgpa") ||
    hrefLower.includes("batch_wise_sgpa") ||
    labelLower.includes("batch wise sgpa") ||
    labelLower.includes("batch-wise sgpa") ||
    (labelLower.includes("sgpa") &&
      labelLower.includes("batch") &&
      labelLower.includes("report"))
  ) {
    return `${examReportsBase}/batchwise-sgpa-report`;
  }
  if (
    hrefLower.includes("lab-remuneration-report") ||
    hrefLower.includes("lab-external-remuneration-report") ||
    hrefLower.includes("lab_remuneration") ||
    (labelLower.includes("lab") &&
      labelLower.includes("remuneration") &&
      labelLower.includes("report"))
  ) {
    return `${examReportsBase}/lab-remuneration-report`;
  }
  if (
    hrefLower.includes("invigilators-remuneration-report") ||
    hrefLower.includes("invigilator-remuneration-report") ||
    hrefLower.includes("invigilators_remuneration") ||
    ((labelLower.includes("invigilator") ||
      labelLower.includes("invigilators")) &&
      labelLower.includes("remuneration") &&
      labelLower.includes("report"))
  ) {
    return `${examReportsBase}/invigilators-remuneration-report`;
  }
  if (
    hrefLower.includes("group-wise-passed-result-sheets") ||
    hrefLower.includes("branch-wise-passes-result-sheets") ||
    (labelLower.includes("group wise passed") &&
      labelLower.includes("result")) ||
    (labelLower.includes("group-wise-passed") && labelLower.includes("result"))
  ) {
    return `${examReportsBase}/group-wise-passed-result-sheets`;
  }
  if (
    hrefLower.includes("group-wise-failed-result-sheets") ||
    hrefLower.includes("branch-wise-failed-result-sheets") ||
    (labelLower.includes("group wise failed") &&
      labelLower.includes("result")) ||
    (labelLower.includes("group-wise-failed") && labelLower.includes("result"))
  ) {
    return `${examReportsBase}/group-wise-failed-result-sheets`;
  }
  const labelKey = labelLower.replace(/[^a-z0-9]+/g, " ").trim();

  // Student Exam Results (student login only) — Angular
  // `/admin-examination-section/student-exam-results`. Must run before admin
  // "Exam Results Sheets" so plain "Exam Results" is not misrouted.
  if (
    hrefLower.includes("student-exam-results") ||
    (labelKey === "exam results" &&
      !labelLower.includes("sheet") &&
      (hrefLower.includes("admin-examination-section") ||
        hrefLower.includes("student-examination") ||
        hrefLower.includes("student-exam")))
  ) {
    return "/admin-examination-section/student-exam-results";
  }

  // Exam Results Sheets — pin early (Angular `exam_results_sheets` 404→dashboard otherwise)
  if (
    hrefLower.includes("exam_results_sheets") ||
    hrefLower.includes("exam-results-sheets") ||
    hrefLower.includes("exam-result-sheets") ||
    hrefLower.includes("exam-result-sheet") ||
    hrefLower.includes("exam_result_sheet") ||
    labelKey === "exam results sheets" ||
    labelKey === "exam result sheets" ||
    labelKey === "exam result sheet" ||
    ((labelLower.includes("exam") || labelLower.includes("admin")) &&
      (labelLower.includes("result sheet") ||
        labelLower.includes("results sheet")))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-results-sheets";
  }

  // Exam Timetable Report (Exam Reports) — must not fall through to Time-Table Management / 404→dashboard
  if (
    hrefLower.includes("exam-timetable-report") ||
    (labelLower.includes("exam") &&
      labelLower.includes("timetable") &&
      labelLower.includes("report") &&
      !labelLower.includes("course year") &&
      !labelLower.includes("lab"))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-timetable-report";
  }
  // Exam Invigilator Allotment Report (Exam Reports) — not Pre Examination allotment
  if (
    hrefLower.includes("exam-invigilator-allotment-report") ||
    (labelLower.includes("invigilator") &&
      labelLower.includes("allot") &&
      labelLower.includes("report"))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report";
  }
  // Exam Student Registration Report (Exam Reports)
  if (
    hrefLower.includes("exam-student-registration-report") ||
    (labelLower.includes("student") &&
      labelLower.includes("registration") &&
      labelLower.includes("report") &&
      !labelLower.includes("timetable") &&
      !labelLower.includes(" tt"))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-student-registration-report";
  }
  // Student Summary / Details / Backlog result reports
  if (
    hrefLower.includes("student-summary-result-report") ||
    (labelLower.includes("summary") &&
      labelLower.includes("result") &&
      labelLower.includes("report"))
  ) {
    return "/admin-examination-management/admin-exam-reports/student-summary-result-report";
  }
  if (
    hrefLower.includes("student-result-details-report") ||
    (labelLower.includes("result") &&
      labelLower.includes("detail") &&
      labelLower.includes("report"))
  ) {
    return "/admin-examination-management/admin-exam-reports/student-result-details-report";
  }
  if (
    hrefLower.includes("student-backlog-data") ||
    (labelLower.includes("batch") &&
      labelLower.includes("backlog") &&
      labelLower.includes("report"))
  ) {
    // Angular `student-backlog-data` — distinct from Student Backlog Report
    return "/admin-examination-management/admin-exam-reports/student-backlog-data";
  }
  if (
    (hrefLower.includes("student-backlog-report") &&
      !hrefLower.includes("batch") &&
      !hrefLower.includes("student-backlog-data") &&
      !labelLower.includes("batch")) ||
    (labelLower.includes("student") &&
      labelLower.includes("backlog") &&
      labelLower.includes("report") &&
      !labelLower.includes("batch"))
  ) {
    return "/admin-examination-management/admin-exam-reports/student-backlog-report";
  }
  // Student Credits Report
  if (
    hrefLower.includes("student-credits-report") ||
    (labelLower.includes("credit") &&
      labelLower.includes("report") &&
      (labelLower.includes("student") || labelLower.includes("credits")))
  ) {
    return "/admin-examination-management/admin-exam-reports/student-credits-report";
  }
  // Assignment Pending List
  if (
    hrefLower.includes("assignment-pending-list") ||
    (labelLower.includes("assignment") && labelLower.includes("pending"))
  ) {
    return "/admin-examination-management/admin-exam-reports/assignment-pending-list-report";
  }
  // Moderation Reports (Exam Reports) — not rule setup / JNTU / benefitted variants
  if (
    hrefLower.includes("exam-moderation-reports") ||
    (labelLower.includes("moderation") &&
      labelLower.includes("report") &&
      !labelLower.includes("benefit") &&
      !labelLower.includes("jntu") &&
      !labelLower.includes("rule") &&
      !labelLower.includes("before") &&
      !labelLower.includes("after") &&
      !labelLower.includes("analysis") &&
      !labelLower.includes("apply") &&
      !hrefLower.includes("benefited") &&
      !hrefLower.includes("jntu") &&
      !hrefLower.includes("rule"))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-moderation-reports";
  }
  // Gracemarks Reports
  {
    const isGraceReportLabel =
      ((labelLower.includes("grace") &&
        labelLower.includes("mark") &&
        labelLower.includes("report")) ||
        (labelLower.includes("gracemark") && labelLower.includes("report"))) &&
      !labelLower.includes("benefit") &&
      !labelLower.includes("jntu") &&
      !hrefLower.includes("benefited");
    if (
      hrefLower.includes("exam-gracemarks-reports") ||
      hrefLower.includes("exam-grace-marks-reports") ||
      isGraceReportLabel
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-gracemarks-reports";
    }
  }
  // Tabulation Register (Angular `tabulation_register`)
  if (
    hrefLower.includes("tabulation-register") ||
    hrefLower.includes("tabulation_register") ||
    hrefLower.includes("tabulation-registration") ||
    labelLower.includes("tabulation")
  ) {
    return "/admin-examination-management/admin-exam-reports/tabulation-register";
  }
  // Exam Result Sheets
  if (
    hrefLower.includes("exam-results-sheets") ||
    hrefLower.includes("exam_results_sheets") ||
    hrefLower.includes("exam-result-sheet") ||
    (labelLower.includes("exam") &&
      labelLower.includes("result") &&
      labelLower.includes("sheet")) ||
    (labelLower.includes("exam") &&
      labelLower.includes("results") &&
      labelLower.includes("sheet"))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-results-sheets";
  }
  // Gradewise Result Report
  if (
    hrefLower.includes("subject-gradewise-result-report") ||
    hrefLower.includes("gradewise-result") ||
    (labelLower.includes("gradewise") && labelLower.includes("result"))
  ) {
    return "/admin-examination-management/admin-exam-reports/subject-gradewise-result-report";
  }
  // Final Result Analysis Report
  if (
    hrefLower.includes("final-result-analysis-report") ||
    (labelLower.includes("final") &&
      labelLower.includes("result") &&
      labelLower.includes("analysis") &&
      !labelLower.includes("moderation"))
  ) {
    return "/admin-examination-management/admin-exam-reports/final-result-analysis-report";
  }
  // Final Marks Pre Moderation Report
  if (
    hrefLower.includes("final-marks-premoderation") ||
    (labelLower.includes("final") &&
      labelLower.includes("mark") &&
      (labelLower.includes("pre moderation") ||
        labelLower.includes("premoderation") ||
        labelLower.includes("pre-moderation")))
  ) {
    return "/admin-examination-management/admin-exam-reports/final-marks-premoderation";
  }
  // Subject Wise Result Report (not group / gradewise / pass %)
  if (
    hrefLower.includes("subjectwise-result-report") ||
    (labelLower.includes("subject") &&
      labelLower.includes("wise") &&
      labelLower.includes("result") &&
      !labelLower.includes("group") &&
      !labelLower.includes("grade") &&
      !labelLower.includes("pass percent") &&
      !labelLower.includes("evaluator"))
  ) {
    return "/admin-examination-management/admin-exam-reports/subjectwise-result-report";
  }
  // Group & Subject Wise Result Report
  if (
    hrefLower.includes("group-subjectwise-result-report") ||
    (labelLower.includes("group") &&
      labelLower.includes("subject") &&
      labelLower.includes("result") &&
      !labelLower.includes("grade"))
  ) {
    return "/admin-examination-management/admin-exam-reports/group-subjectwise-result-report";
  }
  // Admin Exam Answer Sheets Report
  if (
    hrefLower.includes("exam-answer-sheets-report") ||
    (labelLower.includes("answer") &&
      labelLower.includes("sheet") &&
      (labelLower.includes("report") || labelLower.includes("exam")) &&
      !labelLower.includes("upload") &&
      !labelLower.includes("view"))
  ) {
    return "/admin-examination-management/admin-exam-reports/exam-answer-sheets-report";
  }
  // Legacy Angular hrefs: /reports/admin-exam-reports/... → Next admin-exam-reports pages
  if (hrefLower.includes("/reports/admin-exam-reports/")) {
    const seg = hrefLower
      .split("/reports/admin-exam-reports/")[1]
      ?.split(/[?#]/)[0]
      ?.replace(/\/+$/, "");
    if (seg) {
      if (seg === "tabulation_register" || seg === "tabulation-registration") {
        return "/admin-examination-management/admin-exam-reports/tabulation-register";
      }
      if (seg === "exam_results_sheets") {
        return "/admin-examination-management/admin-exam-reports/exam-results-sheets";
      }
      return `/admin-examination-management/admin-exam-reports/${seg}`;
    }
  }
  if (
    hrefLower.includes("course-year-timetable-report") ||
    (labelLower.includes("course year") &&
      labelLower.includes("timetable") &&
      labelLower.includes("report"))
  ) {
    return "/admin-examination-management/admin-exam-reports/course-year-timetable-report";
  }

  // ── Exam attendance marking ──────────────────────────────────────────────
  // The DB ships both items with href `/attendance-management/mark-attendance`
  // (a placeholder page), so href/label heuristics can't tell them apart or
  // reach the real pages. Pin by the backend page IDs (from the live menu),
  // then fall back to label so other tenants still resolve.
  if (id === "page_100080258")
    return `${postExamBase}/internal-exam-attendance-marking`;
  if (id === "page_100081023")
    return `${postExamBase}/external-exam-attendance-marking`;
  if (
    labelLower.includes("external") &&
    (labelLower.includes("attendance") || labelLower.includes("attendence")) &&
    labelLower.includes("marking")
  ) {
    return `${postExamBase}/external-exam-attendance-marking`;
  }
  if (
    labelLower.includes("internal") &&
    (labelLower.includes("attendance") || labelLower.includes("attendence")) &&
    labelLower.includes("marking")
  ) {
    return `${postExamBase}/internal-exam-attendance-marking`;
  }
  // Exam Center Subject Attendance (Exam Papers Delivery) — must run BEFORE
  // Exam Attendance-wise Subject Barcode; DB hrefs sometimes reuse
  // `/attendance-management/exam-attendance` for both.
  if (
    hrefLower.includes("exam-center-subject-attendance") ||
    labelLower.includes("examcenter subject attendance") ||
    labelLower.includes("exam center subject attendance") ||
    (labelLower.includes("exam center") &&
      labelLower.includes("subject") &&
      labelLower.includes("attendance") &&
      !labelLower.includes("barcode"))
  ) {
    return "/admin-examination-management/exam-papers-delivery-process/exam-center-subject-attendance";
  }

  // Exam Attendance-wise Subject Barcode — DB href is
  // `/attendance-management/exam-attendance` (placeholder). Pin by page id +
  // href so it always reaches the real pre-examination page. Must run BEFORE
  // the generic "exam subject barcode" rule (that one routes to the plain
  // barcode page on a loose `subject barcode` match).
  // Skip when label is Exam Center Subject Attendance (handled above).
  if (
    !(
      labelLower.includes("exam center") &&
      labelLower.includes("attendance") &&
      !labelLower.includes("barcode")
    ) &&
    (id === "page_100080999" ||
      hrefLower.includes("attendance-management/exam-attendance") ||
      labelLower.includes("exam attendance-wis") ||
      labelLower.includes("exam attendancewis") ||
      (labelLower.includes("attendance") &&
        labelLower.includes("subject") &&
        labelLower.includes("barcode")))
  ) {
    return `${preExamBase}/exam-attendancewise-subject-barcode`;
  }

  // Transport — resolve before generic ERP mapper (DB hrefs often duplicate `route`).
  if (!hasChildren) {
    const isMapVehicleRoute =
      (labelLower.includes("map") &&
        (labelLower.includes("vechicle") || labelLower.includes("vehicle")) &&
        labelLower.includes("route") &&
        !labelLower.includes("driver") &&
        !labelLower.includes("stop")) ||
      hrefLower.includes("vehicle-map");
    if (isMapVehicleRoute) return "/transport/vehicle-map";

    const isAddRoute =
      labelLower === "add route" ||
      (labelLower.includes("add") &&
        labelLower.includes("route") &&
        !labelLower.includes("map") &&
        !labelLower.includes("stop")) ||
      (hrefLower.includes("/transport/route") &&
        !hrefLower.includes("vehicle-map") &&
        !hrefLower.includes("route-stop"));
    if (isAddRoute) return "/transport/route";

    const isMapVehicleDriver =
      (labelLower.includes("map") &&
        labelLower.includes("vehicle") &&
        labelLower.includes("driver")) ||
      hrefLower.includes("vehicle-driver");
    if (isMapVehicleDriver) return "/transport/vehicle-drivers";

    if (
      labelLower.includes("transport") &&
      labelLower.includes("distance") &&
      labelLower.includes("fee")
    ) {
      return "/transport/distance-fee";
    }

    // TC & No Due — disambiguate certificate routes (shared Angular certificates module).
    if (
      labelLower.includes("transfer") &&
      labelLower.includes("certificate") &&
      !labelLower.includes("request") &&
      !labelLower.includes("issued") &&
      !labelLower.includes("print")
    ) {
      return "/tc-no-due-approval/transfer-certificate";
    }
    if (
      (labelLower.includes("no") && labelLower.includes("due")) ||
      hrefLower.includes("send-no-due") ||
      hrefLower.includes("nodue")
    ) {
      return "/tc-no-due-approval/send-no-due-approval-request";
    }
    if (
      labelLower.includes("print") &&
      (labelLower.includes("tc") || hrefLower.includes("printtc"))
    ) {
      return "/tc-no-due-approval/certificate-requests/printTc";
    }
    if (labelLower.includes("issued") && labelLower.includes("certificate")) {
      return "/tc-no-due-approval/certificates-issued-list";
    }
    if (labelLower.includes("certificate") && labelLower.includes("report")) {
      return "/tc-no-due-approval/certificate-request-report";
    }
    if (
      labelLower.includes("certificate") &&
      labelLower.includes("request") &&
      !labelLower.includes("report") &&
      !labelLower.includes("issued")
    ) {
      return "/tc-no-due-approval/certificate-requests";
    }

    if (labelLower.includes("hostel") && labelLower.includes("payment")) {
      return "/accounts-and-fees/fees-collection/hostel-payment";
    }
    if (hrefLower.includes("fees-collection/hostel-payment")) {
      return "/accounts-and-fees/fees-collection/hostel-payment";
    }
    if (
      hrefLower.includes("generate-paylink") ||
      hrefLower.includes("generate-payment-link") ||
      (labelLower.includes("generate") &&
        (labelLower.includes("pay link") ||
          labelLower.includes("payment link")))
    ) {
      return "/accounts-and-fees/fees-collection/generate-paylink";
    }
    if (
      hrefLower.includes("student-fee-management") ||
      (labelLower.includes("student fee management") &&
        !labelLower.includes("allocate"))
    ) {
      return "/accounts-and-fees/fees-collection/student-fee-management";
    }
    if (
      hrefLower.includes("fee-concession") ||
      (labelLower.includes("fee concession") && !labelLower.includes("report"))
    ) {
      return "/accounts-and-fees/fees-collection/fee-concession";
    }
    if (
      hrefLower.includes("fee-refunds") ||
      labelLower.includes("fee refund")
    ) {
      return "/accounts-and-fees/fees-collection/fee-refunds";
    }
    if (
      hrefLower.includes("update-online-receipt-status") ||
      (labelLower.includes("update online receipt") &&
        labelLower.includes("status"))
    ) {
      return "/accounts-and-fees/fees-collection/update-online-receipt-status";
    }
    if (
      hrefLower.includes("university-payment-wallet-transactions") ||
      hrefLower.includes("university-wallet-transactions") ||
      (labelLower.includes("university") &&
        labelLower.includes("payment") &&
        labelLower.includes("wallet") &&
        labelLower.includes("transaction"))
    ) {
      return "/wallet/university-payment-wallet-transactions";
    }
    if (
      hrefLower.includes("university-payment-wallet") ||
      hrefLower.includes("univ-payment-wallet") ||
      (labelLower.includes("university") &&
        labelLower.includes("payment") &&
        labelLower.includes("wallet"))
    ) {
      return "/wallet/university-payment-wallet";
    }
    const adminInstitutionalRoom = mapAdminInstitutionalRoomRoute(href, label);
    if (adminInstitutionalRoom) return adminInstitutionalRoom;

    // Must run before hostel room mapping — label "Exam Center Rooms" contains "room"
    // and was incorrectly forced to /hostel/rooms.
    // Skip *report* links — those belong under exam-reports/.
    const deliveryBase =
      "/admin-examination-management/exam-papers-delivery-process";
    const isExamCenterRoomsReport =
      hrefLower.includes("examcenter-rooms-report") ||
      hrefLower.includes("exam-center-rooms-report") ||
      labelLower.includes("exam center rooms report");
    if (
      !isExamCenterRoomsReport &&
      (hrefLower.includes("univ-exam-center-rooms") ||
        labelLower.includes("university exam center room") ||
        labelLower.includes("univ exam center room") ||
        (labelLower.includes("exam center room") &&
          !labelLower.includes("type") &&
          !labelLower.includes("allot")))
    ) {
      // Angular: exam-papers-delivery-process/univ-exam-center-rooms
      return `${deliveryBase}/univ-exam-center-rooms`;
    }
    if (
      !isExamCenterRoomsReport &&
      hrefLower.includes("exam-center-rooms") &&
      !hrefLower.includes("univ-exam-center-rooms") &&
      !hrefLower.includes("room-type") &&
      !hrefLower.includes("allotment")
    ) {
      return `${deliveryBase}/exam-center-rooms`;
    }
    if (isExamCenterRoomsReport) {
      return "/admin-examination-management/exam-reports/examcenter-rooms-report";
    }

    const hostelRoute = mapHostelNavRoute(href, label);
    if (hostelRoute) return hostelRoute;
  }

  // Leaf pages only — parent modules must expand/collapse, not navigate away.
  if (!hasChildren) {
    if (
      (labelLower.includes("company") &&
        labelLower.includes("placement") &&
        labelLower.includes("requirement")) ||
      hrefLower.includes("company-placements-requirements") ||
      (hrefLower.includes("placement-companies") &&
        hrefLower.includes("placements-achievements"))
    ) {
      return "/placements-achievements/placements/placement-companies";
    }
    if (
      (labelLower.includes("placement") &&
        labelLower.includes("student") &&
        labelLower.includes("list")) ||
      hrefLower.includes("placement-registered-studentslist") ||
      (hrefLower.includes("placement-registered-list") &&
        hrefLower.includes("placements-achievements"))
    ) {
      return "/placements-achievements/placements/placement-registered-list";
    }
    if (
      (labelLower.includes("broadcast") && labelLower.includes("message")) ||
      (hrefLower.includes("placement-broadcast") &&
        hrefLower.includes("placements-achievements"))
    ) {
      return "/placements-achievements/placements/placement-broadcast";
    }
    const erpRoute = mapErpModuleNavRoute(href, label);
    if (erpRoute) return erpRoute;
    const timetableRoute = mapTimetableNavRoute(href, label);
    if (timetableRoute) return timetableRoute;
  }

  const idLower = (id ?? "").toLowerCase();
  if (
    labelLower.includes("general master setting") ||
    labelLower.includes("general master settings") ||
    labelLower.includes("general masters")
  ) {
    return "/admin/general-master-settings";
  }
  if (
    hrefLower.includes("configuration-auto-number") ||
    hrefLower.includes("configuration-auto-numbers") ||
    hrefLower.includes("configure-auto-number") ||
    hrefLower.includes("configure-auto-numbers") ||
    hrefLower.includes("configautonumber") ||
    hrefLower.includes("config-auto-number") ||
    idLower.includes("configuration-auto-number") ||
    idLower.includes("configure-auto-number") ||
    (labelLower.includes("auto") && labelLower.includes("number"))
  ) {
    return "/admin/configure-auto-numbers";
  }
  if (
    hrefLower.includes("/excel-bulk-uploads/dost-bulk-upload") ||
    hrefLower.includes("dost-bulk-upload")
  ) {
    return "/admin/bulk-uploads/student-dost-upload";
  }
  if (
    hrefLower.includes("/excel-bulk-uploads/student-bulk-upload") ||
    hrefLower.includes("/excel-bulk-uploads/students-upload")
  ) {
    return "/admin/bulk-uploads/students-upload";
  }
  if (
    hrefLower.includes("/excel-bulk-uploads/employee-bulk-upload") ||
    hrefLower.includes("/excel-bulk-uploads/employee-upload")
  ) {
    return "/admin/bulk-uploads/employee-upload";
  }
  if (
    hrefLower.includes("/excel-bulk-uploads/subjects-bulk-upload") ||
    hrefLower.includes("/excel-bulk-uploads/subject-bulk-upload")
  ) {
    return "/admin/bulk-uploads/subjects-bulk-upload";
  }
  if (
    hrefLower.includes("/excel-bulk-uploads/books-bulk-upload") ||
    hrefLower.includes("/excel-bulk-uploads/book-bulk-upload")
  ) {
    return "/admin/bulk-uploads/books-bulk-upload";
  }
  if (hrefLower.includes("/excel-bulk-uploads/unit-topic-bulk-upload")) {
    return "/admin/bulk-uploads/unit-topic-bulk-upload";
  }
  if (hrefLower.includes("/excel-bulk-uploads/photos-bulk-upload")) {
    return "/admin/bulk-uploads/photos-bulk-upload";
  }
  if (
    hrefLower.includes(
      "/excel-bulk-uploads/temporary-staging-tables-bulk-upload",
    ) ||
    hrefLower.includes(
      "/excel-bulk-uploads/temparory-staging-table-bulk-upload",
    )
  ) {
    return "/admin/bulk-uploads/temporary-staging-tables-bulk-upload";
  }
  if (
    hrefLower.includes("send-student-sms") ||
    hrefLower.includes("send-sms-to-student") ||
    (labelLower.includes("send sms") &&
      labelLower.includes("student") &&
      !labelLower.includes("staff") &&
      !labelLower.includes("absent"))
  ) {
    return "/email-sms/send-sms-to-students";
  }
  if (
    hrefLower.includes("send-absent-sms") ||
    hrefLower.includes("send-sms-to-absent") ||
    ((labelLower.includes("absent") || labelLower.includes("absentee")) &&
      labelLower.includes("sms"))
  ) {
    return "/email-sms/send-sms-to-absents";
  }
  if (
    hrefLower.includes("send-staff-sms") ||
    hrefLower.includes("send-sms-to-staff-attendance") ||
    (labelLower.includes("staff") &&
      labelLower.includes("sms") &&
      (labelLower.includes("attendance") ||
        labelLower.includes("not marked") ||
        labelLower.includes("not taken")))
  ) {
    return "/email-sms/send-sms-to-staff-attendance";
  }
  if (
    hrefLower.includes("send-login-detail") ||
    labelLower.includes("send login detail")
  ) {
    return "/email-sms/send-login-details";
  }
  if (
    hrefLower.includes("email-log") ||
    hrefLower.includes("emaillog") ||
    labelLower.includes("email log") ||
    labelLower.includes("email logs")
  ) {
    return "/email-sms/email-logs";
  }
  if (
    hrefLower.includes("principal-staff-to-admin-email") ||
    hrefLower.includes("principal-staff-to-admin") ||
    hrefLower.includes("principal-and-staff-to-admin") ||
    (labelLower.includes("principal") &&
      labelLower.includes("staff") &&
      labelLower.includes("admin") &&
      labelLower.includes("email"))
  ) {
    return "/email-sms/principal-staff-to-admin-email";
  }
  if (
    hrefLower.includes("principal-to-staff-email") ||
    hrefLower.includes("send-email-to-admin") ||
    labelLower.includes("send email to admin")
  ) {
    return "/email-sms/principal-to-staff-email";
  }
  if (
    hrefLower.includes("staff-to-student-email") ||
    (labelLower.includes("staff") &&
      labelLower.includes("student") &&
      labelLower.includes("email")) ||
    (labelLower.includes("send email") &&
      labelLower.includes("student") &&
      !labelLower.includes("sms") &&
      !labelLower.includes("login"))
  ) {
    return "/email-sms/staff-to-student-email";
  }
  if (
    hrefLower.includes("depart-wise-email") ||
    hrefLower.includes("dept-wise-email") ||
    hrefLower.includes("department-wise-email") ||
    hrefLower.includes("department-wise-emial")
  ) {
    return "/email-sms/department-wise-email";
  }
  if (
    hrefLower.includes("principal-to-dept-email") ||
    hrefLower.includes("principal-to-dpt-email")
  ) {
    return "/email-sms/principal-to-dept-email";
  }
  if (
    labelLower.includes("department") &&
    labelLower.includes("wise") &&
    labelLower.includes("email")
  ) {
    return "/email-sms/department-wise-email";
  }
  if (
    (labelLower.includes("principal") &&
      labelLower.includes("department") &&
      labelLower.includes("email") &&
      !labelLower.includes("wise")) ||
    (labelLower.includes("send email") &&
      labelLower.includes("department") &&
      labelLower.includes("email") &&
      !labelLower.includes("wise") &&
      !labelLower.includes("student"))
  ) {
    return "/email-sms/principal-to-dept-email";
  }

  const institutionalRoute = mapLegacyInstitutionalMastersHref(href);
  if (institutionalRoute) return institutionalRoute;

  const masterSettingsRoute = mapLegacyMasterSettingsHref(href);
  if (masterSettingsRoute) return masterSettingsRoute;

  if (
    labelLower.includes("re-evaluation request") ||
    labelLower.includes("reevaluation request")
  ) {
    return `${reEvalBase}/re-evaluation-request`;
  }
  // Exam Master — "Exam Re-Valuation Fee Setup" (Angular); not the re-evaluation module student fee screen.
  if (
    labelLower.includes("re-valuation fee setup") ||
    labelLower.includes("revaluation fee setup") ||
    (labelLower.includes("fee setup") &&
      (labelLower.includes("re-valuation") ||
        labelLower.includes("revaluation") ||
        labelLower.includes("re valuation")))
  ) {
    return "/admin-examination-management/admin-exam-masters/re-valuation-fee-setup";
  }
  if (
    labelLower.includes("re-evaluation fee") ||
    labelLower.includes("reevaluation fee") ||
    labelLower.includes("re-valuation fee")
  ) {
    return `${reEvalBase}/re-evaluation-fee`;
  }
  if (labelLower.includes("exam revised marks")) {
    return `${postExamBase}/re-evaluation-marks-entry`;
  }
  if (
    labelLower.includes("re-evaluation assign") ||
    labelLower.includes("reevaluation assign")
  ) {
    return `${evalProcessBase}/re-evaluation-assign`;
  }
  if (labelLower.includes("evaluation status tracking")) {
    return `${evalProcessBase}/update-evaluator-answer-papers-status`;
  }
  if (labelLower.includes("student exam fee col"))
    return `${preExamBase}/student-exam-fee-registration`;
  if (labelLower.includes("exam scheduling for"))
    return `${preExamBase}/exam-scheduling-forms`;
  if (
    labelLower.includes("exam register subjec") ||
    hrefLower.includes("exam-register-subjects")
  )
    return `${preExamBase}/exam-register-subjects`;
  if (labelLower.includes("online exam fee regi"))
    return `${preExamBase}/${toNavSlug(label ?? labelLower)}`;
  if (labelLower.includes("internal exam registr"))
    return `${preExamBase}/internal-exam-registration-multiple`;
  if (labelLower.includes("exam hallticket"))
    return `${preExamBase}/exam-hallticket`;
  if (labelLower.includes("exam subject barcode"))
    return `${preExamBase}/exam-subject-barcode-generation`;
  if (labelLower.includes("exam forms")) return `${preExamBase}/exam-forms`;
  if (labelLower.includes("exam invigilator allot")) {
    if (labelLower.includes("report")) {
      return "/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report";
    }
    return `${preExamBase}/invigilator-allotment`;
  }
  if (labelLower.includes("additional exam fee"))
    return `${preExamBase}/additional-exam-fees`;
  if (
    labelLower.includes("exam attendance-wis") ||
    labelLower.includes("exam attendancewis")
  ) {
    return `${preExamBase}/exam-attendancewise-subject-barcode`;
  }
  if (labelLower.includes("student exam lab bat"))
    return `${preExamBase}/student-exam-lab-batches`;
  if (labelLower.includes("exam registration ma"))
    return `${preExamBase}/exam-registration-manual-feeless`;
  if (labelLower.includes("college exam timetable view"))
    return `${preExamBase}/college-exam-timetable-view`;
  if (
    labelLower.includes("complete exam fee registration") ||
    labelLower.includes("complete examfee registration")
  ) {
    return `${preExamBase}/complete-exam-fee-registration`;
  }
  if (labelLower.includes("exam center barcode")) {
    return "/admin-examination-management/exam-papers-delivery-process/exam-center-barcodes";
  }
  if (
    labelLower.includes("examcenter subject attendance") ||
    labelLower.includes("exam center subject attendance") ||
    (labelLower.includes("exam center") &&
      labelLower.includes("subject") &&
      labelLower.includes("attendance") &&
      !labelLower.includes("barcode"))
  ) {
    return "/admin-examination-management/exam-papers-delivery-process/exam-center-subject-attendance";
  }
  if (labelLower.includes("moderation rule setup")) {
    return "/admin-examination-management/result-processing/moderation-rule-setup";
  }
  if (
    labelLower.includes("grade rule settings") ||
    labelLower.includes("grade rule setup")
  ) {
    return "/admin-examination-management/result-processing/grade-rule-settings";
  }
  if (
    labelLower.includes("grade setup") ||
    labelLower.includes("exam grade") ||
    hrefLower.includes("grade-setup") ||
    hrefLower.includes("exam-grades")
  ) {
    return `${EXAM_MASTERS_PATH}/grade-setup`;
  }
  if (labelLower.includes("apply moderation rule")) {
    return "/admin-examination-management/result-processing/apply-moderation-rule";
  }
  // Match real "T-Sheets" only — do NOT use bare `includes('t sheets')`, because that
  // also matches "Group Wise Passed/Failed Result Sheets" (...resul**t sheets**).
  // (Exam-report routes are resolved at the top of forcedRoute.)
  if (
    hrefLower.includes("/t-sheets") ||
    hrefLower.includes("result-processing/t-sheets") ||
    ((labelLower.includes("t-sheets") ||
      labelLower.includes("t sheets") ||
      labelLower.includes("t-sheet") ||
      labelLower.includes("t sheet")) &&
      !labelLower.includes("result sheet"))
  ) {
    return "/admin-examination-management/result-processing/t-sheets";
  }
  if (
    labelLower.includes("verify exam marks") ||
    labelLower.includes("verify exam status")
  ) {
    return `${postExamBase}/verify-exam-marks`;
  }
  // Attendance marking — match the DB href first (Angular post-examination
  // routes: `exam-attendance-marking` for internal, `external-exam-…` for
  // external); labels vary per tenant (typos, missing "Internal"/"Exam").
  if (
    hrefLower.includes("external-exam-attendance") ||
    (labelLower.includes("external") &&
      (labelLower.includes("attendance") ||
        labelLower.includes("attendence")) &&
      labelLower.includes("marking"))
  ) {
    return `${postExamBase}/external-exam-attendance-marking`;
  }
  if (
    (hrefLower.includes("exam-attendance-marking") &&
      !hrefLower.includes("sheet")) ||
    ((labelLower.includes("attendance") || labelLower.includes("attendence")) &&
      labelLower.includes("marking") &&
      labelLower.includes("exam") &&
      !labelLower.includes("staff") &&
      !labelLower.includes("sheet"))
  ) {
    return `${postExamBase}/internal-exam-attendance-marking`;
  }
  if (
    labelLower.includes("internal") &&
    (labelLower.includes("exams average") ||
      labelLower.includes("exam average") ||
      labelLower.includes("internal exams avg"))
  ) {
    return `${postExamBase}/internal-exams-average`;
  }
  if (
    labelLower.includes("complete exam process") ||
    labelLower.includes("complete examination process")
  ) {
    return `${postExamBase}/complete-exam-process`;
  }
  // Answer Paper Bags Report (exam-reports — not delivery-process CRUD)
  if (
    hrefLower.includes("examcenter-answerpaper-bags-report") ||
    hrefLower.includes("answerpaper-bags-report") ||
    hrefLower.includes("answer-paper-bags-report") ||
    labelLower.includes("answer paper bags report") ||
    labelLower.includes("answer paper bag report")
  ) {
    return "/admin-examination-management/exam-reports/examcenter-answerpaper-bags-report";
  }
  if (
    hrefLower.includes("univ-exam-answer-paper-bags") ||
    (labelLower.includes("answer paper bag") && !labelLower.includes("report"))
  ) {
    return "/admin-examination-management/exam-papers-delivery-process/univ-exam-answer-paper-bags";
  }
  if (labelLower.includes("exam scan profile")) {
    return "/admin-examination-management/exam-papers-delivery-process/exam-scan-profile";
  }
  if (labelLower.includes("scan bundle detail")) {
    return "/admin-examination-management/exam-papers-delivery-process/scan-bundle-details";
  }
  // Evaluators Bank Copy Report (Angular exam-reports/evaluators-bank-copy-report)
  if (
    hrefLower.includes("evaluators-bank-copy-report") ||
    hrefLower.includes("evaluator-bank-copy-report") ||
    hrefLower.includes("evaluator-remuneration-report") ||
    labelLower.includes("evaluators bank copy") ||
    labelLower.includes("evaluator bank copy") ||
    labelLower.includes("evaluator remuneration report") ||
    labelLower.includes("evaluators remuneration report")
  ) {
    return "/admin-examination-management/exam-reports/evaluators-bank-copy-report";
  }
  // Exam Evaluation UnAssigned Report — before exam-evaluation-report (label overlap)
  if (
    hrefLower.includes("exam-evaluation-un-assigned-report") ||
    hrefLower.includes("evaluation-un-assigned") ||
    hrefLower.includes("evaluation-unassigned") ||
    labelLower.includes("exam evaluation un-assigned") ||
    labelLower.includes("exam evaluation unassigned") ||
    labelLower.includes("evaluation un-assigned report") ||
    labelLower.includes("evaluation unassigned report")
  ) {
    return "/admin-examination-management/exam-reports/exam-evaluation-un-assigned-report";
  }
  // Exam Evaluation Report (Angular exam-reports/exam-evaluation-report)
  if (
    hrefLower.includes("exam-evaluation-report") ||
    (labelLower.includes("exam evaluation report") &&
      !labelLower.includes("daily") &&
      !labelLower.includes("answer") &&
      !labelLower.includes("un-assigned") &&
      !labelLower.includes("unassigned"))
  ) {
    return "/admin-examination-management/exam-reports/exam-evaluation-report";
  }
  // Daily Evaluated Report (Angular exam-reports/daily-evaluated-report)
  if (
    hrefLower.includes("daily-evaluated-report") ||
    labelLower.includes("daily evaluated report") ||
    labelLower.includes("daily evaluation report")
  ) {
    return "/admin-examination-management/exam-reports/daily-evaluated-report";
  }
  // Subject Wise Evaluators List Report
  if (
    hrefLower.includes("subject-wise-evaluators-report") ||
    hrefLower.includes("subject-wise-evaluator") ||
    labelLower.includes("subject wise evaluators") ||
    labelLower.includes("subject-wise evaluators")
  ) {
    return "/admin-examination-management/exam-reports/subject-wise-evaluators-report";
  }
  // Exam Answer Sheets Upload Report
  if (
    hrefLower.includes("exam-answer-sheets-report") ||
    hrefLower.includes("answer-sheets-report") ||
    labelLower.includes("answer sheets upload") ||
    labelLower.includes("exam answersheets upload") ||
    labelLower.includes("exam answer sheets report")
  ) {
    return "/admin-examination-management/exam-reports/exam-answer-sheets-report";
  }
  // Exam Center Colleges Report
  if (
    hrefLower.includes("examcenter-colleges-report") ||
    hrefLower.includes("exam-center-colleges-report") ||
    labelLower.includes("exam center colleges report")
  ) {
    return "/admin-examination-management/exam-reports/examcenter-colleges-report";
  }
  // Exam Center Rooms Report (exam-reports — not delivery-process setup pages)
  if (
    hrefLower.includes("examcenter-rooms-report") ||
    hrefLower.includes("exam-center-rooms-report") ||
    labelLower.includes("exam center rooms report")
  ) {
    return "/admin-examination-management/exam-reports/examcenter-rooms-report";
  }
  // Exam Center Students Report (exam-reports — not delivery-process univ-examcenter-students)
  if (
    hrefLower.includes("examcenter-students-report") ||
    hrefLower.includes("exam-center-students-report") ||
    labelLower.includes("exam center students report")
  ) {
    return "/admin-examination-management/exam-reports/examcenter-students-report";
  }
  // Exam Center Profiles Report (exam-reports — not delivery university-exam-center-profiles)
  if (
    hrefLower.includes("examcenter-profiles-report") ||
    hrefLower.includes("exam-center-profiles-report") ||
    labelLower.includes("exam center profiles report")
  ) {
    return "/admin-examination-management/exam-reports/examcenter-profiles-report";
  }
  // University Curriculum Report (exam-reports — not academics university-curriculum master)
  if (
    hrefLower.includes("curriculum-report") ||
    labelLower.includes("university curriculum report") ||
    labelLower === "curriculum report"
  ) {
    return "/admin-examination-management/exam-reports/curriculum-report";
  }
  // Exam Students Not Registered Count — before registered-students-count (labels overlap)
  if (
    hrefLower.includes("exam-student-not-registered-count") ||
    hrefLower.includes("students-not-registered") ||
    labelLower.includes("exam students not registered") ||
    labelLower.includes("students not registered count")
  ) {
    return "/admin-examination-management/exam-reports/exam-student-not-registered-count";
  }
  // Exam Registered Students Count — check BEFORE registration-students (labels overlap)
  if (
    (hrefLower.includes("exam-registered-students-count") ||
      hrefLower.includes("registered-students-count") ||
      labelLower.includes("exam registered students count") ||
      labelLower.includes("registered students count")) &&
    !labelLower.includes("not") &&
    !hrefLower.includes("not-registered")
  ) {
    return "/admin-examination-management/exam-reports/exam-registered-students-count";
  }
  // Exam Student Registration Report (sidebar: Exam Registration Students)
  if (
    (hrefLower.includes("exam-registration-student-report") ||
      hrefLower.includes("exam-student-registration-report") ||
      labelLower.includes("exam student registration report") ||
      labelLower.includes("exam registration students")) &&
    !labelLower.includes("count") &&
    !hrefLower.includes("count")
  ) {
    return "/admin-examination-management/exam-reports/exam-registration-student-report";
  }
  // Group & Year Wise Result Report (Angular exam-reports/group-yearwise-result-report)
  if (
    hrefLower.includes("group-yearwise-result-report") ||
    hrefLower.includes("group-year-wise-result-report") ||
    labelLower.includes("group & year wise result") ||
    labelLower.includes("group and year wise result") ||
    labelLower.includes("group yearwise result") ||
    labelLower.includes("group year wise result")
  ) {
    return "/admin-examination-management/exam-reports/group-yearwise-result-report";
  }
  // Subject Wise Result Percentage Report
  if (
    hrefLower.includes("subject-wise-result-pass-percent") ||
    hrefLower.includes("subject-wise-result-percentage") ||
    hrefLower.includes("subject-wise-percentage") ||
    labelLower.includes("subject wise percentage") ||
    labelLower.includes("subject wise result percentage") ||
    labelLower.includes("subject wise pass percent")
  ) {
    return "/admin-examination-management/exam-reports/subject-wise-result-pass-percent-report";
  }
  // Gender Wise Exam Result
  if (
    hrefLower.includes("gender-wise-exam-report") ||
    hrefLower.includes("gender-wise-exam-result") ||
    hrefLower.includes("gender-wise-result") ||
    labelLower.includes("gender wise exam result") ||
    labelLower.includes("gender wise result")
  ) {
    return "/admin-examination-management/exam-reports/gender-wise-exam-report";
  }
  // Exam Verification Report hub (Angular exam-reports/exam-verification)
  if (
    hrefLower.includes("exam-verification") ||
    labelLower.includes("exam verification report") ||
    (labelLower.includes("exam verification") &&
      !labelLower.includes("answer") &&
      !labelLower.includes("mark"))
  ) {
    return "/admin-examination-management/exam-reports/exam-verification";
  }
  // Exam Scan Bundle New / Print — must run before the generic scan-bundles rule
  // (otherwise "Exam Scan Bundle New" also matches `exam scan bundle`).
  if (
    labelLower.includes("exam scan bundle new") ||
    labelLower.includes("exam scan bundles print") ||
    labelLower.includes("scan bundles print") ||
    hrefLower.includes("exam-scan-bundles-print") ||
    hrefLower.includes("exam-scan-bundle-print")
  ) {
    return "/admin-examination-management/exam-papers-delivery-process/exam-scan-bundles-print";
  }
  if (
    (labelLower.includes("scan bundles") ||
      labelLower.includes("exam scan bundles") ||
      labelLower.includes("exam scan bundle")) &&
    !labelLower.includes("print") &&
    !labelLower.includes("new") &&
    !labelLower.includes("detail")
  ) {
    return "/admin-examination-management/exam-papers-delivery-process/scan-bundles";
  }
  if (
    labelLower.includes("student re-admission") ||
    labelLower.includes("student readmission")
  ) {
    return "/admin-student-information-system/student-re-admission";
  }
  if (
    labelLower.includes("readmission application") ||
    labelLower.includes("re-admission application")
  ) {
    return "/admin-student-information-system/readmission-application";
  }
  if (labelLower.includes("student discontinue")) {
    return "/admin-student-information-system/student-discontinue";
  }
  if (
    labelLower.includes("student passout") ||
    labelLower.includes("students passout")
  ) {
    return "/admin-student-information-system/student-passout";
  }
  if (
    labelLower.includes("assign student roll") ||
    labelLower.includes("generate student roll") ||
    labelLower.includes("student roll number")
  ) {
    return "/admin-student-information-system/generate-student-rollno";
  }
  if (
    labelLower.includes("course outcomes") ||
    labelLower.includes("course outcome") ||
    hrefLower.includes("/subject-mapping/course-outcomes")
  ) {
    return "/academics/subject-mapping/course-outcomes";
  }
  if (
    labelLower.includes("allocate student subjects") ||
    labelLower.includes("allocate student subject") ||
    (labelLower.includes("allocate") &&
      labelLower.includes("student") &&
      labelLower.includes("subject")) ||
    hrefLower.includes("/subject-mapping/allocate-student-subject")
  ) {
    return "/academics/subject-mapping/allocate-student-subject";
  }
  const affiliatedBase = "/affiliated-colleges";
  if (
    hrefLower.includes("affiliated-colleges") ||
    hrefLower.includes("/apps/affiliated-colleges") ||
    labelLower.includes("affiliated college")
  ) {
    if (
      hrefLower.includes("assign-student-subjects") ||
      labelLower.includes("assign student subject")
    ) {
      return `${affiliatedBase}/assign-student-subjects`;
    }
    if (hrefLower.includes("college-student-subjects")) {
      return `${affiliatedBase}/college-student-subjects`;
    }
    if (href) {
      const affiliatedHref = normalizeHref(href);
      if (affiliatedHref.startsWith(`${affiliatedBase}/`))
        return affiliatedHref;
    }
  }
  if (
    !hasChildren &&
    (labelLower.includes("timetable dashboard") ||
      isTimetableModuleLabel(label))
  ) {
    return "/time-table-management/timetable-dashboard";
  }
  const hrPayrollBase = "/hr-payroll";
  if (
    hrefLower.includes("hr-payroll") ||
    hrefLower.includes("/apps/hr-payroll") ||
    (labelLower.includes("hr") && labelLower.includes("payroll"))
  ) {
    if (href) {
      const hrHref = normalizeHref(href);
      const idx = hrHref.indexOf(hrPayrollBase);
      if (idx >= 0) return hrHref.slice(idx);
      if (hrHref.includes("/apps/hr-payroll")) {
        return (
          hrPayrollBase +
            hrHref.split("/apps/hr-payroll")[1]?.replace(/\/$/, "") ||
          hrPayrollBase
        );
      }
    }
    if (labelLower.includes("hr dashboard"))
      return `${hrPayrollBase}/hr-dashboard`;
    if (labelLower.includes("department head"))
      return `${hrPayrollBase}/department-heads`;
    if (labelLower.includes("payroll category"))
      return `${hrPayrollBase}/payroll/payroll-category`;
    if (labelLower.includes("payroll group"))
      return `${hrPayrollBase}/payroll/payroll-group`;
    if (labelLower.includes("payslip"))
      return `${hrPayrollBase}/payroll/payslip-for-employees`;
    if (labelLower.includes("leave type"))
      return `${hrPayrollBase}/leave-management/leave-type`;
    if (labelLower.includes("employee list"))
      return `${hrPayrollBase}/employee/employee-list`;
  }
  if (
    (labelLower.includes("assign student subject") ||
      labelLower.includes("college student subject")) &&
    !hrefLower.includes("subject-mapping") &&
    !hrefLower.includes("/academics/") &&
    !hrefLower.includes("student-information")
  ) {
    return `${affiliatedBase}/assign-student-subjects`;
  }
  if (
    (labelLower.includes("student subjects") ||
      labelLower.includes("student subject")) &&
    !hrefLower.includes("affiliated-colleges")
  ) {
    return "/admin-student-information-system/student-subjects";
  }
  if (
    labelLower.includes("modify subject group") ||
    labelLower.includes("modify course group")
  ) {
    return "/academics/modify-course-group";
  }
  if (
    labelLower.includes("modify academic batch") ||
    labelLower.includes("modify acadamic batch") ||
    labelLower.includes("modify student batch") ||
    labelLower.includes("modify student batches")
  ) {
    return "/academics/modify-student-batches";
  }
  if (
    labelLower === "regulations" ||
    hrefLower.includes("/master/regulation") ||
    hrefLower.endsWith("/regulation")
  ) {
    return "/academics/regulations";
  }
  if (
    labelLower.includes("subjects master") ||
    (labelLower === "subjects" && hrefLower.includes("/master/subjects")) ||
    hrefLower.endsWith("/master/subjects")
  ) {
    return "/academics/subjects";
  }
  if (
    (labelLower.includes("university curriculum") &&
      !labelLower.includes("report")) ||
    hrefLower.includes("/master/university-currriculum") ||
    hrefLower.includes("/master/university-curriculum")
  ) {
    return "/academics/university-curriculum";
  }
  if (
    labelLower.includes("assign semestr subjects") ||
    labelLower.includes("assign semester subjects") ||
    hrefLower.includes("/college-curriculum/subject-allocation")
  ) {
    return "/academics/college-curriculum/subject-allocation";
  }
  if (
    labelLower.includes("subject unit topics") ||
    labelLower.includes("subject unit topic") ||
    labelLower.includes("unit topics") ||
    hrefLower.includes("/academics/subject-unit-topics") ||
    hrefLower.includes("/subject-unit-topics")
  ) {
    return "/academics/subject-unit-topics";
  }
  if (
    labelLower.includes("subject syllabus plan") ||
    labelLower.includes("syllabus plan") ||
    hrefLower.includes("/subject-mapping/subject-syllabus-plan") ||
    hrefLower.includes("/subject-syllabus-plan")
  ) {
    return "/academics/subject-mapping/subject-syllabus-plan";
  }
  if (
    labelLower.includes("elective group mapping") ||
    labelLower.includes("elective-group-mapping") ||
    hrefLower.includes("/subject-mapping/elective-group-mapping") ||
    hrefLower.includes("/elective-group-mapping")
  ) {
    return "/academics/subject-mapping/elective-group-mapping";
  }
  if (
    labelLower.includes("student enrollment to elective subject") ||
    labelLower.includes("student enrolment to elective subject") ||
    labelLower.includes("student elective subject enrollment") ||
    labelLower.includes("student elective subject enrolment") ||
    (labelLower.includes("student") &&
      labelLower.includes("elective") &&
      labelLower.includes("subject")) ||
    hrefLower.includes(
      "/subject-mapping/student-enrollment-to-elective-subject",
    ) ||
    hrefLower.includes(
      "/subject-mapping/student-enrolment-to-elective-subject",
    ) ||
    hrefLower.includes(
      "/subject-mapping/student-enrollment-to-elective-subjects",
    ) ||
    hrefLower.includes(
      "/subject-mapping/student-enrolment-to-elective-subjects",
    ) ||
    hrefLower.includes("/student-enrollment-to-elective-subject") ||
    hrefLower.includes("/student-enrolment-to-elective-subject") ||
    hrefLower.includes("/student-enrollment-to-elective-subjects") ||
    hrefLower.includes("/student-enrolment-to-elective-subjects")
  ) {
    return "/academics/subject-mapping/student-enrollment-to-elective-subject";
  }
  if (
    labelLower.includes("assign regulation to students") ||
    labelLower.includes("assign regulation for students") ||
    labelLower.includes("student regulation assignment") ||
    (labelLower.includes("assign") &&
      labelLower.includes("regulation") &&
      labelLower.includes("student")) ||
    hrefLower.includes("/subject-mapping/assign-regulation-to-students") ||
    hrefLower.includes("/assign-regulation-to-students")
  ) {
    return "/academics/subject-mapping/assign-regulation-to-students";
  }
  if (
    labelLower.includes("academic batches of student") ||
    labelLower.includes("academic batches") ||
    labelLower.includes("acadamic batches") ||
    hrefLower.includes("/academics/academic-batches")
  ) {
    return "/academics/academic-batches";
  }
  if (
    labelLower.includes("modify elective batch") ||
    labelLower.includes("modify elective batches") ||
    (labelLower.includes("modify") &&
      labelLower.includes("elective") &&
      labelLower.includes("batch")) ||
    hrefLower.includes("/academics/modify-elective-batches")
  ) {
    return "/academics/modify-elective-batches";
  }
  if (
    labelLower.includes("modify student section") ||
    labelLower.includes("modify students section") ||
    (labelLower.includes("modify") &&
      labelLower.includes("student") &&
      labelLower.includes("section")) ||
    hrefLower.includes("/academics/modify-student-section")
  ) {
    return "/academics/modify-student-section";
  }
  if (
    labelLower.includes("assign students to section") ||
    labelLower.includes("assign student to section") ||
    labelLower.includes("student section assignment") ||
    (labelLower.includes("assign") &&
      labelLower.includes("student") &&
      labelLower.includes("section")) ||
    hrefLower.includes("/subject-mapping/assign-students-to-section") ||
    hrefLower.includes("/assign-students-to-section")
  ) {
    return "/academics/subject-mapping/assign-students-to-section";
  }
  if (
    labelLower.includes("assign students to lab batches") ||
    labelLower.includes("assign students to lab batch") ||
    labelLower.includes("assign student to lab batches") ||
    labelLower.includes("student lab batch assignment") ||
    (labelLower.includes("assign") &&
      labelLower.includes("student") &&
      labelLower.includes("lab") &&
      labelLower.includes("batch")) ||
    hrefLower.includes("/subject-mapping/assign-students-to-lab-batches") ||
    hrefLower.includes("/assign-students-to-lab-batches")
  ) {
    return "/academics/subject-mapping/assign-students-to-lab-batches";
  }
  if (
    labelLower.includes("assign subject books") ||
    labelLower.includes("subject books assign") ||
    labelLower.includes("subject book assign") ||
    hrefLower.includes("/subject-mapping/assign-subject-books") ||
    hrefLower.includes("/subject-mapping/subject-books")
  ) {
    return "/academics/subject-mapping/assign-subject-books";
  }
  if (
    labelLower.includes("add subject units") ||
    labelLower.includes("subjects units") ||
    labelLower.includes("subject units") ||
    hrefLower.includes("/subject-mapping/add-subject-units")
  ) {
    return "/academics/subject-mapping/add-subject-units";
  }
  if (
    labelLower.includes("staff subject unmapping") ||
    labelLower.includes("staff subject un-mapping") ||
    labelLower.includes("staff subject disassociation") ||
    hrefLower.includes("/subject-mapping/staff-subject-unmapping") ||
    hrefLower.includes("/subject-mapping/staff-subject-disassociation")
  ) {
    return "/academics/subject-mapping/staff-subject-unmapping";
  }
  if (
    labelLower.includes("staff subject mapping") ||
    labelLower.includes("staff subject association") ||
    hrefLower.includes("/subject-mapping/course-group-subjects-list") ||
    hrefLower.includes("/subject-mapping/staff-subject-mapping") ||
    hrefLower.includes("/subject-mapping/staff-subject-association")
  ) {
    return "/academics/subject-mapping/course-group-subjects-list";
  }
  if (
    labelLower.includes("view semester subjects") ||
    labelLower.includes("view semestr subjects") ||
    (hrefLower.includes("/college-curriculum/course-year-subjects") &&
      !labelLower.includes("staff subject"))
  ) {
    return "/academics/college-curriculum/course-year-subjects";
  }
  if (labelLower === "college" || labelLower === "colleges") {
    return "/admin/colleges";
  }
  if (labelLower.includes("academic year")) {
    return "/admin/academic-years";
  }
  if (labelLower.includes("financial year")) {
    return "/admin/financial-years";
  }
  if (
    (labelLower.includes("college courses") && labelLower.includes("group")) ||
    (labelLower.includes("college subject") && labelLower.includes("group"))
  ) {
    return "/admin/college-courses-groups";
  }
  if (
    hrefLower.includes("academic-settings/course-type") ||
    hrefLower.includes("master-settings/subject-type") ||
    hrefLower.includes("master-settings/course-type") ||
    hrefLower.endsWith("/course-types") ||
    hrefLower.endsWith("/subject-type") ||
    hrefLower.endsWith("/course-type") ||
    labelLower.includes("subject type") ||
    labelLower.includes("subjects type") ||
    labelLower.includes("subject types") ||
    labelLower.includes("course type") ||
    labelLower.includes("course types") ||
    labelLower.includes("courses type") ||
    labelLower.includes("courses types")
  ) {
    return "/admin/course-types";
  }
  if (
    labelLower === "subjects" ||
    labelLower === "subject" ||
    labelLower === "course" ||
    labelLower === "courses"
  ) {
    return "/admin/courses";
  }
  if (
    labelLower.includes("subject group") ||
    labelLower.includes("course group")
  ) {
    return "/admin/course-groups";
  }
  if (
    labelLower.includes("semister") ||
    labelLower.includes("semester") ||
    labelLower.includes("course year")
  ) {
    return "/admin/course-years";
  }
  if (labelLower === "sections" || labelLower === "section") {
    return "/admin/group-sections";
  }
  if (labelLower.includes("student batch")) {
    return "/admin/student-batches";
  }
  if (labelLower === "batches" || labelLower === "batch") {
    return "/admin/batches";
  }
  if (labelLower === "building" || labelLower === "buildings") {
    return "/admin/buildings";
  }
  if (
    labelLower === "block" ||
    labelLower === "blocks" ||
    labelLower.includes(" block ") ||
    labelLower.startsWith("block ") ||
    labelLower.endsWith(" block") ||
    labelLower.startsWith("blocks ") ||
    labelLower.endsWith(" blocks")
  ) {
    return "/admin/blocks";
  }
  if (labelLower === "floor" || labelLower === "floors") {
    return "/admin/floors";
  }
  if (labelLower.includes("room type") || labelLower === "room types") {
    return "/admin/room-types";
  }
  if (labelLower.includes("room details") || labelLower === "room detail") {
    return "/admin/room-details";
  }
  if (labelLower === "room" || labelLower === "rooms") {
    return "/admin/rooms";
  }
  if (labelLower === "general setting" || labelLower === "general settings") {
    return "/admin/general-settings";
  }
  if (
    labelLower.includes("general master setting") ||
    labelLower.includes("general master settings") ||
    labelLower.includes("general masters")
  ) {
    return "/admin/general-master-settings";
  }
  if (
    labelLower === "designation" ||
    labelLower === "designations" ||
    labelLower.includes("designation")
  ) {
    return "/admin/designations";
  }
  if (
    labelLower.includes("qualification group") ||
    labelLower.includes("qualification groups")
  ) {
    return "/admin/qualification-groups";
  }
  if (
    labelLower.includes("workflow stage") ||
    labelLower.includes("workflow stages")
  ) {
    return "/admin/workflow-stages";
  }
  if (
    labelLower.includes("holiday") ||
    labelLower.includes("holidays") ||
    labelLower.includes("calendar") ||
    labelLower.includes("calender")
  ) {
    return "/admin/holidays-calendar";
  }
  if (
    labelLower === "qualification" ||
    labelLower === "qualifications" ||
    labelLower.includes("qualification")
  ) {
    return "/admin/qualifications";
  }
  if (labelLower.includes("digital online sync")) {
    return "/admin/digital-online-sync";
  }
  if (labelLower.includes("document repository")) {
    return "/admin/document-repository";
  }
  if (labelLower.includes("unit topic bulk upload")) {
    return "/admin/bulk-uploads/unit-topic-bulk-upload";
  }
  if (
    labelLower.includes("photos bulk upload") ||
    labelLower.includes("photo bulk upload")
  ) {
    return "/admin/bulk-uploads/photos-bulk-upload";
  }
  if (
    labelLower.includes("temporary staging tables bulk upload") ||
    labelLower.includes("temparory staging table bulk upload")
  ) {
    return "/admin/bulk-uploads/temporary-staging-tables-bulk-upload";
  }
  if (
    labelLower.includes("dost upload") ||
    labelLower.includes("student dost upload")
  ) {
    return "/admin/bulk-uploads/student-dost-upload";
  }
  if (
    labelLower.includes("student bulk upload") ||
    labelLower.includes("students upload")
  ) {
    return "/admin/bulk-uploads/students-upload";
  }
  if (
    labelLower.includes("employee bulk upload") ||
    labelLower.includes("employee upload")
  ) {
    return "/admin/bulk-uploads/employee-upload";
  }
  if (
    labelLower.includes("subjects bulk upload") ||
    labelLower.includes("subject bulk upload")
  ) {
    return "/admin/bulk-uploads/subjects-bulk-upload";
  }
  if (
    labelLower.includes("books bulk upload") ||
    labelLower.includes("book bulk upload")
  ) {
    return "/admin/bulk-uploads/books-bulk-upload";
  }
  if (
    labelLower.includes("week day") ||
    labelLower.includes("weekday") ||
    labelLower.includes("weekdays")
  ) {
    return "/admin/weekdays";
  }
  if (
    labelLower.includes("configure auto number") ||
    labelLower.includes("configuration auto number") ||
    labelLower.includes("auto number configuration") ||
    (labelLower.includes("auto") && labelLower.includes("number"))
  ) {
    return "/admin/configure-auto-numbers";
  }
  if (
    labelLower.includes("student co-curriculum activit") ||
    labelLower.includes("student co curricular activit") ||
    labelLower.includes("student cc activit")
  ) {
    return "/admin-student-information-system/student-cc-activities";
  }
  if (
    labelLower.includes("general user accounts") ||
    labelLower.includes("general users accounts") ||
    hrefLower.includes("/admin-user-management/general-users-accounts") ||
    hrefLower.includes("/admin-user-management/general-user-accounts")
  ) {
    return "/user-management/general-user-accounts";
  }
  if (
    labelLower.includes("staff accounts") ||
    labelLower.includes("staff account") ||
    hrefLower.includes("/admin-user-management/staff-accounts") ||
    hrefLower.includes("/admin-user-management/staff-account")
  ) {
    return "/user-management/staff-accounts";
  }
  if (
    labelLower.includes("examination accounts") ||
    labelLower.includes("examination account") ||
    labelLower.includes("exam controller account") ||
    hrefLower.includes("/admin-user-management/examination-accounts") ||
    hrefLower.includes("/admin-user-management/examination-account")
  ) {
    return "/user-management/examination-accounts";
  }
  if (
    labelLower.includes("parent accounts") ||
    labelLower.includes("parent account") ||
    hrefLower.includes("/admin-user-management/parent-accounts") ||
    hrefLower.includes("/admin-user-management/parent/manage")
  ) {
    if (hrefLower.includes("add-sibling")) {
      return "/user-management/parent-accounts/add-sibling";
    }
    if (
      hrefLower.includes("parent/manage") ||
      labelLower.includes("add parent")
    ) {
      return "/user-management/parent-accounts/manage";
    }
    return "/user-management/parent-accounts";
  }
  if (
    labelLower.includes("student accounts") ||
    labelLower.includes("student account") ||
    labelLower.includes("add student") ||
    hrefLower.includes("/admin-user-management/student-accounts") ||
    hrefLower.includes("/admin-user-management/student-account") ||
    hrefLower.includes("/admin-user-management/student/manage") ||
    hrefLower.includes("/user-management/student/manage")
  ) {
    if (
      hrefLower.includes("student/manage") ||
      labelLower.includes("add student")
    ) {
      return "/user-management/student-accounts?add=1";
    }
    return "/user-management/student-accounts";
  }
  // Assessments — Question Bank (Angular: `question-bank-list`; module folder `assissments` typo).
  if (
    hrefLower.includes("question-bank-list") ||
    hrefLower.includes("/apps/assissments/") ||
    (hrefLower.includes("assissments") &&
      hrefLower.includes("question-bank")) ||
    (hrefLower.includes("/assessments/question-bank") &&
      !hrefLower.includes("add-question")) ||
    (labelLower.includes("question bank") &&
      !labelLower.includes("exam question") &&
      !labelLower.includes("question paper") &&
      !hrefLower.includes("admin-examination-management") &&
      !hrefLower.includes("evaluation-process"))
  ) {
    return "/assessments/question-bank";
  }
  if (hrefLower.includes("/assessments/question-bank/add-question")) {
    return "/assessments/question-bank/add-question";
  }
  if (
    hrefLower.includes("/assessments/test") ||
    hrefLower.includes("/apps/assissments/test") ||
    (labelLower === "test" && !hrefLower.includes("question-paper")) ||
    labelLower.includes("test list")
  ) {
    return "/assessments/test";
  }
  return null;
}

/** Same final href sidebar clicks and Search pages use. */
export function resolveNavHref(
  href: string | undefined,
  label: string,
  id?: string,
  hasChildren?: boolean,
): string {
  const forced = resolveForcedNavRoute(href, label, id, hasChildren);
  const raw = forced ?? href ?? "";
  if (!raw || raw === "#") return "";
  // `forced` is an exact, hardcoded pin to a real page route. Do NOT run it
  // through normalizePageHref's canonicalizePageSlug step — that rewrites the
  // last path segment to match toNavSlug(label), which mangles pins whose
  // slug intentionally differs from the label wording (e.g. label "Gender
  // Wise Exam Result" → real page folder "gender-wise-exam-report") and
  // causes 404s. Only unpinned (raw DB) hrefs need label-based canonicalization.
  if (forced) return normalizeHref(forced);
  return normalizePageHref(raw, label);
}

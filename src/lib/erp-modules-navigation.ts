import type { NavItem } from "@/types/navigation";
import {
  mapMirroredModuleLabelToRoute,
  mapMirroredModuleNavRoute,
} from "@/lib/erp-module-mirror/navigation";
import {
  isRegistrarLogin,
  isStudentClassDiaryViewer,
  isStudentPortalViewer,
  mapModuleTail,
  normalizeLabelKey,
} from "./erp-modules-navigation-utils";
import { mapAdminInstitutionalRoomRoute } from "@/lib/admin-institutional-navigation";
import { mapHostelNavRoute } from "./hostel-navigation";

export {
  isRegistrarLogin,
  isStudentClassDiaryViewer,
  isStudentPortalViewer,
} from "./erp-modules-navigation-utils";

/** App Router bases (Angular legacy paths mapped in `navigation.ts` normalizeHref). */
export const ATTENDANCE_MGMT_BASE = "/attendance-management";
export const MENTORSHIP_BASE = "/mentorship";
export const EVENTS_BASE = "/events";
export const NOTIFICATIONS_ANNOUNCEMENTS_BASE =
  "/notifications-and-announcements";
export const MY_NOTIFICATIONS_BASE = "/my-notifications";
export const LIBRARY_BASE = "/library";
export const TRANSPORT_BASE = "/transport";
export const TC_NO_DUE_BASE = "/tc-no-due-approval";
export const HOSTEL_BASE = "/hostel";
export const CERTIFICATES_BASE = "/certificates";
export const CAMPUS_MAINTENANCE_BASE = "/campus-maintenance";
export const TRAININGS_BASE = "/trainings";
export const PLACEMENTS_ACHIEVEMENTS_BASE = "/placements-achievements";
export const COMMITTEES_BASE = "/committees";
/** Angular `student-academics` module (student portal Academics). */
export const STUDENT_ACADEMICS_BASE = "/student-academics";
export const STAFF_CLASSES_BASE = "/staff-classes";

function lastPathSegment(href: string): string {
  const cleaned = href.replace(/[#?].*$/, "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

// ── Attendance ─────────────────────────────────────────────────────────────

const ATTENDANCE_SLUGS: Record<string, string> = {
  "student-attendance": "student-attendance",
  studentattendance: "student-attendance",
  "view-student-attendance": "view-student-attendance",
  "view-subject-attendance": "view-subject-attendance",
  "workload-adjustment": "workload-adjustment",
  "staff-attendance-not-markedlist": "staff-attendance-not-markedlist",
  "attendance-dashboard": "attendance-dashboard",
  "mark-attendance": "mark-attendance",
  "view-attendance": "mark-attendance/view-attendance",
  "exam-attendance": "exam-attendance",
};

/** Angular `staff-faculty-details/staff-workload-adjustment` (StaffProxyList). */
export const STAFF_WORKLOAD_ADJUSTMENT_ROUTE =
  "/staff-faculty-details/staff-workload-adjustment";

/** Angular `staff-faculty-leaves/set-proxy` (StaffWorkloadComponent). */
export const SET_PROXY_ROUTE = "/staff-faculty-leaves/set-proxy";

/** Angular `staff-faculty-details/salary-slips` (SalarySlipsComponent). */
export const SALARY_SLIPS_ROUTE = "/staff-faculty-details/salary-slips";

export function isSalarySlipsNav(href?: string, label?: string): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  if (
    hrefLower.includes("salary-slips") ||
    hrefLower.includes("staff-faculty-details/salary-slips")
  ) {
    return true;
  }
  const labelLower = (label ?? "").trim().toLowerCase();
  return labelLower === "salary slips" || labelLower === "my payslips";
}

export function isStaffSelfAppraisalNav(
  href?: string,
  label?: string,
): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  const key = normalizeLabelKey(label ?? "");
  const labelLower = (label ?? "").trim().toLowerCase();
  if (hrefLower.includes("staff-faculty-details/appraisal-report")) {
    return true;
  }
  return (
    key === "staffselfappraisalforms" ||
    key === "staffselfappraisal" ||
    key === "appraisalreport" ||
    key === "selfappraisalform" ||
    labelLower === "self appraisal form" ||
    labelLower === "staff self appraisal forms" ||
    labelLower === "staff self appraisal"
  );
}

/**
 * True for the Faculty Leaves "Set Proxy" menu item (Registrar/admin).
 * Distinct from workload-adjustment's in-page Set Proxy action.
 */
export function isSetProxyNav(href?: string, label?: string): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  if (
    hrefLower.includes("set-proxy") ||
    hrefLower.includes("staff-faculty-leaves/set-proxy") ||
    hrefLower.includes("staff-faculty-leaves/staff-workload")
  ) {
    return true;
  }
  const labelLower = (label ?? "").trim().toLowerCase();
  return labelLower === "set proxy";
}

/**
 * True for the Faculty Details "Staff Workload Adjustment" menu item — must not
 * fall through to the Faculty Leaves "Workload Adjustment" page.
 */
export function isStaffWorkloadAdjustmentNav(
  href?: string,
  label?: string,
): boolean {
  const hrefLower = (href ?? "").toLowerCase();
  const key = normalizeLabelKey(label ?? "");
  if (
    hrefLower.includes("staff-workload-adjustment") ||
    hrefLower.includes("staff-proxy-list")
  ) {
    return true;
  }
  return (
    key.includes("staff") && key.includes("workload") && key.includes("adjust")
  );
}

export function mapAttendanceLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key.includes("attendancemanagement") || key === "attendancemanagement") {
    return `${ATTENDANCE_MGMT_BASE}/attendance-dashboard`;
  }
  // Attendance Management entry only — not Student Attendance *Reports*.
  // "Course Wise Student Attendance" contains "studentattendance" but is a report.
  const isAttendanceReportLabel =
    key.includes("report") ||
    key.includes("subjectwise") ||
    key.includes("coursewise") ||
    key.includes("percentage") ||
    key.includes("register") ||
    key.includes("consolidated") ||
    key.includes("dailyattendance") ||
    (key.includes("detail") && key.includes("attendance"));
  if (
    key.includes("studentattendance") &&
    !key.includes("view") &&
    !isAttendanceReportLabel
  ) {
    return `${ATTENDANCE_MGMT_BASE}/student-attendance`;
  }
  if (key.includes("viewstudent") && key.includes("attendance")) {
    return `${ATTENDANCE_MGMT_BASE}/view-student-attendance`;
  }
  if (key.includes("viewsubject") && key.includes("attendance")) {
    return `${ATTENDANCE_MGMT_BASE}/view-subject-attendance`;
  }
  if (key.includes("workload") && key.includes("adjust")) {
    // Angular has two distinct pages:
    // "Staff Workload Adjustment" → staff-faculty-details (StaffProxyList)
    // "Workload Adjustment"       → staff-faculty-leaves (own proxy tabs)
    if (key.includes("staff")) return STAFF_WORKLOAD_ADJUSTMENT_ROUTE;
    return `/staff-faculty-leaves/workload-adjustment`;
  }
  if (key.includes("staff") && key.includes("notmarked")) {
    return `${ATTENDANCE_MGMT_BASE}/staff-attendance-not-markedlist`;
  }
  // Angular Academics menu label (staff-classes/attendance-update).
  if (key.includes("attendanceupdate")) {
    return `${ATTENDANCE_MGMT_BASE}/mark-attendance`;
  }
  if (
    key.includes("markattendance") ||
    (key.includes("mark") && key.includes("attendance"))
  ) {
    return `${ATTENDANCE_MGMT_BASE}/mark-attendance`;
  }
  if (key.includes("exam") && key.includes("attendance")) {
    return `${ATTENDANCE_MGMT_BASE}/exam-attendance`;
  }
  if (key.includes("attendancedashboard")) {
    return `${ATTENDANCE_MGMT_BASE}/attendance-dashboard`;
  }
  return null;
}

export function mapAttendanceNavRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefRaw = (href ?? "").trim();
  const hrefLower = hrefRaw.toLowerCase();

  // Faculty Details "Staff Workload Adjustment" — separate page from Faculty
  // Leaves "Workload Adjustment".
  if (isStaffWorkloadAdjustmentNav(hrefRaw, label)) {
    return STAFF_WORKLOAD_ADJUSTMENT_ROUTE;
  }

  // Faculty Leaves / proxy-workload keep Angular paths (do not remap to attendance).
  if (
    hrefLower.includes("staff-faculty-leaves") ||
    hrefLower.includes("proxy-workload")
  ) {
    return null;
  }

  const byLabel = mapAttendanceLabelToRoute(label);
  if (byLabel) return byLabel;

  if (!hrefRaw || hrefRaw === "#") return null;

  if (hrefLower.includes("staff-classes/attendance-update")) {
    if (hrefLower.includes("view-attendance"))
      return `${ATTENDANCE_MGMT_BASE}/mark-attendance/view-attendance`;
    if (hrefLower.includes("mark-attendance"))
      return `${ATTENDANCE_MGMT_BASE}/mark-attendance/mark-attendance`;
    return `${ATTENDANCE_MGMT_BASE}/mark-attendance`;
  }
  if (hrefLower.includes("exam-attendance"))
    return `${ATTENDANCE_MGMT_BASE}/exam-attendance`;

  const fromAdmin = mapModuleTail(
    hrefRaw,
    "admin-attendance-management",
    ATTENDANCE_MGMT_BASE,
    ATTENDANCE_SLUGS,
    "attendance-dashboard",
  );
  if (fromAdmin) return fromAdmin;

  if (hrefLower.includes("attendance-management")) {
    const idx = hrefLower.indexOf("attendance-management");
    const tail = hrefRaw.slice(idx).split("?")[0];
    if (tail === "attendance-management" || tail === "/attendance-management") {
      return `${ATTENDANCE_MGMT_BASE}/attendance-dashboard`;
    }
    return tail.startsWith("/") ? tail : `/${tail}`;
  }

  const seg = lastPathSegment(hrefLower);
  const slug = ATTENDANCE_SLUGS[seg] ?? ATTENDANCE_SLUGS[seg.replace(/-/g, "")];
  if (slug && hrefLower.includes("attendance"))
    return `${ATTENDANCE_MGMT_BASE}/${slug}`;

  return null;
}

// ── Staff Classes (Academics → My Classes / My Timetable / …) ───────────────

const STAFF_CLASSES_SLUGS: Record<string, string> = {
  "my-classes": "my-classes",
  myclasses: "my-classes",
  "my-timetable": "my-timetable",
  mytimetable: "my-timetable",
  assignments: "assignments",
  "class-dairy": "class-dairy",
  "class-diary": "class-dairy",
  "join-live": "join-live",
  "staff-timetable-report": "staff-timetable-report",
};

export function mapStaffClassesLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key === "myclasses" || key.includes("myclasses")) {
    return `${STAFF_CLASSES_BASE}/my-classes`;
  }
  if (
    key === "mytimetable" ||
    (key.includes("my") && key.includes("timetable"))
  ) {
    return `${STAFF_CLASSES_BASE}/my-timetable`;
  }
  if (key === "assignments" || key === "assignment") {
    if (isStudentPortalViewer()) {
      return `${STUDENT_ACADEMICS_BASE}/student-assignments`;
    }
    return `${STAFF_CLASSES_BASE}/assignments`;
  }
  // Bare "Class Diary" — staff Academics vs student Academics (shared menu label).
  if (
    (key === "classdiary" || key === "classdairy") &&
    !key.includes("staff") &&
    !key.includes("student")
  ) {
    if (isStudentClassDiaryViewer()) {
      return `${STUDENT_ACADEMICS_BASE}/student-class-dairy`;
    }
    return `${STAFF_CLASSES_BASE}/class-dairy`;
  }
  return null;
}

export function mapStaffClassesNavRoute(
  href?: string,
  label?: string,
): string | null {
  const labelKey = label ? normalizeLabelKey(label) : "";
  // Staff/Student Class Diary menu items belong to student-class-dairy page.
  if (
    labelKey === "staffclassdiary" ||
    labelKey === "staffclassdairy" ||
    labelKey === "studentclassdiary" ||
    labelKey === "studentclassdairy" ||
    (labelKey.includes("staff") &&
      (labelKey.includes("classdiary") || labelKey.includes("classdairy")))
  ) {
    return null;
  }

  const hrefRaw = (href ?? "").trim();
  const hrefLower = hrefRaw.toLowerCase();

  // Shared DB href `staff-classes/class-dairy` for student Academics → student page.
  if (
    (hrefLower.includes("staff-classes/class-dairy") ||
      hrefLower.includes("staff-classes/class-diary")) &&
    isStudentPortalViewer()
  ) {
    return `${STUDENT_ACADEMICS_BASE}/student-class-dairy`;
  }

  // Shared DB href `staff-classes/assignments` for student Academics → student page.
  if (
    hrefLower.includes("staff-classes/assignments") &&
    isStudentPortalViewer()
  ) {
    return `${STUDENT_ACADEMICS_BASE}/student-assignments`;
  }

  const byLabel = mapStaffClassesLabelToRoute(label);
  if (byLabel) return byLabel;

  if (!hrefRaw || hrefRaw === "#") return null;

  // Do not steal attendance-update under staff-classes (handled by attendance mapper).
  if (hrefLower.includes("staff-classes/attendance-update")) return null;

  if (hrefLower.includes("staff-classes")) {
    const idx = hrefLower.indexOf("staff-classes");
    const tail = hrefRaw
      .slice(idx + "staff-classes".length)
      .replace(/^\/+/, "");
    if (!tail) return `${STAFF_CLASSES_BASE}/my-classes`;
    const first = tail.split("/")[0]!.toLowerCase();
    const slug =
      STAFF_CLASSES_SLUGS[first] ??
      STAFF_CLASSES_SLUGS[first.replace(/-/g, "")] ??
      first;
    const rest = tail.split("/").slice(1).join("/");
    return rest
      ? `${STAFF_CLASSES_BASE}/${slug}/${rest}`
      : `${STAFF_CLASSES_BASE}/${slug}`;
  }

  const seg = lastPathSegment(hrefLower);
  if (
    (seg === "my-classes" || seg === "myclasses") &&
    (hrefLower.includes("academics") || label)
  ) {
    return `${STAFF_CLASSES_BASE}/my-classes`;
  }

  return null;
}

// ── Mentorship / counseling ──────────────────────────────────────────────────

const MENTORSHIP_SLUGS: Record<string, string> = {
  "schedule-ptm": "schedule-ptm",
  "assign-mentor-to-students": "assign-mentor-to-students",
  "assign-counselor": "assign-counselor",
  "teacher-meeting": "teacher-meeting",
  "meeting-history": "meeting-history",
  "student-meetings": "student-meetings",
  "meetings-list": "meetings-list",
  meeting: "meeting",
  "counseling-dashboard": "counseling-dashboard",
  "student-counselors": "student-counselors",
  "activity-type": "activity-type",
};

export function mapMentorshipLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key.includes("mentorship") || key.includes("mentoring")) {
    return `${MENTORSHIP_BASE}/counseling-dashboard`;
  }
  if (key.includes("scheduleptm") || key.includes("schedulemeeting")) {
    return `${MENTORSHIP_BASE}/schedule-ptm`;
  }
  if (
    key.includes("assignmentor") ||
    (key.includes("assign") && key.includes("mentor"))
  ) {
    return `${MENTORSHIP_BASE}/assign-mentor-to-students`;
  }
  if (key.includes("assigncounselor"))
    return `${MENTORSHIP_BASE}/assign-counselor`;
  if (key.includes("counselingdashboard"))
    return `${MENTORSHIP_BASE}/counseling-dashboard`;
  if (key.includes("activitytype")) return `${MENTORSHIP_BASE}/activity-type`;
  if (key.includes("meetinghistory"))
    return `${MENTORSHIP_BASE}/meeting-history`;
  if (key.includes("studentmeeting"))
    return `${MENTORSHIP_BASE}/student-meetings`;
  return null;
}

export function mapMentorshipNavRoute(
  href?: string,
  label?: string,
): string | null {
  const byLabel = mapMentorshipLabelToRoute(label);
  if (byLabel) return byLabel;

  const hrefRaw = (href ?? "").trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();

  for (const seg of ["staff-mentorship", "admin-counseling"] as const) {
    const mapped = mapModuleTail(
      hrefRaw,
      seg,
      MENTORSHIP_BASE,
      MENTORSHIP_SLUGS,
      "counseling-dashboard",
    );
    if (mapped) return mapped;
  }

  if (hrefLower.includes("mentorship")) {
    const idx = hrefLower.indexOf("mentorship");
    const tail = hrefRaw.slice(idx).split("?")[0];
    if (tail === "mentorship" || tail === "/mentorship") {
      return `${MENTORSHIP_BASE}/counseling-dashboard`;
    }
    return tail.startsWith("/") ? tail : `/${tail}`;
  }

  const seg = lastPathSegment(hrefLower);
  const slug = MENTORSHIP_SLUGS[seg];
  if (
    slug &&
    (hrefLower.includes("counsel") ||
      hrefLower.includes("mentor") ||
      hrefLower.includes("ptm"))
  ) {
    return `${MENTORSHIP_BASE}/${slug}`;
  }

  return null;
}

// ── Student Academics ────────────────────────────────────────────────────────

const STUDENT_ACADEMICS_SLUGS: Record<string, string> = {
  "student-timetable": "student-timetable",
  "my-subjects": "my-subjects",
  "student-my-subjects": "my-subjects",
  "student-class-dairy": "student-class-dairy",
  "student-class-diary": "student-class-dairy",
  "student-assignments": "student-assignments",
  "student-my-attendance": "student-my-attendance",
  "student-mentor-details": "student-mentor-details",
  "special-activities": "special-activities",
};

/**
 * Map Angular student-academics href/label → App Router path.
 * Prefer href segments so a bare "Timetable" label does not steal admin
 * Time-Table Management routes.
 */
export function mapStudentAcademicsNavRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefRaw = (href ?? "").trim();
  const hrefLower = hrefRaw.toLowerCase();
  const labelKey = label ? normalizeLabelKey(label) : "";

  // Staff Academics (staff-classes) is a separate module — do not remap here.
  if (hrefLower.includes("staff-classes")) return null;

  // Menu label "Staff Class Diary" keeps the existing student-class-dairy page.
  if (
    !labelKey.includes("report") &&
    !labelKey.includes("consolidated") &&
    !hrefLower.includes("report") &&
    !hrefLower.includes("consolidated") &&
    ((labelKey.includes("staff") &&
      (labelKey.includes("classdiary") || labelKey.includes("classdairy"))) ||
      hrefLower.includes("staff-class-diary") ||
      hrefLower.includes("staff-class-dairy"))
  ) {
    return `${STUDENT_ACADEMICS_BASE}/student-class-dairy`;
  }

  const inStudentAcademics =
    hrefLower.includes("student-academics") ||
    hrefLower.includes("/apps/student-academics") ||
    hrefLower.includes("student-timetable") ||
    hrefLower.includes("my-subjects") ||
    hrefLower.includes("student-my-subjects") ||
    hrefLower.includes("student-class-diary") ||
    hrefLower.includes("student-class-dairy") ||
    hrefLower.includes("student-assignments") ||
    hrefLower.includes("student-my-attendance");

  if (inStudentAcademics) {
    const mapped = mapModuleTail(
      hrefRaw,
      "student-academics",
      STUDENT_ACADEMICS_BASE,
      STUDENT_ACADEMICS_SLUGS,
      "student-timetable",
    );
    if (mapped) return mapped;

    const seg = lastPathSegment(hrefLower);
    const slug =
      STUDENT_ACADEMICS_SLUGS[seg] ??
      STUDENT_ACADEMICS_SLUGS[seg.replace(/-/g, "")];
    if (slug) return `${STUDENT_ACADEMICS_BASE}/${slug}`;

    if (hrefLower.includes("student-timetable")) {
      return `${STUDENT_ACADEMICS_BASE}/student-timetable`;
    }
    if (
      hrefLower.includes("my-subjects") ||
      hrefLower.includes("student-my-subjects")
    ) {
      return `${STUDENT_ACADEMICS_BASE}/my-subjects`;
    }
    if (
      hrefLower.includes("student-class-diary") ||
      hrefLower.includes("student-class-dairy")
    ) {
      return `${STUDENT_ACADEMICS_BASE}/student-class-dairy`;
    }
    if (hrefLower.includes("student-assignments")) {
      return `${STUDENT_ACADEMICS_BASE}/student-assignments`;
    }
    if (hrefLower.includes("student-my-attendance")) {
      return `${STUDENT_ACADEMICS_BASE}/student-my-attendance`;
    }
    if (
      hrefLower.includes("special-activit") &&
      !hrefLower.includes("attendance")
    ) {
      return `${STUDENT_ACADEMICS_BASE}/special-activities`;
    }
  }

  // Label pins only when href already points at student academics / student timetable.
  if (inStudentAcademics) {
    if (labelKey.includes("mysubject") || labelKey === "subjects") {
      return `${STUDENT_ACADEMICS_BASE}/my-subjects`;
    }
    if (
      labelKey === "timetable" ||
      labelKey.includes("studenttimetable") ||
      (labelKey.includes("timetable") && !labelKey.includes("exam"))
    ) {
      return `${STUDENT_ACADEMICS_BASE}/student-timetable`;
    }
    if (
      labelKey.includes("student") &&
      (labelKey.includes("classdiary") || labelKey.includes("classdairy"))
    ) {
      return `${STUDENT_ACADEMICS_BASE}/student-class-dairy`;
    }
    if (labelKey === "assignments" || labelKey.includes("studentassignment")) {
      return `${STUDENT_ACADEMICS_BASE}/student-assignments`;
    }
    if (
      labelKey.includes("myattendance") ||
      labelKey === "studentattendance" ||
      (labelKey.includes("attendance") &&
        !labelKey.includes("management") &&
        !labelKey.includes("mark") &&
        !labelKey.includes("exam") &&
        !labelKey.includes("staff") &&
        !labelKey.includes("biometric") &&
        !labelKey.includes("specialactivit"))
    ) {
      return `${STUDENT_ACADEMICS_BASE}/student-my-attendance`;
    }
    if (
      labelKey.includes("specialactivit") &&
      !labelKey.includes("attendance")
    ) {
      return `${STUDENT_ACADEMICS_BASE}/special-activities`;
    }
  }

  return null;
}

// ── Events ───────────────────────────────────────────────────────────────────

const EVENTS_SLUGS: Record<string, string> = {
  "add-event": "add-event",
  "event-type": "event-type",
  "department-events": "department-events",
  "college-calendar": "college-calendar",
  "events-dashboard": "events-dashboard",
  "events-calendar": "events-calendar",
  "staff-events": "staff-events",
  "school-calendar": "school-calendar",
};

export function mapEventsLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key.includes("eventsdashboard") || key === "events")
    return `${EVENTS_BASE}/events-dashboard`;
  if (key.includes("addevent")) return `${EVENTS_BASE}/add-event`;
  if (key.includes("eventtype")) return `${EVENTS_BASE}/event-type`;
  if (key.includes("departmentevent"))
    return `${EVENTS_BASE}/department-events`;
  if (key.includes("collegecalendar")) return `${EVENTS_BASE}/college-calendar`;
  if (key.includes("schoolcalendar")) return `${EVENTS_BASE}/school-calendar`;
  if (key.includes("staffevent")) return `${EVENTS_BASE}/staff-events`;
  if (key.includes("eventscalendar") || key === "eventcalendar")
    return `${EVENTS_BASE}/events-calendar`;
  return null;
}

export function mapEventsNavRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefRaw = (href ?? "").trim();
  const hrefLower = hrefRaw.toLowerCase();
  const labelKey = normalizeLabelKey(label ?? "");

  // Registrar Login: sidebar "Events Calendar" is Angular student-events
  // (`event-calendar/events-calendar`), not staff-events radios or the admin hub.
  if (
    isRegistrarLogin() &&
    (labelKey.includes("eventscalendar") || labelKey === "eventcalendar") &&
    !hrefLower.includes("school-calendar") &&
    !hrefLower.includes("college-calendar") &&
    !hrefLower.includes("add-event") &&
    !hrefLower.includes("event-type") &&
    !hrefLower.includes("department-events")
  ) {
    return `${EVENTS_BASE}/events-calendar`;
  }

  // Angular `event-calendar` module (student-events / staff-events / school-calendar).
  // Must run before the generic `events` tail parse, which treats `events-calendar`
  // as `events` + `-calendar` and 404s to the dashboard.
  const fromEventCalendar = mapModuleTail(
    hrefRaw,
    "event-calendar",
    EVENTS_BASE,
    EVENTS_SLUGS,
    "events-calendar",
  );
  if (fromEventCalendar) return fromEventCalendar;

  // Prefer Angular path segments over labels. event-calendar `school-calendar`
  // is titled "College Calendar" in Angular, which would otherwise map to
  // events-and-notifications `college-calendar` (month/list view).
  if (hrefLower.includes("school-calendar"))
    return `${EVENTS_BASE}/school-calendar`;
  if (hrefLower.includes("staff-events")) return `${EVENTS_BASE}/staff-events`;
  if (hrefLower.includes("college-calendar"))
    return `${EVENTS_BASE}/college-calendar`;

  const byLabel = mapEventsLabelToRoute(label);
  if (byLabel) return byLabel;

  if (!hrefRaw || hrefRaw === "#") return null;

  if (
    hrefLower.includes("principal-communications/events") ||
    hrefLower.includes("events-calendar")
  ) {
    return `${EVENTS_BASE}/events-calendar`;
  }

  const fromEvents = mapModuleTail(
    hrefRaw,
    "events",
    EVENTS_BASE,
    EVENTS_SLUGS,
    "events-dashboard",
  );
  if (fromEvents && !fromEvents.endsWith("/events")) return fromEvents;

  if (hrefLower.includes("/events/") || hrefLower.match(/\/events$/)) {
    const idx = hrefLower.lastIndexOf("/events");
    const tail = hrefRaw
      .slice(idx + "/events".length)
      .replace(/^\/+/, "")
      .split("?")[0];
    if (!tail) return `${EVENTS_BASE}/events-dashboard`;
    const first = tail.split("/")[0]!.toLowerCase();
    const slug = EVENTS_SLUGS[first] ?? first;
    const rest = tail.split("/").slice(1).join("/");
    return rest ? `${EVENTS_BASE}/${slug}/${rest}` : `${EVENTS_BASE}/${slug}`;
  }

  const seg = lastPathSegment(hrefLower);
  const slug = EVENTS_SLUGS[seg];
  if (slug) return `${EVENTS_BASE}/${slug}`;

  return null;
}

// ── Notifications & announcements (admin) ────────────────────────────────────

const NOTIFICATIONS_SLUGS: Record<string, string> = {
  "notifications-list": "notifications-list",
  "add-notification": "add-notification",
  "employee-notifications": "employee-inbox",
  "send-notifications": "employee-inbox",
};

export function mapNotificationsAnnouncementsLabelToRoute(
  label?: string,
): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key.includes("notification") && key.includes("announcement")) {
    return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/employee-inbox`;
  }
  if (key.includes("notificationslist") || key.includes("notificationlist")) {
    return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/notifications-list`;
  }
  if (key.includes("addnotification"))
    return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/add-notification`;
  return null;
}

export function mapNotificationsAnnouncementsNavRoute(
  href?: string,
  label?: string,
): string | null {
  const byLabel = mapNotificationsAnnouncementsLabelToRoute(label);
  if (byLabel) return byLabel;

  const hrefRaw = (href ?? "").trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();

  if (
    hrefLower.includes("notifications-&-announcements") ||
    hrefLower.includes("notifications-%26-announcements") ||
    hrefLower.includes("notifications-and-announcements")
  ) {
    if (hrefLower.includes("notifications-list")) {
      return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/notifications-list`;
    }
    if (hrefLower.includes("add-notification")) {
      return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/add-notification`;
    }
    if (
      hrefLower.endsWith("notifications-&-announcements") ||
      hrefLower.endsWith("notifications-and-announcements") ||
      hrefLower.match(/notifications-&-announcements\/?$/) ||
      hrefLower.match(/notifications-and-announcements\/?$/)
    ) {
      return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/employee-inbox`;
    }
    const idx = hrefLower.indexOf("notifications-and-announcements");
    const altIdx = hrefLower.indexOf("notifications-&-announcements");
    const start = idx >= 0 ? idx : altIdx;
    if (start >= 0) {
      const tail = hrefRaw.slice(start).split("?")[0];
      return tail.startsWith("/")
        ? tail.replace(
            "notifications-&-announcements",
            "notifications-and-announcements",
          )
        : `/${tail}`;
    }
  }

  // Angular Communications → Notifications
  // `#/principal-communications/announcements` and
  // `#/principal-communications/notifications/send-notifications`
  // both load EmployeeNotificationsAndAnnouncementsModule — keep Angular URLs.
  if (
    hrefLower.includes("principal-communications/announcements") ||
    hrefLower.includes("principal-communications/notifications")
  ) {
    if (hrefLower.includes("add-notification")) {
      if (hrefLower.includes("announcements")) {
        return "/principal-communications/announcements/add-notification";
      }
      return "/principal-communications/notifications/send-notifications/add-notification";
    }
    if (hrefLower.includes("announcements")) {
      return "/principal-communications/announcements";
    }
    return "/principal-communications/notifications/send-notifications";
  }

  return null;
}

// ── My notifications (student) ─────────────────────────────────────────────

export function mapMyNotificationsLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key.includes("mynotification") || key.includes("studentnotification")) {
    return MY_NOTIFICATIONS_BASE;
  }
  return null;
}

export function mapMyNotificationsNavRoute(
  href?: string,
  label?: string,
): string | null {
  const byLabel = mapMyNotificationsLabelToRoute(label);
  if (byLabel) return byLabel;

  const hrefRaw = (href ?? "").trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();

  if (
    hrefLower.includes("student-communications/student-announcements") ||
    hrefLower.includes("student-notifications")
  ) {
    return MY_NOTIFICATIONS_BASE;
  }

  if (hrefLower.includes("my-notifications")) return MY_NOTIFICATIONS_BASE;

  return null;
}

// ── Library ──────────────────────────────────────────────────────────────────

const LIBRARY_SLUGS: Record<string, string> = {
  membership: "membership",
  "membership-barcode": "membership-barcode",
  membershipbarcode: "membership-barcode",
  books: "books",
  periodicals: "periodicals",
  periodcals: "periodicals",
  bookissue: "bookIssue",
  "book-issue": "bookIssue",
  bookreturn: "bookReturn",
  "book-return": "bookReturn",
  "library-settings": "library-settings",
  librarysettings: "library-settings",
  settings: "library-settings",
  "library-fine-collection": "library-fine-collection",
  libraryfinecollection: "library-fine-collection",
  "book-due-list": "book-due-list",
  bookduelist: "book-due-list",
  "books-due-list": "book-due-list",
  "books-search": "books-search",
  bookssearch: "books-search",
  "reserved-books": "reserved-books",
  reservedbooks: "reserved-books",
  "print-books-barcodes": "print-books-barcodes",
  printbooksbarcodes: "print-books-barcodes",
  "books-barcode": "books-barcode",
  booksbarcode: "books-barcode",
  "add-more-books": "add-more-books",
  addmorebooks: "add-more-books",
  "add-books": "add-books",
  addbooks: "add-books",
  "book-details": "book-details",
  bookdetails: "book-details",
  "library-dashboard": "library-dashboard",
  librarydashboard: "library-dashboard",
  "library-details": "library-details",
  librarydetails: "library-details",
};

export function mapLibraryLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key === "library" || key === "librarymanagement")
    return `${LIBRARY_BASE}/library-dashboard`;
  if (key.includes("membershipbarcode") || key.includes("memberbarcode")) {
    return `${LIBRARY_BASE}/membership-barcode`;
  }
  if (key.includes("membership")) return `${LIBRARY_BASE}/membership`;
  if (key.includes("printbook") && key.includes("barcode"))
    return `${LIBRARY_BASE}/print-books-barcodes`;
  if (key.includes("booksbarcode") || key.includes("bookbarcode"))
    return `${LIBRARY_BASE}/books-barcode`;
  if (key === "books" || key.includes("bookcatalogue"))
    return `${LIBRARY_BASE}/books`;
  if (key.includes("periodical")) return `${LIBRARY_BASE}/periodicals`;
  if (key.includes("bookissue")) return `${LIBRARY_BASE}/bookIssue`;
  if (key.includes("bookreturn")) return `${LIBRARY_BASE}/bookReturn`;
  if (key.includes("finecollection") || key.includes("libraryfine")) {
    return `${LIBRARY_BASE}/library-fine-collection`;
  }
  if (key.includes("bookduelist") || key.includes("booksduelist")) {
    return `${LIBRARY_BASE}/book-due-list`;
  }
  if (key.includes("bookssearch") || key.includes("booksearch")) {
    return `${LIBRARY_BASE}/books-search`;
  }
  if (key.includes("reservedbook")) return `${LIBRARY_BASE}/reserved-books`;
  if (
    key.includes("librarysetting") ||
    (key.includes("library") && key.includes("setting"))
  ) {
    return `${LIBRARY_BASE}/library-settings`;
  }
  if (key.includes("librarydetail")) return `${LIBRARY_BASE}/library-details`;
  if (key.includes("librarydashboard"))
    return `${LIBRARY_BASE}/library-dashboard`;
  return null;
}

/** Angular `knowledge-store` is mounted at `/digital-library` (not book Library). */
export const DIGITAL_LIBRARY_BASE = "/digital-library";

const DIGITAL_LIBRARY_SLUGS: Record<string, string> = {
  "manage-course-content": "manage-course-content",
  managecoursecontent: "manage-course-content",
  "upload-subject-content": "upload-subject-content",
  uploadsubjectcontent: "upload-subject-content",
  "view-course-content": "view-course-content",
  viewcoursecontent: "view-course-content",
  "upload-course-content": "upload-course-content",
  uploadcoursecontent: "upload-course-content",
  // Angular staff portal uses "Upload Program Content" label → same route
  "upload-program-content": "upload-course-content",
  uploadprogramcontent: "upload-course-content",
};

/** Paths that contain `library/` but are Digital Library / knowledge-store, not book Library. */
function isDigitalLibraryHref(hrefLower: string): boolean {
  return (
    hrefLower.includes("/digital-library/") ||
    hrefLower.includes("/digital-library") ||
    hrefLower.includes("/knowledge-store/") ||
    hrefLower.includes("/knowledge-store") ||
    hrefLower.includes("/staff-digital-library/") ||
    hrefLower.includes("/student-digital-library/") ||
    hrefLower.includes("/employee-digital-library/")
  );
}

export function mapDigitalLibraryLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key === "digitallibrary" || key === "knowledgestore") {
    return `${DIGITAL_LIBRARY_BASE}/manage-course-content`;
  }
  if (key.includes("managecoursecontent") || key.includes("managecourse")) {
    return `${DIGITAL_LIBRARY_BASE}/manage-course-content`;
  }
  if (key.includes("viewcoursecontent") || key.includes("viewcourse")) {
    return `${DIGITAL_LIBRARY_BASE}/view-course-content`;
  }
  if (
    key.includes("uploadcoursecontent") ||
    key.includes("uploadcourse") ||
    key.includes("uploadprogramcontent") ||
    key.includes("uploadprogram")
  ) {
    return `${DIGITAL_LIBRARY_BASE}/upload-course-content`;
  }
  return null;
}

export function mapDigitalLibraryNavRoute(
  href?: string,
  label?: string,
): string | null {
  const byLabel = mapDigitalLibraryLabelToRoute(label);
  if (byLabel) return byLabel;

  const hrefRaw = (href ?? "").trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();
  if (!isDigitalLibraryHref(hrefLower)) return null;

  const mapped =
    mapModuleTail(
      hrefRaw,
      "digital-library/",
      DIGITAL_LIBRARY_BASE,
      DIGITAL_LIBRARY_SLUGS,
      "manage-course-content",
    ) ??
    mapModuleTail(
      hrefRaw,
      "knowledge-store/",
      DIGITAL_LIBRARY_BASE,
      DIGITAL_LIBRARY_SLUGS,
      "manage-course-content",
    ) ??
    mapModuleTail(
      hrefRaw,
      "staff-digital-library/",
      DIGITAL_LIBRARY_BASE,
      DIGITAL_LIBRARY_SLUGS,
      "manage-course-content",
    ) ??
    mapModuleTail(
      hrefRaw,
      "student-digital-library/",
      DIGITAL_LIBRARY_BASE,
      DIGITAL_LIBRARY_SLUGS,
      "manage-course-content",
    ) ??
    mapModuleTail(
      hrefRaw,
      "employee-digital-library/",
      DIGITAL_LIBRARY_BASE,
      DIGITAL_LIBRARY_SLUGS,
      "manage-course-content",
    );
  return mapped;
}

export function mapLibraryNavRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefRaw = (href ?? "").trim();
  const hrefLower = hrefRaw.toLowerCase();
  // `/digital-library/...` contains the substring `library/` — must not remap to book Library.
  if (isDigitalLibraryHref(hrefLower)) {
    return mapDigitalLibraryNavRoute(href, label);
  }

  const byLabel = mapLibraryLabelToRoute(label);
  if (byLabel) return byLabel;

  if (!hrefRaw || hrefRaw === "#") return null;

  const mapped = mapModuleTail(
    hrefRaw,
    "library/",
    LIBRARY_BASE,
    LIBRARY_SLUGS,
    "library-dashboard",
  );
  if (mapped) return mapped;

  if (hrefLower.includes("/library/") || hrefLower.includes("/apps/library/")) {
    const idx = Math.max(
      hrefLower.indexOf("/library/"),
      hrefLower.indexOf("/apps/library/"),
    );
    const segment = hrefLower.includes("/apps/library/")
      ? "/apps/library/"
      : "/library/";
    const tail = hrefRaw
      .slice(idx + segment.length)
      .split("?")[0]
      .replace(/^\/+/, "");
    if (!tail) return `${LIBRARY_BASE}/library-dashboard`;
    const first = tail.split("/")[0]!.toLowerCase();
    const slug =
      LIBRARY_SLUGS[first] ?? LIBRARY_SLUGS[first.replace(/-/g, "")] ?? first;
    const rest = tail.split("/").slice(1).join("/");
    return rest ? `${LIBRARY_BASE}/${slug}/${rest}` : `${LIBRARY_BASE}/${slug}`;
  }

  return null;
}

export function isLibraryModuleLabel(label?: string): boolean {
  if (!label) return false;
  const key = normalizeLabelKey(label);
  // Exclude Digital Library / knowledge-store from book Library module matching.
  if (
    key.includes("digital") ||
    key.includes("knowledge") ||
    key.includes("fee")
  ) {
    return false;
  }
  return key === "library" || key.includes("library");
}

/** Unified mapper for normalizePageHref / NavItem forced routes. */
export function mapErpModuleNavRoute(
  href?: string,
  label?: string,
): string | null {
  const institutional = mapAdminInstitutionalRoomRoute(href, label);
  if (institutional) return institutional;

  if (isStaffWorkloadAdjustmentNav(href, label)) {
    return STAFF_WORKLOAD_ADJUSTMENT_ROUTE;
  }

  if (isSetProxyNav(href, label)) {
    return SET_PROXY_ROUTE;
  }

  if (isSalarySlipsNav(href, label)) {
    return SALARY_SLIPS_ROUTE;
  }

  // Staff/Student Class Diary labels (and student portal bare Class Diary /
  // Assignments) → student academics pages.
  const labelKey = normalizeLabelKey(label ?? "");
  if (
    labelKey === "staffclassdiary" ||
    labelKey === "staffclassdairy" ||
    labelKey === "studentclassdiary" ||
    labelKey === "studentclassdairy" ||
    (labelKey.includes("staff") &&
      (labelKey.includes("classdiary") || labelKey.includes("classdairy"))) ||
    ((labelKey === "classdiary" || labelKey === "classdairy") &&
      isStudentPortalViewer())
  ) {
    return `${STUDENT_ACADEMICS_BASE}/student-class-dairy`;
  }
  if (
    (labelKey === "assignments" || labelKey === "assignment") &&
    isStudentPortalViewer()
  ) {
    return `${STUDENT_ACADEMICS_BASE}/student-assignments`;
  }

  return (
    mapStaffClassesNavRoute(href, label) ??
    mapStudentAcademicsNavRoute(href, label) ??
    mapAttendanceNavRoute(href, label) ??
    mapMentorshipNavRoute(href, label) ??
    mapEventsNavRoute(href, label) ??
    mapNotificationsAnnouncementsNavRoute(href, label) ??
    mapMyNotificationsNavRoute(href, label) ??
    mapDigitalLibraryNavRoute(href, label) ??
    mapLibraryNavRoute(href, label) ??
    mapHostelNavRoute(href, label) ??
    mapMirroredModuleNavRoute(href, label) ??
    mapStaffClassesLabelToRoute(label) ??
    mapAttendanceLabelToRoute(label) ??
    mapMentorshipLabelToRoute(label) ??
    mapEventsLabelToRoute(label) ??
    mapNotificationsAnnouncementsLabelToRoute(label) ??
    mapMyNotificationsLabelToRoute(label) ??
    mapDigitalLibraryLabelToRoute(label) ??
    mapLibraryLabelToRoute(label) ??
    mapMirroredModuleLabelToRoute(label)
  );
}

export function mapErpModuleLabelToRoute(label?: string): string | null {
  if (isStaffWorkloadAdjustmentNav(undefined, label)) {
    return STAFF_WORKLOAD_ADJUSTMENT_ROUTE;
  }
  return (
    mapStaffClassesLabelToRoute(label) ??
    mapAttendanceLabelToRoute(label) ??
    mapMentorshipLabelToRoute(label) ??
    mapEventsLabelToRoute(label) ??
    mapNotificationsAnnouncementsLabelToRoute(label) ??
    mapMyNotificationsLabelToRoute(label) ??
    mapMirroredModuleLabelToRoute(label)
  );
}

export function isAttendanceModuleLabel(label?: string): boolean {
  if (!label) return false;
  const key = normalizeLabelKey(label);
  return key.includes("attendance") && key.includes("management");
}

export function isMentorshipModuleLabel(label?: string): boolean {
  if (!label) return false;
  const key = normalizeLabelKey(label);
  return key.includes("mentorship") || key.includes("counseling");
}

export function isEventsModuleLabel(label?: string): boolean {
  if (!label) return false;
  const key = normalizeLabelKey(label);
  return key === "events" || key.includes("eventmanagement");
}

export function isNotificationsAnnouncementsModuleLabel(
  label?: string,
): boolean {
  if (!label) return false;
  const key = normalizeLabelKey(label);
  return (
    key.includes("notification") &&
    key.includes("announcement") &&
    !key.includes("my")
  );
}

export function isMyNotificationsModuleLabel(label?: string): boolean {
  if (!label) return false;
  const key = normalizeLabelKey(label);
  return (
    key.includes("mynotification") ||
    (key.includes("my") && key.includes("notification"))
  );
}

/** No-op merge helper — reserved for future sidebar fallbacks. */
export function ensureErpModuleNavChildren(items: NavItem[]): NavItem[] {
  return items;
}

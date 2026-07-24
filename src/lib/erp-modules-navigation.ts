import type { NavItem } from "@/types/navigation";
import {
  mapMirroredModuleLabelToRoute,
  mapMirroredModuleNavRoute,
} from "@/lib/erp-module-mirror/navigation";
import {
  mapModuleTail,
  normalizeLabelKey,
} from "./erp-modules-navigation-utils";
import { mapAdminInstitutionalRoomRoute } from "@/lib/admin-institutional-navigation";
import { mapHostelNavRoute } from "./hostel-navigation";

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

export function mapAttendanceLabelToRoute(label?: string): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);
  if (key.includes("attendancemanagement") || key === "attendancemanagement") {
    return `${ATTENDANCE_MGMT_BASE}/attendance-dashboard`;
  }
  if (key.includes("studentattendance") && !key.includes("view")) {
    return `${ATTENDANCE_MGMT_BASE}/student-attendance`;
  }
  if (key.includes("viewstudent") && key.includes("attendance")) {
    return `${ATTENDANCE_MGMT_BASE}/view-student-attendance`;
  }
  if (key.includes("viewsubject") && key.includes("attendance")) {
    return `${ATTENDANCE_MGMT_BASE}/view-subject-attendance`;
  }
  if (key.includes("workload") && key.includes("adjust")) {
    return `/staff-faculty-leaves/workload-adjustment`;
  }
  if (key.includes("staff") && key.includes("notmarked")) {
    return `${ATTENDANCE_MGMT_BASE}/staff-attendance-not-markedlist`;
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
  if (key.includes("eventscalendar")) return `${EVENTS_BASE}/events-calendar`;
  return null;
}

export function mapEventsNavRoute(
  href?: string,
  label?: string,
): string | null {
  const byLabel = mapEventsLabelToRoute(label);
  if (byLabel) return byLabel;

  const hrefRaw = (href ?? "").trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();

  if (
    hrefLower.includes("principal-communications/events") ||
    hrefLower.includes("events-calendar")
  ) {
    if (hrefLower.includes("school-calendar"))
      return `${EVENTS_BASE}/school-calendar`;
    if (hrefLower.includes("staff-events"))
      return `${EVENTS_BASE}/staff-events`;
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

  if (hrefLower.includes("principal-communications/notifications")) {
    return `${NOTIFICATIONS_ANNOUNCEMENTS_BASE}/employee-inbox`;
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

export function mapLibraryNavRoute(
  href?: string,
  label?: string,
): string | null {
  const byLabel = mapLibraryLabelToRoute(label);
  if (byLabel) return byLabel;

  const hrefRaw = (href ?? "").trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();

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
  return key === "library" || (key.includes("library") && !key.includes("fee"));
}

/** Unified mapper for normalizePageHref / NavItem forced routes. */
export function mapErpModuleNavRoute(
  href?: string,
  label?: string,
): string | null {
  const institutional = mapAdminInstitutionalRoomRoute(href, label);
  if (institutional) return institutional;

  return (
    mapAttendanceNavRoute(href, label) ??
    mapMentorshipNavRoute(href, label) ??
    mapEventsNavRoute(href, label) ??
    mapNotificationsAnnouncementsNavRoute(href, label) ??
    mapMyNotificationsNavRoute(href, label) ??
    mapLibraryNavRoute(href, label) ??
    mapHostelNavRoute(href, label) ??
    mapMirroredModuleNavRoute(href, label) ??
    mapAttendanceLabelToRoute(label) ??
    mapMentorshipLabelToRoute(label) ??
    mapEventsLabelToRoute(label) ??
    mapNotificationsAnnouncementsLabelToRoute(label) ??
    mapMyNotificationsLabelToRoute(label) ??
    mapLibraryLabelToRoute(label) ??
    mapMirroredModuleLabelToRoute(label)
  );
}

export function mapErpModuleLabelToRoute(label?: string): string | null {
  return (
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

"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import type { BreadcrumbItem } from "./Breadcrumb";
import { useBreadcrumbStore } from "@/store/breadcrumb-store";
import { useNavigationStore } from "@/store/navigation-store";
import { useSessionContext } from "@/context/SessionContext";
import { findNavBreadcrumbItems, findNavPageLabel } from "@/lib/navigation";

/**
 * Converts a URL path segment into a human-readable label.
 *
 * Examples:
 *   'admin-examination-management' → 'Admin Examination Management'
 *   'dashboard'                    → 'Dashboard'
 */
function segmentToLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function adminSubmoduleLabel(pathname: string): string {
  const normalized = pathname.toLowerCase();
  const academicSettingsPrefixes = [
    "/admin/courses",
    "/admin/course-groups",
    "/admin/course-years",
    "/admin/group-sections",
  ];
  const isAcademicSettings = academicSettingsPrefixes.some((prefix) =>
    normalized.startsWith(prefix),
  );
  return isAcademicSettings ? "Academic Settings" : "Master Settings";
}

/** Angular Admin crumbs are Home → Admin → Page (no Master Settings / Organization middle tiers). */
const ADMIN_DIRECT_LEAF_PATHS = [
  "/admin/colleges",
  "/admin/campus",
  "/admin/organizations",
  "/admin/university",
  "/admin/universities",
];

function simplifyAdminDirectLeafBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const isDirectLeaf = ADMIN_DIRECT_LEAF_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`),
  );
  if (!isDirectLeaf || items.length < 2) return items;

  const home =
    items[0]?.label.toLowerCase() === "home"
      ? items[0]
      : { label: "Home", href: "/dashboard" };
  const last = items[items.length - 1];
  const pageLabel =
    last?.label ?? segmentToLabel(normalized.split("/").pop() ?? "Page");

  return [home, { label: "Admin", href: "/admin" }, { label: pageLabel }];
}

/**
 * Exam report pages live under the Reports → Examination Reports menu even
 * though their App Router path is `/admin-examination-management/exam-reports/...`.
 */
function examReportsModuleBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const match = pathname.match(
    /^\/admin-examination-management\/exam-reports\/([^/]+)\/?$/i,
  );
  if (!match) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyUnderReports =
    labels.some((l) => l === "reports" || l === "report") &&
    labels.some(
      (l) =>
        l.includes("examination report") ||
        l === "exam reports" ||
        l.includes("exam report"),
    );
  if (alreadyUnderReports) return items;

  const pageLabel = items[items.length - 1]?.label ?? segmentToLabel(match[1]);

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Examination Reports" },
    { label: pageLabel },
  ];
}

/**
 * Fee report pages live under Reports → Fee Reports in the menu even though
 * App Router paths are under `/accounts-and-fees/fee-reports/…`.
 * Breadcrumb: Reports > Fee Reports > {page}.
 *
 * Exception — Angular Student Fee Report (drilldown-summary-report):
 * Home > Accounts and Fees > Fee Reports > Student Fee Report
 */
function feeReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";

  if (
    /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/drilldown-summary-report$/i.test(
      path,
    )
  ) {
    const labels = items.map((i) => i.label.toLowerCase());
    const alreadyCorrect =
      labels.some((l) => l === "accounts and fees") &&
      labels.some((l) => l === "fee reports") &&
      labels.some((l) => l === "student fee report");
    if (alreadyCorrect) return items;
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Reports" },
      { label: "Student Fee Report" },
    ];
  }

  const leaf =
    /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/daywise-fee-report$/i.test(
      path,
    )
      ? "Day Wise Receipts"
      : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/due-list$/i.test(
            path,
          )
        ? "Due List"
        : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/fee-ledger$/i.test(
              path,
            )
          ? "Fee Ledger"
          : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/bus-fee-collections$/i.test(
                path,
              )
            ? "Bus Fee Report"
            : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/mgt-fee-collections$/i.test(
                  path,
                )
              ? "Management Fee Reports"
              : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/library-fee-collections$/i.test(
                    path,
                  )
                ? "Library Fee Report"
                : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/scholarship-due-list$/i.test(
                      path,
                    )
                  ? "Scholarship Report"
                  : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/scholarship-detailed-report$/i.test(
                        path,
                      )
                    ? "Scholarship Detailed Report"
                    : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/daywise-online-fee-payments$/i.test(
                          path,
                        )
                      ? "Day Wise Online Fee Payment Reports"
                      : /\/(?:accounts-and-fees\/fee-reports|reports\/admin-fee-reports)\/exam-fee-due-list$/i.test(
                            path,
                          )
                        ? "Exam Registration Due List"
                        : null;

  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "fee reports") &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Fee Reports" },
    { label: leaf },
  ];
}

/**
 * Student report pages under Reports → Student Reports.
 * URL folder is `admin-student-reports` / `student-admission-reports` — never show
 * that raw segment; Angular menu crumb is "Student Reports".
 */
function studentReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const base =
    /\/reports\/(?:admin-student-reports|student-admission-reports)\//i;

  const leaf =
    /\/reports\/(?:admin-student-reports|student-admission-reports)\/day-wise-admission-report$/i.test(
      path,
    )
      ? "Admission Report"
      : /\/reports\/(?:admin-student-reports|student-admission-reports)\/student-application-report$/i.test(
            path,
          )
        ? "Day Wise Application Report"
        : /\/reports\/(?:admin-student-reports|student-admission-reports)\/students-gender-count$/i.test(
              path,
            )
          ? "Student Count By Gender Report"
          : /\/reports\/(?:admin-student-reports|student-admission-reports)\/branch-and-academicyear-wise-caste-count$/i.test(
                path,
              )
            ? "Student Count By Caste Report"
            : /\/reports\/(?:admin-student-reports|student-admission-reports)\/students-list-report$/i.test(
                  path,
                )
              ? "Student Details Report"
              : /\/reports\/(?:admin-student-reports|student-admission-reports)\/sem-list-report$/i.test(
                    path,
                  )
                ? "Semister wise Students Report"
                : /\/reports\/(?:admin-student-reports|student-admission-reports)\/lateral-students-report$/i.test(
                      path,
                    )
                  ? "Lateral Students Report"
                  : /\/reports\/(?:admin-student-reports|student-admission-reports)\/student-contact-report$/i.test(
                        path,
                      )
                    ? "Student Contact Report"
                    : /\/reports\/(?:admin-student-reports|student-admission-reports)\/student-detained-list$/i.test(
                          path,
                        )
                      ? "Students Detained List Report"
                      : /\/reports\/(?:admin-student-reports|student-admission-reports)\/students-rejoined-list$/i.test(
                            path,
                          )
                        ? "Student Rejoin Lists Report"
                        : /\/reports\/(?:admin-student-reports|student-admission-reports)\/branch-academicyear-wise-student-count$/i.test(
                              path,
                            )
                          ? "Student Count Report"
                          : /\/reports\/(?:admin-student-reports|student-admission-reports)\/admission-quota-wise-student-count-report$/i.test(
                                path,
                              )
                            ? "Student Count By Quota Report"
                            : /\/reports\/(?:admin-student-reports|student-admission-reports)\/student-caste-wise-gender-count(?:-report)?$/i.test(
                                  path,
                                )
                              ? "Student Caste Wise Gender Count Report"
                              : /\/reports\/(?:admin-student-reports|student-admission-reports)\/enquir(?:ies|ers)-report$/i.test(
                                    path,
                                  )
                                ? "Enquirers Report"
                                : /\/reports\/(?:admin-student-reports|student-admission-reports)\/student-academic-history-report$/i.test(
                                      path,
                                    )
                                  ? "Student Academic History Report"
                                  : /\/reports\/(?:admin-student-reports|student-admission-reports)\/students-lab-batches-report$/i.test(
                                        path,
                                      )
                                    ? "Students Lab Batches Report"
                                    : /\/reports\/(?:admin-student-reports|student-admission-reports)\/student-electives?-report$/i.test(
                                          path,
                                        )
                                      ? "Student Elective Report"
                                      : /\/reports\/(?:admin-student-reports|student-admission-reports)\/class-syllabus-status-report$/i.test(
                                            path,
                                          )
                                        ? "Class Syllabus Report"
                                        : /\/reports\/(?:admin-student-reports|student-admission-reports)\/subject-wise-syllabus-report$/i.test(
                                              path,
                                            )
                                          ? "Subject Wise Syllabus Report"
                                          : /\/reports\/(?:admin-student-reports|student-admission-reports)\/daily-sms[-]?communication-detail-report$/i.test(
                                                path,
                                              )
                                            ? "Daily SMS Detail Report"
                                            : /\/reports\/(?:admin-student-reports|student-admission-reports)\/(?:studentcount-drilldown-report|student-drilldown-report)$/i.test(
                                                  path,
                                                )
                                              ? "Student Count Report"
                                              : null;

  if (!leaf || !base.test(path)) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "student reports" || l === "student report") &&
    !labels.some((l) => l.includes("admin student")) &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Student Reports" },
    { label: leaf },
  ];
}

/**
 * Attendance report pages under Reports → Attendance Reports.
 * URL folder may be `admin-attendance-reports` or `student-attendance-reports`.
 */
function attendanceReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const base =
    /\/reports\/(?:admin-attendance-reports|student-attendance-reports)\//i;
  if (!base.test(path)) return items;

  const leaf = /\/mentor-fortnight-report$/i.test(path)
    ? "Mentor Fortnight Report"
    : /\/counselor-activity-report$/i.test(path)
      ? "Counselor Activity Report"
      : /\/employee-attendance-summary-report$/i.test(path)
        ? "Employee Attendance Summary Report"
        : /\/employee-attendance-report$/i.test(path)
          ? "Employee Attendance Report"
          : /\/subject-wise-faculty-attendance-report$/i.test(path)
            ? "Subject Wise College Attendance Report"
            : /\/faculty-subjects-attendance-report$/i.test(path)
              ? "Faculty Subjects Attendance Report"
              : /\/class-student-wise-ptm-report$/i.test(path)
                ? "Student Wise PTM Report"
                : /\/(?:day-wise-attendance-count-report|student-attendance-count-report)$/i.test(
                      path,
                    )
                  ? "Day-wise Students Attendance Summary Report"
                  : /\/course-wise-students-attendance-report$/i.test(path)
                    ? "Course-Wise Students Attendance Report"
                    : /\/parent-teacher-meeting-report$/i.test(path)
                      ? "Parent Teacher Meeting"
                      : null;

  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some(
      (l) => l === "attendance reports" || l === "student attendance reports",
    ) &&
    !labels.some((l) => l.includes("admin attendance")) &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Student Attendance Reports" },
    { label: leaf },
  ];
}

/**
 * Timetable Reports breadcrumb under Reports → Timetable Reports.
 */
function timetableReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const isStaffReports = path.startsWith(
    "/staff-reports/admin-timetable-reports/",
  );
  const reportsRoot = isStaffReports
    ? "/staff-reports/admin-timetable-reports"
    : "/reports/admin-timetable-reports";
  const leafBySlug: Record<string, string> = {
    "dialy-timetable-report": "Daily Timetable Report",
    "weekly-timetable-report": "Weekly Timetable Report",
    "daily-statistical-report": "Daily Attendance Statistical Report",
    "semester-wise-timetable-report": "Semester Wise Timetable Report",
    "department-wise-timetable-report": "Department Wise Timetable Report",
    "master-timetable-report": "Master Timetable Report",
    "staff-timetable-report": "Staff Timetable Report",
    "staff-workload-report": "Staff Workload Report",
    "staff-proxy-report": "Staff Proxy Report",
    "cca-activity-report": "CCA Activity Report",
  };
  const slug = path.startsWith(`${reportsRoot}/`)
    ? path.slice(reportsRoot.length + 1)
    : "";
  const leaf = leafBySlug[slug];
  if (!leaf) return items;

  const rootLabel = isStaffReports ? "Staff Reports" : "Reports";
  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === rootLabel.toLowerCase()) &&
    labels.some(
      (l) => l === "timetable reports" || l === "time table reports",
    ) &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: rootLabel },
    { label: "Timetable Reports" },
    { label: leaf },
  ];
}

/**
 * Library Reports breadcrumb under Reports → Library Reports.
 */
function libraryReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const leafByPath: Record<string, string> = {
    "/reports/admin-library-reports/book-issue-report": "Book Issue Report",
    "/reports/admin-library-reports/book-return-report":
      "Day Wise Book Return Report",
    "/reports/admin-library-reports/library-fine-collection-report":
      "Day Wise Library Fine Collection",
    "/reports/admin-library-reports/total-titles-report": "Titles Report",
    "/reports/admin-library-reports/book-count-course-author-report":
      "Book Count by Course/Author Report",
    "/reports/admin-library-reports/book-wise-report": "Book Wise Count",
    "/reports/admin-library-reports/total-books-report": "Total Books Reports",
    "/reports/admin-library-reports/library-consolidated-report":
      "Library Books Report",
    "/reports/admin-library-reports/book-search-report": "Book Search Report",
    "/reports/admin-library-reports/periodical-reports": "Periodical Reports",
  };
  const leaf = leafByPath[path];
  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "library reports") &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Library Reports" },
    { label: leaf },
  ];
}

/**
 * Transport Reports breadcrumb under Reports → Transport Reports.
 */
function transportReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const leafByPath: Record<string, string> = {
    "/reports/admin-transport-reports/vehicle-details-report":
      "Vehicle Details Report",
    "/reports/admin-transport-reports/driver-details-report":
      "Driver Details Report",
    "/reports/admin-transport-reports/route-details-report":
      "Route Details Report",
    "/reports/admin-transport-reports/student-transport-details-cls-sc-report":
      "Transport Details By Class/Sec Report",
    "/reports/admin-transport-reports/route-wise-students-details-month":
      "Route-Wise Students Details By Month",
  };
  const leaf = leafByPath[path];
  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "transport reports") &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Transport Reports" },
    { label: leaf },
  ];
}

/**
 * HR Reports breadcrumb under Reports → HR Reports.
 */
function hrReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const leafByPath: Record<string, string> = {
    "/reports/admin-hr-reports/employee-list-by-campus-report":
      "Employee List By Campus",
    "/reports/admin-hr-reports/employee-detail-report":
      "Employee Detail Report",
  };
  const leaf = leafByPath[path];
  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "hr reports") &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "HR Reports" },
    { label: leaf },
  ];
}

/**
 * Management Reports breadcrumb under Reports → Management Reports.
 */
function managementReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const leafByPath: Record<string, string> = {
    "/reports/management-reports/inventory-stock-report":
      "Inventory Stock Report",
  };
  const leaf = leafByPath[path];
  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "management reports") &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Management Reports" },
    { label: leaf },
  ];
}

/**
 * Finance Reports breadcrumb under Reports → Finance Reports.
 */
function financeReportsMenuBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const leafByPath: Record<string, string> = {
    "/reports/admin-finance-reports/day-wise-expenses": "Day-Wise Expenses",
  };
  const leaf = leafByPath[path];
  if (!leaf) return items;

  const labels = items.map((i) => i.label.toLowerCase());
  const alreadyCorrect =
    labels.some((l) => l === "reports") &&
    labels.some((l) => l === "finance reports") &&
    labels.some((l) => l === leaf.toLowerCase());
  if (alreadyCorrect) return items;

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Reports" },
    { label: "Finance Reports" },
    { label: leaf },
  ];
}

/** Angular Report Catalog (`report-catalyst`). */
function reportCatalogBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (!/\/report-catalyst$/i.test(path)) return items;
  return [{ label: "Home", href: "/dashboard" }, { label: "Report Catalog" }];
}

const FEE_PAYMENT_HREF =
  "/accounts-and-fees/fees-collection/payment/fee-payment";
const FEE_RECEIPTS_HREF = "/accounts-and-fees/fees-collection/fee-receipts";

/**
 * Angular Accounts & Fees payment crumbs omit the raw `/payment` URL folder
 * and use explicit Fee Payment / Fee-Receipt labels.
 *
 * - Fee Payment: Home → Accounts and Fees → Fees Collection → Fee Payment
 * - Pay Fees: Home → Accounts and Fees → Fees Collection → Fee Payment
 * - Print receipt: Home → Accounts and Fees → Fee Payment → Fee-Receipt
 * - Fee Receipts: Home → Accounts and Fees → Fee Collection → Fee Receipts
 */
function accountsFeesPaymentBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";

  if (
    /\/accounts-and-fees\/fees-collection\/fee-receipts\/print-reciept$/i.test(
      path,
    )
  ) {
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Collection", href: FEE_RECEIPTS_HREF },
      { label: "Fee-Receipt" },
    ];
  }

  if (/\/accounts-and-fees\/fees-collection\/fee-receipts$/i.test(path)) {
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Collection" },
      { label: "Fee Receipts" },
    ];
  }

  if (
    /\/accounts-and-fees\/fees-collection\/payment\/pay-fees\/print-fee-receipt$/i.test(
      path,
    )
  ) {
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Payment", href: FEE_PAYMENT_HREF },
      { label: "Fee-Receipt" },
    ];
  }

  if (
    /\/accounts-and-fees\/fees-collection\/payment\/student-fee-collection$/i.test(
      path,
    )
  ) {
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Collection" },
      { label: "Student Fee Collection" },
    ];
  }

  if (
    /\/accounts-and-fees\/fees-collection\/payment\/pay-fees$/i.test(path) ||
    /\/accounts-and-fees\/fees-collection\/payment\/fee-payment$/i.test(path)
  ) {
    // Drop the intermediate "Payment" segment from URL/nav chain.
    const home =
      items[0]?.label.toLowerCase() === "home"
        ? items[0]
        : { label: "Home", href: "/dashboard" };

    const accounts =
      items.find((i) => /accounts?\s*and\s*fees/i.test(i.label)) ??
      items.find((i) => /accounts/i.test(i.label));
    const collection =
      items.find((i) => /fee[s]?\s*collection/i.test(i.label)) ??
      items.find((i) => /collection/i.test(i.label));

    return [
      home,
      {
        label: accounts?.label ?? "Accounts and Fees",
        href: accounts?.href,
      },
      {
        label: collection?.label ?? "Fees Collection",
        href: collection?.href ?? "/accounts-and-fees/fees-collection",
      },
      { label: "Fee Payment" },
    ];
  }

  // Angular: Home → Accounts and Fees → Fee Collection → Bus Fee Payment
  if (
    /\/accounts-and-fees\/fees-collection\/bus-payment\/(bus-fee-payment|bus-fee)$/i.test(
      path,
    )
  ) {
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Collection" },
      { label: "Bus Fee Payment" },
    ];
  }

  // Angular: Home → Accounts and Fees → Fee Collection → Library Fee Payment
  if (
    /\/accounts-and-fees\/fees-collection\/library-payment\/(library-fee-payment|library-fee)$/i.test(
      path,
    )
  ) {
    return [
      { label: "Home", href: "/dashboard" },
      { label: "Accounts and Fees" },
      { label: "Fee Collection" },
      { label: "Library Fee Payment" },
    ];
  }

  return items;
}

/**
 * Assign Regulation to Students lives under Academics in the sidebar (not under a
 * Subject Mapping parent). URL still contains `/subject-mapping/` — omit that
 * middle crumb: Home → Academics → Assign Regulation To Students.
 */
function assignRegulationToStudentsBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (
    !/\/academics\/subject-mapping\/assign-regulation-to-students$/i.test(path)
  ) {
    return items;
  }

  return items.filter((item) => !/subject\s*mapping/i.test(item.label));
}

function hostelRoomsBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (!/^\/hostel\/rooms$/i.test(path)) {
    return items;
  }

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Hostel", href: "/hostel/hostel-details" },
    { label: "Hostel", href: "/hostel/hostel-details" },
    { label: "Hostel Rooms" },
  ];
}

/**
 * Angular exam-scan-profile/profile-details crumbs:
 * Home → Examination Management → Exam Papers Delivery Process → Profile Details → Edit/Add Scan Profile Details
 */
function examScanProfileDetailsBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (
    !/\/admin-examination-management\/exam-papers-delivery-process\/exam-scan-profile\/profile-details$/i.test(
      path,
    )
  ) {
    return items;
  }

  const lastLabel =
    items[items.length - 1]?.label ?? "Edit Scan Profile Details";

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Examination Management" },
    {
      label: "Exam Papers Delivery Process",
      href: "/admin-examination-management/exam-papers-delivery-process",
    },
    {
      label: "Profile Details",
      href: "/admin-examination-management/exam-papers-delivery-process/exam-scan-profile",
    },
    { label: lastLabel },
  ];
}

/**
 * Angular unit-topic bulk uploads:
 * Home → Admin → Bulk Uploads → Unit Topic Bulk Upload
 * (both `subject-unit-topic-upload` and `unit-topic-bulk-upload`)
 */
function unitTopicBulkUploadBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (
    !/^\/admin\/bulk-uploads\/(subject-unit-topic-upload|unit-topic-bulk-upload)$/i.test(
      path,
    )
  ) {
    return items;
  }

  return [
    { label: "Home", href: "/dashboard" },
    { label: "Admin", href: "/admin" },
    { label: "Bulk Uploads" },
    { label: "Unit Topic Bulk Upload" },
  ];
}

/**
 * Angular staff-classes breadcrumb parity (exact trails from Angular UI):
 *   My Classes        → Home → My Classes
 *   My Timetable      → Home → My Timetable
 *   Assignments       → Home → Classes → Assignments
 *   Class Diary       → Home → Class Diary
 *   Attendance Update → Home → Academics → Attendance Management
 *
 * App Router paths use `/staff-classes/...` (and attendance-update remaps to
 * `/attendance-management/mark-attendance`), so URL/nav fallbacks must not
 * invent "Staff Classes" / "Mark Attendance" crumbs.
 */
const STAFF_ACADEMICS_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  "/staff-classes/my-classes": [{ label: "My Classes" }],
  "/staff-classes/my-timetable": [{ label: "My Timetable" }],
  "/staff-classes/assignments": [
    { label: "Classes" },
    { label: "Assignments" },
  ],
  "/student-academics/student-assignments": [
    { label: "Academics" },
    { label: "Assignments" },
  ],
  "/staff-classes/class-dairy": [{ label: "Class Diary" }],
  "/student-academics/student-class-dairy": [
    { label: "Academics" },
    { label: "Class Diary" },
  ],
  "/staff-classes/attendance-update": [
    { label: "Academics" },
    { label: "Attendance Management" },
  ],
  // Angular staff-classes/attendance-update → App Router remap
  "/attendance-management/mark-attendance": [
    { label: "Academics" },
    { label: "Attendance Management" },
  ],
};

const STAFF_ACADEMICS_NESTED: {
  prefix: string;
  parentCrumbs: BreadcrumbItem[];
  leaves: Record<string, string>;
}[] = [
  {
    prefix: "/staff-classes/my-classes/",
    parentCrumbs: [{ label: "My Classes", href: "/staff-classes/my-classes" }],
    leaves: {
      "students-list": "Students List",
      "course-year-subjects": "Course Year Subjects",
      "course-year-timetable": "Course Year Timetable",
      "mark-attendance": "Mark Attendance",
      "View-attendance": "View Attendance",
      "view-attendance": "View Attendance",
    },
  },
  {
    prefix: "/staff-classes/class-dairy/",
    parentCrumbs: [
      { label: "Class Diary", href: "/staff-classes/class-dairy" },
    ],
    leaves: {
      "add-notes": "Add Class Notes",
      "edit-notes": "Edit Class Notes",
    },
  },
  {
    prefix: "/staff-classes/assignments/",
    parentCrumbs: [
      { label: "Classes" },
      { label: "Assignments", href: "/staff-classes/assignments" },
    ],
    leaves: {
      "view-submissions": "View Submissions",
    },
  },
  {
    prefix: "/attendance-management/mark-attendance/",
    parentCrumbs: [
      { label: "Academics" },
      {
        label: "Attendance Management",
        href: "/attendance-management/mark-attendance",
      },
    ],
    leaves: {
      "mark-attendance": "Update Attendance",
      "view-attendance": "View Attendance",
    },
  },
];

function staffAcademicsBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const home =
    items[0]?.label.toLowerCase() === "home"
      ? items[0]
      : { label: "Home", href: "/dashboard" };

  const leafTrail = STAFF_ACADEMICS_BREADCRUMBS[path];
  if (leafTrail) {
    return [home, ...leafTrail];
  }

  for (const nest of STAFF_ACADEMICS_NESTED) {
    if (!path.startsWith(nest.prefix)) continue;
    const rest = path.slice(nest.prefix.length);
    const leafKey = Object.keys(nest.leaves).find(
      (key) => rest === key || rest.startsWith(`${key}/`),
    );
    const nestedLabel =
      (leafKey ? nest.leaves[leafKey] : undefined) ??
      segmentToLabel(rest.split("/")[0] ?? rest);
    return [home, ...nest.parentCrumbs, { label: nestedLabel }];
  }

  // Other /staff-classes/* paths: drop raw "Staff Classes" folder crumb and
  // fix Angular URL typo "Class Dairy" → "Class Diary".
  if (!path.startsWith("/staff-classes/")) return items;

  return items
    .filter((item, index) => {
      if (index === 0) return true;
      return !/^staff\s*classes$/i.test(item.label);
    })
    .map((item) =>
      /^class\s*dairy$/i.test(item.label)
        ? { ...item, label: "Class Diary" }
        : item,
    );
}

/**
 * Angular `principal-my-approvals/leave-application` breadcrumb:
 *   Home → Leave Management → Leave Requests
 */
function leaveRequestsBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path !== "/principal-my-approvals/leave-applications") return items;

  const home =
    items[0]?.label.toLowerCase() === "home"
      ? items[0]
      : { label: "Home", href: "/dashboard" };

  return [home, { label: "Leave Management" }, { label: "Leave Requests" }];
}

/**
 * Angular emp-notifications breadcrumb:
 *   Home → Communication → Notifications
 * Routes: `#/principal-communications/announcements` and
 * `#/principal-communications/notifications/send-notifications`
 */
function principalCommunicationsNotificationsBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const isList =
    path === "/principal-communications/announcements" ||
    path === "/principal-communications/notifications/send-notifications" ||
    path === "/principal-communications/notifications";
  const isAdd =
    path === "/principal-communications/announcements/add-notification" ||
    path.endsWith(
      "/principal-communications/notifications/send-notifications/add-notification",
    ) ||
    (path.startsWith("/principal-communications/notifications/") &&
      path.endsWith("/add-notification"));

  if (!isList && !isAdd) return items;

  const home =
    items[0]?.label.toLowerCase() === "home"
      ? items[0]
      : { label: "Home", href: "/dashboard" };

  if (isAdd) {
    return [
      home,
      { label: "Communication" },
      {
        label: "Notifications",
        href: path.includes("announcements")
          ? "/principal-communications/announcements"
          : "/principal-communications/notifications/send-notifications",
      },
      { label: "Send Notification" },
    ];
  }

  return [home, { label: "Communication" }, { label: "Notifications" }];
}

/**
 * Angular principal-communications email breadcrumb:
 *   Home → Communications → Send Email
 * Routes: `#/principal-communications/email/send-emails` and
 * `/email-sms/principal-to-dept-email`
 */
function principalCommunicationsSendEmailBreadcrumb(
  pathname: string,
  items: BreadcrumbItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/$/, "") || "/";
  const isSendEmail =
    path === "/principal-communications/email/send-emails" ||
    path === "/principal-communications/email" ||
    path === "/email-sms/principal-to-dept-email";

  if (!isSendEmail) return items;

  const home =
    items[0]?.label.toLowerCase() === "home"
      ? items[0]
      : { label: "Home", href: "/dashboard" };

  return [home, { label: "Communications" }, { label: "Send Email" }];
}

/**
 * Builds breadcrumb items from the current Next.js pathname.
 *
 * When `customItems` are provided they are returned as-is, letting the caller
 * override auto-generation for any route that requires a non-default label or
 * a non-standard path hierarchy.
 *
 * Auto-generation rules:
 *   - Always inserts a "Home → /dashboard" root item.
 *   - Skips empty segments and App Router route groups (segments that start
 *     with `(`), e.g. `(protected)`, `(public)`.
 *   - Every non-terminal segment receives an `href` so it is rendered as a
 *     link; the terminal segment has no `href` (current page, plain text).
 *
 * @example
 * // pathname: /admin/examination-management/grades
 * // returns:
 * // [
 * //   { label: 'Home',                      href: '/dashboard' },
 * //   { label: 'Admin',                     href: '/admin' },
 * //   { label: 'Examination Management',    href: '/admin/examination-management' },
 * //   { label: 'Grades' },
 * // ]
 */
export function useBreadcrumb(
  customItems?: BreadcrumbItem[],
): BreadcrumbItem[] {
  const pathname = usePathname();
  const lastSegmentLabel = useBreadcrumbStore((s) => s.lastSegmentLabel);
  const navItems = useNavigationStore((s) => s.navItems);
  const { user } = useSessionContext();
  const homeHref = user?.defaultDashboardPath || "/dashboard";

  if (customItems !== undefined) {
    return customItems;
  }

  const navBreadcrumb =
    navItems.length > 0
      ? findNavBreadcrumbItems(navItems, pathname, homeHref)
      : null;

  let items: BreadcrumbItem[];

  if (navBreadcrumb) {
    items = navBreadcrumb;
  } else {
    // Strip route-group segments such as (protected) or (public).
    const segments = pathname
      .split("/")
      .filter((s): s is string => s.length > 0 && !s.startsWith("("));

    items = [{ label: "Home", href: homeHref }];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += "/" + segment;
      const isLast = index === segments.length - 1;

      // Avoid linking module folder roots with no `page.tsx` (Next prefetch 404).
      // Leaf page keeps no href; real intermediate pages can still be linked when
      // they exist under nav metadata (preferred path above).
      const isExamMgmtRoot = currentPath === "/admin-examination-management";

      items.push({
        label: segmentToLabel(segment),
        href: isLast || isExamMgmtRoot ? undefined : currentPath,
      });

      // Admin module: insert a submodule label for fallback breadcrumbs when
      // sidebar/nav metadata is unavailable client-side.
      const isAdminRoot = segment === "admin" && index === 0;
      if (isAdminRoot && segments.length >= 2) {
        items.push({ label: adminSubmoduleLabel(pathname) });
      }
    });
  }

  items = examReportsModuleBreadcrumb(pathname, items);
  items = feeReportsMenuBreadcrumb(pathname, items);
  items = studentReportsMenuBreadcrumb(pathname, items);
  items = attendanceReportsMenuBreadcrumb(pathname, items);
  items = timetableReportsMenuBreadcrumb(pathname, items);
  items = libraryReportsMenuBreadcrumb(pathname, items);
  items = transportReportsMenuBreadcrumb(pathname, items);
  items = hrReportsMenuBreadcrumb(pathname, items);
  items = managementReportsMenuBreadcrumb(pathname, items);
  items = financeReportsMenuBreadcrumb(pathname, items);
  items = reportCatalogBreadcrumb(pathname, items);
  items = accountsFeesPaymentBreadcrumb(pathname, items);
  items = simplifyAdminDirectLeafBreadcrumb(pathname, items);
  items = assignRegulationToStudentsBreadcrumb(pathname, items);
  items = hostelRoomsBreadcrumb(pathname, items);
  items = examScanProfileDetailsBreadcrumb(pathname, items);
  items = unitTopicBulkUploadBreadcrumb(pathname, items);
  items = staffAcademicsBreadcrumb(pathname, items);
  items = leaveRequestsBreadcrumb(pathname, items);
  items = principalCommunicationsNotificationsBreadcrumb(pathname, items);
  items = principalCommunicationsSendEmailBreadcrumb(pathname, items);

  // Role home path (evaluator → /evaluator, student → /student-dashboard).
  if (items[0]?.label === "Home") {
    items = [{ ...items[0], href: homeHref }, ...items.slice(1)];
  }

  if (lastSegmentLabel && items.length > 0) {
    const last = items[items.length - 1];
    items[items.length - 1] = { ...last, label: lastSegmentLabel };
  }

  return items;
}

/**
 * Page-level override for the LAST breadcrumb segment label. Parent segments
 * stay auto-generated. Pass `null` (or omit during cleanup) to fall back to
 * the URL-derived label.
 *
 * @example
 *   useBreadcrumbLabel(isEditMode ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure')
 */
export function useBreadcrumbLabel(label: string | null): void {
  useEffect(() => {
    useBreadcrumbStore.getState().setLastSegmentLabel(label);
    return () => {
      useBreadcrumbStore.getState().setLastSegmentLabel(null);
    };
  }, [label]);
}

/**
 * Sidebar menu label for the current page (source of truth for page headings).
 * Returns null until nav items are loaded or when no nav match exists.
 */
export function usePageNavLabel(): string | null {
  const pathname = usePathname();
  const navItems = useNavigationStore((s) => s.navItems);

  return useMemo(
    () => (navItems.length > 0 ? findNavPageLabel(navItems, pathname) : null),
    [navItems, pathname],
  );
}

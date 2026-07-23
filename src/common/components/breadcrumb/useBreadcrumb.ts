"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import type { BreadcrumbItem } from "./Breadcrumb";
import { useBreadcrumbStore } from "@/store/breadcrumb-store";
import { useNavigationStore } from "@/store/navigation-store";
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

  if (customItems !== undefined) {
    return customItems;
  }

  const navBreadcrumb =
    navItems.length > 0 ? findNavBreadcrumbItems(navItems, pathname) : null;

  let items: BreadcrumbItem[];

  if (navBreadcrumb) {
    items = navBreadcrumb;
  } else {
    // Strip route-group segments such as (protected) or (public).
    const segments = pathname
      .split("/")
      .filter((s): s is string => s.length > 0 && !s.startsWith("("));

    items = [{ label: "Home", href: "/dashboard" }];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += "/" + segment;
      const isLast = index === segments.length - 1;

      items.push({
        label: segmentToLabel(segment),
        href: isLast ? undefined : currentPath,
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
  items = accountsFeesPaymentBreadcrumb(pathname, items);
  items = simplifyAdminDirectLeafBreadcrumb(pathname, items);
  items = assignRegulationToStudentsBreadcrumb(pathname, items);

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

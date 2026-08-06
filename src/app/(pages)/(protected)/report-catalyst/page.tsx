"use client";

/**
 * Report Catalog — Angular `report-catalyst` / OverallReports landing.
 * Fee reports open with `?path=report-catalyst` so Back returns here.
 */

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";

const FEE_REPORT_LINKS = [
  {
    label: "Day Wise Receipts",
    href: `/accounts-and-fees/fee-reports/daywise-fee-report?path=report-catalyst`,
  },
  {
    label: "Fee Ledger",
    href: `/reports/admin-fee-reports/fee-ledger?path=report-catalyst`,
  },
  {
    label: "Due List",
    href: `/reports/admin-fee-reports/due-list?path=report-catalyst`,
  },
  {
    label: "Bus Fee Collections",
    href: `/reports/admin-fee-reports/bus-fee-collections?path=report-catalyst`,
  },
  {
    label: "MNGT Students Fee Collections",
    href: `/reports/admin-fee-reports/mgt-fee-collections?path=report-catalyst`,
  },
  {
    label: "Library Students Fee Collections",
    href: `/reports/admin-fee-reports/library-fee-collections?path=report-catalyst`,
  },
  {
    label: "Scholarship Due List",
    href: `/reports/admin-fee-reports/scholarship-due-list?path=report-catalyst`,
  },
  {
    label: "Day Wise Application Report",
    href: `/reports/admin-student-reports/student-application-report?path=report-catalyst`,
  },
  {
    label: "Student Caste Wise Gender Count",
    href: `/reports/admin-student-reports/student-caste-wise-gender-count-report?path=report-catalyst`,
  },
] as const;

export default function ReportCatalogPage() {
  return (
    <PageContainer>
      <PageHeader title="Report Catalog" />
      <div className="mt-4 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Fee Reports
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEE_REPORT_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md border px-3 py-2 text-sm hover:bg-muted/60"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}

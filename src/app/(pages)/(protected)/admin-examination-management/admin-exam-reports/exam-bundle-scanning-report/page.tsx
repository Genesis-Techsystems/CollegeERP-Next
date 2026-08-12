"use client";

import { useRouter } from "next/navigation";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";

/**
 * Exam Bundle Scanning Report hub.
 * Angular: examination.module → admin-exam-reports/exam-bundle-scanning-report
 * Run targets: admin-examination-management/admin-exam-reports/{slug}
 */
const REPORTS = [
  {
    title: "1. Bundle Scanning Report",
    href: "/admin-examination-management/admin-exam-reports/bundle-scanning-report",
  },
  {
    title: "2. Scanning Operator Performance Report",
    href: "/admin-examination-management/admin-exam-reports/scaning-operator-performance-report",
  },
  {
    title: "3. Exam Wise Scanning Summary Report",
    href: "/admin-examination-management/admin-exam-reports/exam-wise-scaning-summary-report",
  },
  {
    title: "4. Scan File Tracking Report",
    href: "/admin-examination-management/admin-exam-reports/scan-file-track-report",
  },
  {
    title: "5. Bundle Tracking status Report",
    href: "/admin-examination-management/admin-exam-reports/bundle-tracking-status-report",
  },
  {
    title: "6. Subject Wise Scanning Report",
    href: "/admin-examination-management/admin-exam-reports/subject-wise-scaning-report",
  },
  {
    title: "7. Scan Logs Reports",
    href: "/admin-examination-management/admin-exam-reports/scan-logs-report",
  },
  {
    title: "8. Scan Bundle Papers Summary Report",
    href: "/admin-examination-management/admin-exam-reports/scan-bundle-papers-summary-report",
  },
] as const;

function ReportCard({
  title,
  onClick,
}: Readonly<{
  title: string;
  onClick: () => void;
}>) {
  return (
    <div className="flex flex-col justify-between rounded-sm border-2 border-[#89c5ff] p-3 mx-1 mb-4 min-h-[140px]">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <div className="mt-auto flex justify-end pt-6">
        <Button
          type="button"
          className="h-9 w-auto min-w-0 px-5 text-[13px] font-semibold shadow-md"
          onClick={onClick}
        >
          Run
        </Button>
      </div>
    </div>
  );
}

export default function ExamBundleScanningReportPage() {
  const router = useRouter();

  return (
    <FilteredPage
      title="Exam Bundle Scanning Report"
      filtersCollapsible={false}
      filters={
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2 pt-1">
          {REPORTS.map((item) => (
            <ReportCard
              key={item.href}
              title={item.title}
              onClick={() => {
                // Angular ParametersService.back = 'back' for return navigation
                try {
                  sessionStorage.setItem("examBundleScanningBack", "back");
                } catch {
                  /* ignore */
                }
                router.push(item.href);
              }}
            />
          ))}
        </div>
      }
    />
  );
}

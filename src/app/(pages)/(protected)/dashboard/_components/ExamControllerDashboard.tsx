"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, Filter } from "lucide-react";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/query-keys";
import { toastInfo } from "@/lib/toast";
import {
  examControllerCenterCode,
  examControllerCenterId,
  examControllerCenterName,
  getExamControllerReport,
  listExamControllerEvaluationCenters,
  type ExamControllerDashRow,
  type ExamControllerReport,
} from "@/services";

const ALL_SUMMARY_PAGE_SIZES = [100, 500, 1000, 2000] as const;

interface ExamControllerDashboardProps {
  employeeId: number;
}

async function exportExcel(rows: ExamControllerDashRow[], fileName: string) {
  if (rows.length === 0) {
    toastInfo("No data available to export");
    return;
  }
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "data");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

function ReportCard({
  report,
  loading,
  paginate,
}: {
  report: ExamControllerReport | undefined;
  loading: boolean;
  paginate?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] =
    useState<(typeof ALL_SUMMARY_PAGE_SIZES)[number]>(100);

  const rows = report?.rows ?? [];
  const columns = report?.columns ?? [];
  const totalPages = paginate
    ? Math.max(1, Math.ceil(rows.length / pageSize))
    : 1;
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = paginate
    ? rows.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : rows;

  const title = report?.title || (loading ? "Loading…" : "Report");

  return (
    <div className="rounded-[5px] bg-white shadow-[0_2px_6px_rgba(218,218,253,0.65)]">
      <div className="flex items-center gap-1 border-b-[3px] border-[#ffcf46] px-2 py-1.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <strong className="truncate text-[15px] text-[#042956]">
            {title}
          </strong>
          {report?.filters ? (
            <span
              title={report.filters}
              className="inline-flex shrink-0 text-[#042956]"
              onClick={(e) => e.stopPropagation()}
            >
              <Filter className="h-4 w-4" aria-label="Filters" />
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-[#042956] transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-[#042956]"
          title="Export Excel"
          disabled={loading || rows.length === 0}
          onClick={() => void exportExcel(rows, "Report")}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      {open ? (
        <>
          <div className="h-[300px] overflow-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <table className="min-w-full border-collapse text-center text-[13px]">
                <thead>
                  <tr>
                    {columns.map((header) => (
                      <th
                        key={header}
                        className="sticky top-0 whitespace-nowrap border-b border-[#e6eaf0] bg-white px-3 py-2 font-normal text-[#042956]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(columns.length, 1)}
                        className="px-3 py-8 text-muted-foreground"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-[#f0f2f5]">
                        {columns.map((header) => (
                          <td
                            key={header}
                            className="whitespace-nowrap px-3 py-1.5"
                          >
                            {row[header] == null ? "" : String(row[header])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          {paginate && rows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e6eaf0] px-3 py-1.5 text-[12px] text-[#042956]">
              <label className="flex items-center gap-1.5">
                Rows
                <select
                  className="rounded border border-[#d0d7e2] bg-white px-1 py-0.5"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(
                      Number(
                        e.target.value,
                      ) as (typeof ALL_SUMMARY_PAGE_SIZES)[number],
                    );
                    setPage(0);
                  }}
                >
                  {ALL_SUMMARY_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                {rows.length === 0
                  ? "0 of 0"
                  : `${safePage * pageSize + 1}–${Math.min(
                      (safePage + 1) * pageSize,
                      rows.length,
                    )} of ${rows.length}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={safePage <= 0}
                  onClick={() => setPage(0)}
                >
                  «
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ‹
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                >
                  »
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function ExamControllerDashboard({
  employeeId,
}: ExamControllerDashboardProps) {
  const [centerId, setCenterId] = useState(0);

  const centersQuery = useQuery({
    queryKey: QK.examControllerDashboard.centers(employeeId),
    queryFn: () => listExamControllerEvaluationCenters(employeeId),
  });

  const allSummaryQuery = useQuery({
    queryKey: QK.examControllerDashboard.report(
      "All_SUMMARY",
      centerId,
      employeeId,
    ),
    queryFn: () =>
      getExamControllerReport({
        reportType: "All_SUMMARY",
        evaluationCenterId: centerId,
        employeeId,
      }),
  });

  const evalSummaryQuery = useQuery({
    queryKey: QK.examControllerDashboard.report(
      "EVAL_SUMMARY",
      centerId,
      employeeId,
    ),
    queryFn: () =>
      getExamControllerReport({
        reportType: "EVAL_SUMMARY",
        evaluationCenterId: centerId,
        employeeId,
      }),
  });

  const centerOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...(centersQuery.data ?? []).map((row) => ({
        value: String(examControllerCenterId(row)),
        label:
          examControllerCenterCode(row) || String(examControllerCenterId(row)),
        title: examControllerCenterName(row) || examControllerCenterCode(row),
      })),
    ],
    [centersQuery.data],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[5px] bg-white px-3 py-2 shadow-[0_2px_6px_rgba(218,218,253,0.65)]">
        <div className="w-full max-w-[220px]">
          <Select
            label="Exam Evaluation Center"
            placeholder="Exam Evaluation Center"
            value={String(centerId)}
            options={centerOptions}
            isLoading={centersQuery.isLoading}
            searchable
            onChange={(value) => setCenterId(Number(value ?? 0) || 0)}
          />
        </div>
      </div>
      <ReportCard
        key={`all-${centerId}`}
        report={allSummaryQuery.data}
        loading={allSummaryQuery.isLoading || allSummaryQuery.isFetching}
        paginate
      />
      <ReportCard
        key={`eval-${centerId}`}
        report={evalSummaryQuery.data}
        loading={evalSummaryQuery.isLoading || evalSummaryQuery.isFetching}
      />
    </div>
  );
}

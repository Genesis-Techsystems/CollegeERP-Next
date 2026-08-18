"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Book, BookOpen, Users } from "lucide-react";
import { PieChart } from "@/common/components/charts";
import { StatusBadge } from "@/common/components/data-display";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QK } from "@/lib/query-keys";
import {
  getLibrarianBooksReport,
  getLibrarianLeaveApplications,
  getLibrarianLibraries,
  librarianLeaveYear,
  readDashStorageNum,
  sumLibrarianBookCounts,
  uniqueLibrarianCodes,
  type LeaveApplicationRow,
} from "@/services";
import type { SessionUser } from "@/types/user";
import { DrilldownColumnChart } from "./vice-chancellor/DrilldownColumnChart";
import {
  buildDrillTree,
  type DrillSpec,
} from "./vice-chancellor/vc-chart-utils";

interface LibraryDashboardProps {
  user: SessionUser;
  employeeId: number;
  showTabChrome?: boolean;
}

const PAGE_SIZES = [5, 10, 25, 100] as const;

const BOOK_CHART_SPEC: DrillSpec = {
  category: ["Library", "Department"],
  categoryName: ["library_code", "Category"],
  categoryId: ["library_code", "Category"],
  columns: ["Due_Books", "Issued_Books", "In_Library", "Total_Books"],
  columnsTitle: ["Due Books", "Issued Books", "Available Books", "Total Books"],
  colors: ["#f2726f", "#bc95df", "#29c3be", "#3886d2"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "Books",
  yAxisTitle: "Books Summary",
  showLegend: true,
};

const PIE_COLORS = ["#5d62b5", "#62b58f", "#ffc533", "#f2726f"];

function WidgetCard({
  title,
  extra,
  children,
}: {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[5px] bg-white shadow-[0_2px_6px_rgba(218,218,253,0.65)]">
      <div className="flex items-center justify-between border-b border-[#ffcf46] px-2.5 py-2">
        <h3 className="text-[16px] font-semibold text-[#042956]">{title}</h3>
        {extra}
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function KpiCard({
  value,
  label,
  border,
  icon,
}: {
  value: number;
  label: string;
  border: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="rounded-[10px] bg-white px-2 py-2 text-center shadow-[0_2px_6px_rgba(218,218,253,0.65)]"
      style={{ borderTop: `2px solid ${border}` }}
    >
      <div className="text-[30px] font-medium leading-[60px] text-[#4e93e6]">
        {value}
      </div>
      <div className="mx-auto mb-1 flex h-8 items-center justify-center">
        {icon}
      </div>
      <div className="text-[13px] uppercase text-[#656565]">{label}</div>
    </div>
  );
}

function formatLeaveDate(value: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value);
  try {
    const d = raw.includes("T")
      ? parseISO(raw)
      : new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, "dd MMM, yyyy");
  } catch {
    return raw;
  }
}

function leaveStatusBadge(row: LeaveApplicationRow) {
  const code = String(row.leaveprocessStatusCode ?? "");
  const label =
    String(row.leaveprocessStatusDisplayName ?? "").trim() || code || "—";
  if (code === "LPSCOMPLETE" || code === "LPSAPPROVED") {
    return <StatusBadge status="active" label={label} />;
  }
  if (code === "LPSREJECTED" || code === "LPSCANCEL") {
    return <StatusBadge status="inactive" label={label} />;
  }
  if (code === "LPSAPPLIED") {
    return <StatusBadge status="pending" label={label} />;
  }
  return <StatusBadge status="draft" label={label} />;
}

function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 px-1 py-2 text-[12px]">
      <span>Items per page:</span>
      <Select
        value={String(pageSize)}
        onChange={(v) => onPageSize(Number(v ?? 5))}
        options={PAGE_SIZES.map((n) => ({
          value: String(n),
          label: String(n),
        }))}
        searchable={false}
        clearable={false}
        className="w-[72px]"
      />
      <span>
        {total === 0
          ? "0 of 0"
          : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}`}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={page <= 0}
        onClick={() => onPage(Math.max(0, page - 1))}
      >
        ‹
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={page + 1 >= pageCount}
        onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
      >
        ›
      </Button>
    </div>
  );
}

export function LibraryDashboard({
  user,
  employeeId,
  showTabChrome = false,
}: LibraryDashboardProps) {
  const collegeId = user.collegeId || readDashStorageNum("collegeId");
  const organizationId =
    user.organizationId || readDashStorageNum("organizationId");
  const leaveYear = librarianLeaveYear();

  const [libraryId, setLibraryId] = useState<number>(0);
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leavePage, setLeavePage] = useState(0);
  const [leavePageSize, setLeavePageSize] = useState(5);

  const librariesQ = useQuery({
    queryKey: QK.libraryDashboard.libraries(organizationId, employeeId),
    queryFn: () => getLibrarianLibraries({ organizationId, employeeId }),
    enabled: organizationId > 0 || employeeId > 0,
  });
  const libraries = librariesQ.data ?? [];
  const defaultLibraryId = Number(libraries[0]?.fk_library_id ?? 0);
  const selectedLibraryId = libraryId || defaultLibraryId;
  const libCode =
    libraries.find((l) => l.fk_library_id === selectedLibraryId)
      ?.library_code ?? "";

  const kpiQ = useQuery({
    queryKey: QK.libraryDashboard.books(defaultLibraryId),
    queryFn: () => getLibrarianBooksReport(defaultLibraryId),
    enabled: defaultLibraryId > 0,
  });
  const libraryReports = kpiQ.data ?? [];
  const kpi = sumLibrarianBookCounts(libraryReports);
  const libraryCols = uniqueLibrarianCodes(libraryReports);
  const bookRoots = useMemo(
    () => buildDrillTree(libraryReports, BOOK_CHART_SPEC),
    [libraryReports],
  );

  const historyQ = useQuery({
    queryKey: QK.libraryDashboard.booksHistory(selectedLibraryId),
    queryFn: () => getLibrarianBooksReport(selectedLibraryId),
    enabled: selectedLibraryId > 0,
  });
  const historyRows = historyQ.data ?? [];
  const pieSums = sumLibrarianBookCounts(historyRows);
  const pieData = [
    {
      name: "Total Books",
      value: pieSums.TotalBooksCount,
      color: PIE_COLORS[0],
    },
    { name: "In Library", value: pieSums.InLibrary, color: PIE_COLORS[1] },
    { name: "Issued Books", value: pieSums.IssuedBooks, color: PIE_COLORS[2] },
    { name: "Due Books", value: pieSums.DueBooks, color: PIE_COLORS[3] },
  ];

  const leavesQ = useQuery({
    queryKey: QK.libraryDashboard.leaves(collegeId, employeeId, leaveYear),
    queryFn: () =>
      getLibrarianLeaveApplications({ collegeId, employeeId, leaveYear }),
    enabled: collegeId > 0 && employeeId > 0 && leaveYear > 0,
  });
  const leaveApplications = leavesQ.data ?? [];
  const filteredLeaves = useMemo(() => {
    const q = leaveSearch.trim().toLowerCase();
    if (!q) return leaveApplications;
    return leaveApplications.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [leaveApplications, leaveSearch]);
  const pagedLeaves = filteredLeaves.slice(
    leavePage * leavePageSize,
    leavePage * leavePageSize + leavePageSize,
  );

  const body = (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div
          className="relative flex min-h-[120px] items-center justify-center rounded-[10px] bg-white px-3 py-4 shadow-[0_2px_6px_rgba(218,218,253,0.65)]"
          style={{ borderTop: "2px solid #f2726f" }}
        >
          <div className="flex w-full gap-2">
            <Button
              asChild
              className="h-9 flex-1 bg-[#042956] text-white hover:bg-[#031f40]"
            >
              <Link href="/library/bookIssue">Book Issue</Link>
            </Button>
            <Button
              asChild
              className="h-9 flex-1 bg-[#042956] text-white hover:bg-[#031f40]"
            >
              <Link href="/library/bookReturn">Book Return</Link>
            </Button>
          </div>
        </div>
        <KpiCard
          value={kpi.TotalBooksCount}
          label="Total Books"
          border="#2a76d4"
          icon={<Book className="h-5 w-5 text-[#5454e8]" />}
        />
        <KpiCard
          value={kpi.InLibrary}
          label="Available Books"
          border="#29c3be"
          icon={<BookOpen className="h-5 w-5 text-[#29c3be]" />}
        />
        <KpiCard
          value={kpi.IssuedBooks}
          label="Issued Books"
          border="#5d62b5"
          icon={<Users className="h-5 w-5 text-[#5d62b5]" />}
        />
        <KpiCard
          value={kpi.DueBooks}
          label="Due Books"
          border="#5d62b5"
          icon={<Book className="h-5 w-5 text-[#f2726f]" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[29%_36%_35%]">
        <WidgetCard
          title={
            <>
              Books Summary
              {libCode ? ` for ${libCode}` : ""}
            </>
          }
        >
          {libraries.length > 0 ? (
            <div className="mb-2 max-w-[220px]">
              <Select
                value={selectedLibraryId ? String(selectedLibraryId) : null}
                onChange={(v) => setLibraryId(Number(v ?? 0))}
                options={libraries.map((lib) => ({
                  value: String(lib.fk_library_id),
                  label: lib.library_code || String(lib.fk_library_id),
                }))}
                placeholder="Library"
                searchable={false}
                clearable={false}
              />
            </div>
          ) : null}
          {historyQ.isLoading || librariesQ.isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="relative">
              <PieChart
                data={pieData}
                colors={PIE_COLORS}
                donut
                showLabels={false}
                height={400}
                showLegend
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="mt-[-24px] text-center text-[13px] font-semibold text-[#042956]">
                  Total Books: {pieSums.TotalBooksCount}
                </span>
              </div>
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Library & Department Books Summary">
          {kpiQ.isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <DrilldownColumnChart
              roots={bookRoots}
              spec={BOOK_CHART_SPEC}
              height={400}
            />
          )}
        </WidgetCard>

        <WidgetCard title="Books Consolidated Summary">
          {kpiQ.isLoading ? (
            <Skeleton className="h-[440px] w-full" />
          ) : (
            <div className="h-[440px] overflow-auto">
              <table className="w-full border-separate border-spacing-px text-left">
                <thead>
                  <tr>
                    <th className="bg-[#C3D9FF] p-[5px] text-center text-[13px] font-medium">
                      S.No
                    </th>
                    <th className="bg-[#C3D9FF] p-[5px] text-[13px] font-medium">
                      Departments
                    </th>
                    {libraryCols.map((col) => (
                      <th
                        key={String(col.library_code)}
                        className="bg-[#C3D9FF] p-[5px] text-center text-[13px] font-medium"
                      >
                        {String(col.library_code ?? "")}
                      </th>
                    ))}
                    <th className="bg-[#C3D9FF] p-[5px] text-center text-[13px] font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {libraryReports.map((row, i) => (
                    <tr key={`${String(row.Category)}-${i}`}>
                      <td className="p-2 text-center text-[12px] font-medium">
                        {i + 1}
                      </td>
                      <td className="p-2 text-[12px] font-medium">
                        {String(row.Category ?? "")}
                      </td>
                      {libraryCols.map((col) => (
                        <td
                          key={String(col.library_code)}
                          className="p-2 text-center text-[12px] font-medium"
                        >
                          {String(col.library_code) ===
                          String(row.library_code ?? "")
                            ? Number(row.Total_Books ?? 0)
                            : 0}
                        </td>
                      ))}
                      <td className="p-2 text-center text-[12px] font-medium">
                        {Number(row.Total_Books ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>
      </div>

      <WidgetCard title="Leave History">
        <div className="mb-2 max-w-xs">
          <SearchInput
            value={leaveSearch}
            onChange={(v) => {
              setLeaveSearch(v);
              setLeavePage(0);
            }}
            placeholder="Search"
          />
        </div>
        {leavesQ.isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-px text-left">
                <thead>
                  <tr>
                    {[
                      "SI.No",
                      "Leave Type",
                      "Leave Description",
                      "Leave Date",
                      "Assigned To",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="bg-[#C3D9FF] p-[5px] text-[13px] font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedLeaves.map((row) => (
                    <tr
                      key={String(
                        row.leaveApplictionId ??
                          row.leaveApplicationId ??
                          `${row.leaveCode}-${row.applicationDate}`,
                      )}
                    >
                      <td className="p-2 text-center text-[12px] font-medium">
                        {leaveApplications.indexOf(row) + 1}
                      </td>
                      <td className="p-2 text-[12px] font-medium">
                        {String(row.leaveCode ?? "")}
                      </td>
                      <td className="p-2 text-[12px] font-medium">
                        {String(row.leaveDescription ?? "")}
                      </td>
                      <td className="p-2 text-[12px] font-medium">
                        {formatLeaveDate(row.leaveFromDate)}
                        {row.leaveToDate != null
                          ? ` - ${formatLeaveDate(row.leaveToDate)}`
                          : ""}
                      </td>
                      <td className="p-2 text-[12px] font-medium">
                        {String(row.assignedEmployeeFirstName ?? "")}
                      </td>
                      <td className="p-2 text-[12px] font-medium">
                        {leaveStatusBadge(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={leavePage}
              pageSize={leavePageSize}
              total={filteredLeaves.length}
              onPage={setLeavePage}
              onPageSize={(n) => {
                setLeavePageSize(n);
                setLeavePage(0);
              }}
            />
          </>
        )}
      </WidgetCard>
    </div>
  );

  if (!showTabChrome) return body;

  return (
    <div className="space-y-2">
      <div className="border-b border-border px-1 py-2">
        <h2 className="text-[15px] font-semibold text-[#042956]">
          Librarian Dashboard
        </h2>
      </div>
      {body}
    </div>
  );
}

"use client";

/**
 * Staff Assignment Report —
 * Angular `staff-assignment-report` parity.
 * Employee (cat 18) → subjects via staffSubjects → Get Report via
 * `s_get_assignment_details` (dynamic columns).
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage, TableContextHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { printHtmlInIframe } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { useSession } from "@/hooks/useSession";
import {
  getStaffAssignmentReportDetails,
  listEmployeesForStaffClassDiaryReport,
  listStaffSubjectsForAssignmentReport,
} from "@/services";
import {
  attendancePrintShell as timetablePrintShell,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  staffDiaryEmployeeSelectOption,
  staffDiaryEmployeeTriggerLabel,
} from "../_lib/staff-class-diary-employees";

const REPORT_TITLE = "Staff Assignment Report";
const PRIMARY_ACTION_BTN =
  "h-9 shrink-0 rounded-[5px] bg-[#042956] px-4 text-[13px] text-white hover:bg-[#031f42]";

type AnyRow = Record<string, unknown>;

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dash(v: unknown): string {
  const s = txt(v).trim();
  return !s || s === "null" || s === "undefined" ? "—" : s;
}

function minioFileUrl(path: unknown): string {
  const raw = txt(path).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return `${base}/${raw.replace(/^\/+/, "")}`;
}

function employeeDisplayName(label: string): string {
  return label.replace(/\s*\(\s*[^)]+\s*\)\s*$/, "").trim();
}

function SubmissionFileCell(p: ICellRendererParams<AnyRow>) {
  const path = p.data?.Submission_File;
  const url = minioFileUrl(path);
  if (!url) return null;
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded text-[#042956] hover:bg-slate-100"
      title="View submission"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
    >
      <Eye className="h-4 w-4" />
    </button>
  );
}

export default function StaffAssignmentReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();

  const activeCollegeId = useMemo(() => {
    if (user?.collegeId) return Number(user.collegeId);
    if (typeof window === "undefined") return 0;
    return Number(globalThis.localStorage.getItem("collegeId") ?? 0);
  }, [user?.collegeId]);

  const academicYearId = useMemo(() => {
    if (user?.academicYearId) return Number(user.academicYearId);
    if (typeof window === "undefined") return 0;
    return Number(globalThis.localStorage.getItem("academicYearId") ?? 0);
  }, [user?.academicYearId]);

  const collegeName = useMemo(() => {
    if (user?.collegeName) return String(user.collegeName);
    if (typeof window === "undefined") return "";
    return String(globalThis.localStorage.getItem("currentCollege") ?? "");
  }, [user?.collegeName]);

  const collegeLogo = useCollegeLogo(activeCollegeId || null);

  const [employeeId, setEmployeeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const employeesQuery = useQuery({
    queryKey: ["staffAssignmentReportEmployees", activeCollegeId],
    queryFn: () => listEmployeesForStaffClassDiaryReport(activeCollegeId),
    enabled: activeCollegeId > 0 && !sessionLoading,
  });

  const rawEmployees = useMemo(
    () => (Array.isArray(employeesQuery.data) ? employeesQuery.data : []),
    [employeesQuery.data],
  );

  const employeeOptions = useMemo(() => {
    if (!rawEmployees.length) return [];
    const empMap = new Map<
      number,
      ReturnType<typeof staffDiaryEmployeeSelectOption>
    >();
    for (const r of rawEmployees) {
      const catId = Number(r.empCategoryId ?? r.emp_category_id ?? 18);
      if (catId !== 18) continue;
      const eId = Number(
        r.employeeId ?? r.employee_id ?? r.fk_emp_id ?? r.id ?? 0,
      );
      if (eId > 0) {
        empMap.set(eId, staffDiaryEmployeeSelectOption(r));
      }
    }
    return Array.from(empMap.values());
  }, [rawEmployees]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      Object.entries(row).some(([key, val]) => {
        if (key === "Submission_File") return false;
        return String(val ?? "")
          .toLowerCase()
          .includes(q);
      }),
    );
  }, [rows, searchQuery]);

  const subjectOptions = useMemo(
    () =>
      subjects.map((s) => {
        const id = Number(s.subjectId ?? s.subject_id ?? 0);
        const code = txt(s.subjectCode ?? s.subject_code);
        const name = txt(s.subjectName ?? s.subject_name);
        const label =
          code && name ? `${code}(${name})` : name || code || String(id);
        return { value: String(id), label };
      }),
    [subjects],
  );

  const clearResults = useCallback(() => {
    setRows([]);
    setDynamicColumns([]);
    setShowTable(false);
    setSearchQuery("");
  }, []);

  const handleEmployeeChange = useCallback(
    async (value: string | null) => {
      const next = value ?? "";
      setEmployeeId(next);
      setSubjectId("");
      setSubjects([]);
      clearResults();

      const row = rawEmployees.find(
        (r) =>
          String(r.employeeId ?? r.employee_id ?? r.fk_emp_id ?? r.id) === next,
      );
      if (row) {
        setEmployeeName(
          employeeDisplayName(staffDiaryEmployeeTriggerLabel(row)),
        );
      } else {
        const opt = employeeOptions.find((e) => e.value === next);
        setEmployeeName(opt ? employeeDisplayName(opt.label) : "");
      }

      const empId = Number(next);
      if (!empId || !activeCollegeId || !academicYearId) return;

      setSubjectsLoading(true);
      try {
        const list = await listStaffSubjectsForAssignmentReport({
          collegeId: activeCollegeId,
          academicYearId,
          employeeId: empId,
        });
        // Angular: unique by subjectId
        const seen = new Set<number>();
        const unique: AnyRow[] = [];
        for (const row of list) {
          const sid = Number(row.subjectId ?? row.subject_id ?? 0);
          if (!sid || seen.has(sid)) continue;
          seen.add(sid);
          unique.push(row);
        }
        setSubjects(unique);
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    },
    [
      employeeOptions,
      rawEmployees,
      activeCollegeId,
      academicYearId,
      clearResults,
    ],
  );

  const handleGetReport = useCallback(async () => {
    if (!employeeId) {
      toastInfo("Please select an employee.");
      return;
    }
    if (!subjectId) {
      toastInfo("Please select a subject.");
      return;
    }
    setLoadingList(true);
    clearResults();
    try {
      const list = await getStaffAssignmentReportDetails({
        employeeId: Number(employeeId),
        subjectId: Number(subjectId),
      });
      if (list.length > 0) {
        setDynamicColumns(Object.keys(list[0] ?? {}));
        setRows(list);
        setShowTable(true);
      } else {
        toastInfo("No assignment records found.");
        setShowTable(true);
        setRows([]);
        setDynamicColumns([]);
      }
    } catch (e) {
      toastError(getErrorMessage(e) || "Failed to load assignment report.");
      setRows([]);
      setDynamicColumns([]);
      setShowTable(false);
    } finally {
      setLoadingList(false);
    }
  }, [employeeId, subjectId, clearResults]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const sno: ColDef<AnyRow> = {
      headerName: "S.No",
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      width: 70,
      flex: 0,
      pinned: "left",
    };
    const cols: ColDef<AnyRow>[] = dynamicColumns.map((col) => {
      if (col === "Submission_File") {
        return {
          headerName: col,
          field: col,
          minWidth: 120,
          flex: 0,
          cellRenderer: SubmissionFileCell,
          sortable: false,
          filter: false,
        };
      }
      return {
        headerName: col,
        field: col,
        minWidth: 120,
        flex: 1,
        valueGetter: (p) => dash(p.data?.[col]),
      };
    });
    return [sno, ...cols];
  }, [dynamicColumns]);

  const goBack = useCallback(() => {
    const catalog = searchParams.get("path");
    if (catalog) {
      router.push(resolveReportCatalogHref(catalog));
      return;
    }
    router.back();
  }, [router, searchParams]);

  const handleExportExcel = useCallback(() => {
    if (!rows.length) {
      toastInfo("No records to export.");
      return;
    }
    const columns = [
      { key: "sno", header: "S.No" },
      ...dynamicColumns
        .filter((c) => c !== "Submission_File")
        .map((c) => ({ key: c, header: c })),
    ];
    const excelRows = rows.map((row, i) => {
      const out: Record<string, unknown> = { sno: i + 1 };
      for (const col of dynamicColumns) {
        if (col === "Submission_File") continue;
        out[col] = dash(row[col]);
      }
      return out;
    });
    const headerHtml = `<h3>${escapeHtml(REPORT_TITLE)} - ${escapeHtml(employeeName)}</h3>`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildHtmlTable(columns, excelRows),
      headerHtml,
    );
  }, [rows, dynamicColumns, employeeName]);

  const handlePrint = useCallback(() => {
    if (!rows.length) {
      toastInfo("No records to print.");
      return;
    }
    const printCols = dynamicColumns.filter((c) => c !== "Submission_File");
    const columns = [
      { key: "sno", header: "S.No" },
      ...printCols.map((c) => ({ key: c, header: c })),
    ];
    const printRows = rows.map((row, i) => {
      const out: Record<string, unknown> = { sno: i + 1 };
      for (const col of printCols) out[col] = dash(row[col]);
      return out;
    });
    const tableHtml = buildHtmlTable(columns, printRows);
    const logoSrc = toPrintLogoUrl(collegeLogo);
    const fallback = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      timetablePrintShell({
        title: REPORT_TITLE,
        logoSrc,
        fallbackLogo: fallback,
        collegeName: collegeName || "—",
        dataDetails: employeeName || undefined,
        tableHtml,
        textAlign: "center",
      }),
    );
  }, [rows, dynamicColumns, collegeLogo, collegeName, employeeName]);

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      filterTitle={`${REPORT_TITLE} Filter`}
      filters={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Select
            label="Employee"
            value={employeeId || null}
            onChange={(v) => void handleEmployeeChange(v)}
            options={employeeOptions}
            placeholder="Select Employee"
            searchable
            isLoading={employeesQuery.isLoading}
            listClassName="max-h-[400px] divide-y divide-[#9e9e9e52]"
          />
          <Select
            label="Subjects"
            required
            value={subjectId || null}
            onChange={(v) => {
              setSubjectId(v ?? "");
              clearResults();
            }}
            options={subjectOptions}
            placeholder="Select Subject"
            searchable
            disabled={!employeeId}
            isLoading={subjectsLoading}
          />
          <div className="flex flex-wrap items-center gap-2 lg:col-span-2 lg:justify-end">
            <Button
              type="button"
              className={PRIMARY_ACTION_BTN}
              disabled={loadingList || !employeeId || !subjectId}
              onClick={() => void handleGetReport()}
            >
              {loadingList ? "Loading…" : "Get Report"}
            </Button>
            <Button
              type="button"
              className="h-9 min-w-20 !rounded-[5px] !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? filteredRows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      columnFilters={false}
      toolbar={{
        search: false,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
        columnPicker: false,
      }}
      toolbarLeading={
        showTable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 min-w-[7.5rem] !rounded-[5px] gap-1.5 bg-[#042956] px-4 text-[13px] text-white shadow-sm hover:bg-[#031f42]"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-9 min-w-[7.5rem] !rounded-[5px] gap-1.5 bg-[#042956] px-4 text-[13px] text-white shadow-sm hover:bg-[#031f42]"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        ) : null
      }
      toolbarTrailing={
        showTable ? (
          <div className="min-w-[200px] max-w-xs flex-1 sm:min-w-[240px]">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search"
            />
          </div>
        ) : null
      }
      tableHeader={
        showTable && employeeName ? (
          <TableContextHeader title={`${REPORT_TITLE} - ${employeeName}`} />
        ) : null
      }
    />
  );
}

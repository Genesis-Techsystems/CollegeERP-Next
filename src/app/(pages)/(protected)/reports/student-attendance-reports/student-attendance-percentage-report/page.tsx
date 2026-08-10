"use client";

/**
 * Student Attendance Percentage Report —
 * Angular `reports/student-attendance-reports/student-attendance-percentage-report` parity.
 * AG Grid: one row per student + dynamic subject columns.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchStudentAttendancePercentageReport,
  getCollegeById,
} from "@/services";
import {
  useAttendanceReportFilters,
  buildBannerHtml,
} from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

type SubjectKey = {
  subject: string;
  Subject_Type: unknown;
  Subject_Short_Name: unknown;
  Batch: unknown;
  Subject_name: unknown;
  Faculty: unknown;
  sub_credits: unknown;
  Total_classes: unknown;
};

const REPORT_TITLE = "Student Attendance Percentage Report";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function subjectFieldKey(code: string): string {
  return `sub_${code}`;
}

function transformPercentageRows(rows: AnyRow[]): {
  keys: SubjectKey[];
  gridRows: AnyRow[];
} {
  const keys: SubjectKey[] = [];
  const byRoll = new Map<
    string,
    {
      rollNumber: string;
      firstName: string;
      Father_Mobile_No: unknown;
      present: number;
      total: number;
      counted: Set<string>;
      cells: Record<string, string>;
    }
  >();

  for (const row of rows) {
    const code = str(row.Subject_Code);
    if (!code) continue;
    if (!keys.some((k) => k.subject === code)) {
      keys.push({
        subject: code,
        Subject_Type: row.Subject_Type,
        Subject_Short_Name: row.Subject_Short_Name,
        Batch: row.Batch ?? "",
        Subject_name: row.Subject_name,
        Faculty: row.Faculty,
        sub_credits: row.sub_credits,
        Total_classes: row.Total_classes,
      });
    }
  }

  for (const row of rows) {
    const roll = str(row.Roll_no);
    if (!roll) continue;
    let student = byRoll.get(roll);
    if (!student) {
      student = {
        rollNumber: roll,
        firstName: str(row.Student_name),
        Father_Mobile_No: row.Father_Mobile_No,
        present: 0,
        total: 0,
        counted: new Set(),
        cells: Object.fromEntries(
          keys.map((k) => [subjectFieldKey(k.subject), "-"]),
        ),
      };
      byRoll.set(roll, student);
    }

    const code = str(row.Subject_Code);
    if (!code || student.counted.has(code)) continue;
    const present = num(row.Present_classes);
    const totalClasses = num(row.Total_classes);
    student.cells[subjectFieldKey(code)] = String(present);
    student.present += present;
    student.total += totalClasses;
    student.counted.add(code);
  }

  const gridRows: AnyRow[] = Array.from(byRoll.values())
    .sort((a, b) =>
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }),
    )
    .map((s) => ({
      rollNumber: s.rollNumber,
      firstName: s.firstName,
      Father_Mobile_No: s.Father_Mobile_No,
      studentDisplay: `${s.firstName}${s.Father_Mobile_No ? ` (${str(s.Father_Mobile_No)})` : ""}`,
      present: s.present,
      total: s.total,
      totalPercenteage:
        s.total > 0 ? ((s.present / s.total) * 100).toFixed(2) : "0.00",
      ...s.cells,
    }));

  return { keys, gridRows };
}

export default function StudentAttendancePercentageReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [minPer, setMinPer] = useState(0);
  const [maxPer, setMaxPer] = useState(100);
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [keys, setKeys] = useState<SubjectKey[]>([]);
  const [gridRows, setGridRows] = useState<AnyRow[]>([]);

  const clearResults = useCallback(() => {
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
    setKeys([]);
    setGridRows([]);
  }, []);

  const filters = useAttendanceReportFilters({
    autoSelectFirstSection: true,
    onClearResults: clearResults,
  });

  const collegeNum = Number(filters.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const subjectCols: ColDef<AnyRow>[] = keys.map((key) => {
      const field = subjectFieldKey(key.subject);
      const typeLabel = str(key.Subject_Type);
      return {
        field,
        headerName: typeLabel
          ? `${key.subject} (${typeLabel})`
          : key.subject,
        headerTooltip: str(key.Subject_name),
        minWidth: 110,
        flex: 0,
        cellStyle: { textAlign: "center" },
        valueGetter: (p) => {
          const v = p.data?.[field];
          return v == null || v === "" ? "-" : String(v);
        },
      } as ColDef<AnyRow>;
    });

    return [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "rollNumber",
        headerName: "Roll No.",
        minWidth: 110,
      },
      {
        field: "studentDisplay",
        headerName: "Student",
        minWidth: 180,
      },
      ...subjectCols,
      {
        field: "present",
        headerName: "Total",
        minWidth: 90,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "totalPercenteage",
        headerName: "Percentage(%)",
        minWidth: 120,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
    ];
  }, [keys]);

  const excelColumns = useMemo(() => {
    const cols: { key: string; header: string }[] = [
      { key: "siNo", header: "S.No" },
      { key: "rollNumber", header: "Roll No." },
      { key: "studentDisplay", header: "Student" },
    ];
    for (const key of keys) {
      const typeLabel = str(key.Subject_Type);
      cols.push({
        key: subjectFieldKey(key.subject),
        header: typeLabel ? `${key.subject} (${typeLabel})` : key.subject,
      });
    }
    cols.push(
      { key: "present", header: "Total" },
      { key: "totalPercenteage", header: "Percentage(%)" },
    );
    return cols;
  }, [keys]);

  const exportFlatRows = useMemo(
    () =>
      gridRows.map((row, i) => {
        const flat: Record<string, unknown> = {
          siNo: i + 1,
          rollNumber: String(row.rollNumber ?? ""),
          studentDisplay: String(row.studentDisplay ?? ""),
          present: String(row.present ?? ""),
          totalPercenteage: String(row.totalPercenteage ?? ""),
        };
        for (const key of keys) {
          const f = subjectFieldKey(key.subject);
          flat[f] = String(row[f] ?? "-");
        }
        return flat;
      }),
    [gridRows, keys],
  );

  const handleGetList = async () => {
    const cid = Number(filters.collegeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!filters.academicYearId) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!filters.courseId) {
      toastInfo("Course is required");
      return;
    }
    if (!filters.courseGroupId) {
      toastInfo("Course Group is required");
      return;
    }
    if (!filters.courseYearId) {
      toastInfo("Course Year is required");
      return;
    }
    if (!filters.sectionId) {
      toastInfo("Section is required");
      return;
    }

    const min = Number(minPer ?? 0);
    const max = Number(maxPer ?? 100);
    if (min > max) {
      toastError("Min % cannot be greater than Max %");
      return;
    }

    setLoadingList(true);
    clearResults();
    const details = filters.buildDataDetails([`${min}-${max}`]);
    setDataDetails(details);

    try {
      const [raw, college] = await Promise.all([
        fetchStudentAttendancePercentageReport({
          collegeId: cid,
          courseYearId: Number(filters.courseYearId || 0),
          courseGroupId: Number(filters.courseGroupId || 0),
          academicYearId: Number(filters.academicYearId || 0),
          sectionId: Number(filters.sectionId || 0),
          fromPercentage: min,
          toPercentage: max,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
            filters.collegeOptions.find((o) => o.value === filters.collegeId)
              ?.label ??
            "",
        ),
      );
      const transformed = transformPercentageRows(raw ?? []);
      if (transformed.gridRows.length === 0) {
        toastInfo("No attendance records found.");
        return;
      }
      setKeys(transformed.keys);
      setGridRows(transformed.gridRows);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const noteTableHtml = useMemo(() => {
    if (keys.length === 0) return "";
    const body = keys
      .map(
        (key, i) => `<tr>
      <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(key.subject)}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(str(key.Subject_name))}${str(key.Subject_Type) ? ` (<span style="color:blue;">${escapeHtml(str(key.Subject_Type))}</span>)` : ""}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(str(key.Faculty))}</td>
      <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${escapeHtml(str(key.sub_credits))}</td>
    </tr>`,
      )
      .join("");
    return `<div style="margin-top:12px;">
  <p style="margin:7px 0;"><span style="font-weight:500;color:red;">Note :</span></p>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead>
      <tr>
        <th style="border:1px solid #333;padding:4px;background:#f3f4f6;">S.No</th>
        <th style="border:1px solid #333;padding:4px;background:#f3f4f6;">Subject Code</th>
        <th style="border:1px solid #333;padding:4px;background:#f3f4f6;">Subject</th>
        <th style="border:1px solid #333;padding:4px;background:#f3f4f6;">Faculty</th>
        <th style="border:1px solid #333;padding:4px;background:#f3f4f6;">Credit Points</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</div>`;
  }, [keys]);

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    const tableHtml = buildHtmlTable(excelColumns, exportFlatRows) + noteTableHtml;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, excelColumns, exportFlatRows, noteTableHtml]);

  const handlePrintReport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: REPORT_TITLE,
      orgCode,
    });
    const printed = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    const tableHtml = buildHtmlTable(excelColumns, exportFlatRows) + noteTableHtml;
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
  body{font-family:Arial,sans-serif;padding:16px;color:#111}
  table{border-collapse:collapse;width:100%;font-size:11px}
  th,td{border:1px solid #333;padding:4px 6px}
  th{background:#f3f4f6}
</style>
</head><body>${headerHtml}
<p style="text-align:left;margin:8px 0;">Printed Date : ${escapeHtml(printed)}</p>
${tableHtml}</body></html>`);
  }, [
    collegeLogo,
    collegeName,
    dataDetails,
    excelColumns,
    exportFlatRows,
    noteTableHtml,
    orgCode,
  ]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} - ${dataDetails}`
          : REPORT_TITLE
      }
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-2">
            <Select
              label="College"
              required
              value={filters.collegeId || null}
              onChange={filters.onCollegeChange}
              options={filters.collegeOptions}
              isLoading={filters.loadingFilters}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Academic Year"
              required
              value={filters.academicYearId || null}
              onChange={filters.onAyChange}
              options={filters.ayOptions}
              disabled={!filters.collegeId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Course"
              required
              value={filters.courseId || null}
              onChange={filters.onCourseChange}
              options={filters.courseOptions}
              disabled={!filters.academicYearId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Course Group"
              required
              value={filters.courseGroupId || null}
              onChange={filters.onGroupChange}
              options={filters.groupOptions}
              disabled={!filters.courseId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Course Year"
              required
              value={filters.courseYearId || null}
              onChange={filters.onYearChange}
              options={filters.yearOptions}
              disabled={!filters.courseGroupId}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              label="Section"
              required
              value={filters.sectionId || null}
              onChange={filters.onSectionChange}
              options={filters.sectionOptions}
              disabled={!filters.courseYearId}
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Min %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minPer}
              onChange={(e) => {
                setMinPer(Number(e.target.value));
                clearResults();
              }}
              className="h-9"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Max %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={maxPer}
              onChange={(e) => {
                setMaxPer(Number(e.target.value));
                clearResults();
              }}
              className="h-9"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5 md:col-span-4">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-fit px-4"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      rowData={showTable ? gridRows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      resultsVisible={showTable}
      hideEmptyGrid
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handlePrintReport}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : undefined
      }
    >
      {showTable && keys.length > 0 ? (
        <div className="app-data-table app-data-table-card mt-4 p-4">
          <p className="mb-3 text-sm font-medium">
            <span className="text-red-600">Note :</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-semibold">
                    S.No
                  </th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">
                    Subject Code
                  </th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">
                    Subject
                  </th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">
                    Faculty
                  </th>
                  <th className="border border-border px-3 py-2 text-center font-semibold">
                    Credit Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key, i) => (
                  <tr key={key.subject}>
                    <td className="border border-border px-3 py-2 text-center">
                      {i + 1}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {key.subject}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {str(key.Subject_name)}
                      {str(key.Subject_Type) ? (
                        <>
                          {" "}
                          (
                          <span className="text-blue-600">
                            {str(key.Subject_Type)}
                          </span>
                          )
                        </>
                      ) : null}
                    </td>
                    <td className="border border-border px-3 py-2">
                      {str(key.Faculty)}
                    </td>
                    <td className="border border-border px-3 py-2 text-center">
                      {str(key.sub_credits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </FilteredListPage>
  );
}

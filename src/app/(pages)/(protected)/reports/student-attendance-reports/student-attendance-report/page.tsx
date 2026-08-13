"use client";

/**
 * Student Attendance Report —
 * Admin: `reports/student-attendance-reports/student-attendance-report`
 * HOD:   `staff-reports/admin-attendance-reports/student-attendance-report`
 * Get List: `getAllRecords/s_rep_tt_std_daywise_attendance`
 * AG Grid: one row per subject + dynamic date columns.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchAttendanceReportStudents,
  fetchStudentAttendanceDaywiseReport,
  getCollegeById,
} from "@/services";
import {
  useAttendanceReportFilters,
  formatYmd,
  formatDateHeader,
  buildBannerHtml,
} from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Student Attendance Report";

type DateAtt = { att: string; date: string };
type SubjectPivot = {
  Subject_name: string;
  Subject_code: string;
  subjectAttendance: DateAtt[];
  present: number;
  total: number;
};

function pickText(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function dateFieldKey(date: string): string {
  return `date_${date}`;
}

function pivotDaywiseRows(raw: AnyRow[]): {
  dateKeys: string[];
  subjects: SubjectPivot[];
  studentName: string;
  rollNumber: string;
} {
  const dateKeys: string[] = [];
  for (const row of raw) {
    const d = String(row.Class_date ?? "");
    if (d && !dateKeys.includes(d)) dateKeys.push(d);
  }

  const subjects: SubjectPivot[] = [];
  const byCode = new Map<string, SubjectPivot>();

  for (const row of raw) {
    const code = String(row.Subject_code ?? "");
    let subject = byCode.get(code);
    if (!subject) {
      subject = {
        Subject_name: String(row.Subject_name ?? ""),
        Subject_code: code,
        subjectAttendance: dateKeys.map((date) => ({ att: "--", date })),
        present: 0,
        total: 0,
      };
      byCode.set(code, subject);
      subjects.push(subject);
    } else {
      for (const date of dateKeys) {
        if (!subject.subjectAttendance.some((a) => a.date === date)) {
          subject.subjectAttendance.push({ att: "--", date });
        }
      }
    }

    const classDate = String(row.Class_date ?? "");
    const cell = subject.subjectAttendance.find((a) => a.date === classDate);
    if (cell) {
      const present = Number(row.Present_Classes) || 0;
      const total = Number(row.Total_Classes) || 0;
      cell.att = `${row.Present_Classes}/${row.Total_Classes}`;
      subject.present += present;
      subject.total += total;
    }
  }

  const first = raw[0] ?? {};
  return {
    dateKeys,
    subjects,
    studentName: pickText(first, ["Student_name", "studentName", "firstName"]),
    rollNumber: pickText(first, ["Roll_no", "roll_number", "rollNumber"]),
  };
}

function toGridRows(subjects: SubjectPivot[]): AnyRow[] {
  return subjects.map((s) => {
    const cells: Record<string, string> = {};
    for (const a of s.subjectAttendance) {
      cells[dateFieldKey(a.date)] = a.att;
    }
    return {
      Subject_name: s.Subject_name,
      Subject_code: s.Subject_code,
      subjectDisplay: s.Subject_code
        ? `${s.Subject_name} (${s.Subject_code})`
        : s.Subject_name,
      present: s.present,
      absent: s.total - s.present,
      ...cells,
    };
  });
}

function subjectCellRenderer(p: ICellRendererParams<AnyRow>) {
  const name = String(p.data?.Subject_name ?? "");
  const code = String(p.data?.Subject_code ?? "");
  if (!code) return name;
  return (
    <span>
      {name} (<span className="text-blue-600">{code}</span>)
    </span>
  );
}

export default function StudentAttendanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [studentId, setStudentId] = useState("");
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [gridRows, setGridRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const clearResults = useCallback(() => {
    setDateKeys([]);
    setGridRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const f = useAttendanceReportFilters({
    autoSelectFirstSection: false,
    onClearResults: clearResults,
  });

  const collegeNum = Number(f.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  useEffect(() => {
    setStudentId("");
    setStudentOptions([]);
    const cid = Number(f.collegeId || 0);
    const g = Number(f.courseGroupId || 0);
    const sec = Number(f.sectionId || 0);
    if (!cid || !g || !sec) return;

    let cancelled = false;
    setLoadingStudents(true);
    void fetchAttendanceReportStudents({
      collegeId: cid,
      courseGroupId: g,
      groupSectionId: sec,
    })
      .then((rows) => {
        if (cancelled) return;
        const opts: SelectOption[] = rows
          .map((row) => {
            const id = pickNum(row, [
              "studentId",
              "student_id",
              "pk_student_id",
            ]);
            const name = pickText(row, [
              "firstName",
              "student_name",
              "Student_name",
            ]);
            const roll = pickText(row, [
              "rollNumber",
              "roll_number",
              "Roll_no",
            ]);
            const label = roll ? `${name} (${roll})` : name || String(id);
            return { value: String(id), label };
          })
          .filter((o) => o.value && o.value !== "0");
        setStudentOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [f.collegeId, f.courseGroupId, f.sectionId]);

  const onFromChange = (d: Date | null) => {
    setFromDate(d);
    clearResults();
    if (d && toDate && toDate.getTime() < d.getTime()) {
      setToDate(d);
    }
  };

  const onToChange = (d: Date | null) => {
    if (d && fromDate && d.getTime() < fromDate.getTime()) {
      setToDate(fromDate);
    } else {
      setToDate(d);
    }
    clearResults();
  };

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const dateCols: ColDef<AnyRow>[] = dateKeys.map((date) => {
      const field = dateFieldKey(date);
      return {
        field,
        headerName: formatDateHeader(date),
        minWidth: 100,
        flex: 0,
        cellStyle: { textAlign: "center" },
        valueGetter: (p) => {
          const v = p.data?.[field];
          return v == null || v === "" ? "--" : String(v);
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
        field: "subjectDisplay",
        headerName: "Subject",
        minWidth: 220,
        cellRenderer: subjectCellRenderer,
      },
      ...dateCols,
      {
        field: "present",
        headerName: "Present Classes",
        minWidth: 120,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "absent",
        headerName: "Absent Classes",
        minWidth: 120,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
    ];
  }, [dateKeys]);

  const excelColumns = useMemo(() => {
    const cols: { key: string; header: string }[] = [
      { key: "siNo", header: "S.No" },
      { key: "subjectDisplay", header: "Subject" },
    ];
    for (const date of dateKeys) {
      cols.push({
        key: dateFieldKey(date),
        header: formatDateHeader(date),
      });
    }
    cols.push(
      { key: "present", header: "Present Classes" },
      { key: "absent", header: "Absent Classes" },
    );
    return cols;
  }, [dateKeys]);

  const exportFlatRows = useMemo(
    () =>
      gridRows.map((row, i) => {
        const flat: Record<string, unknown> = {
          siNo: i + 1,
          subjectDisplay: String(row.subjectDisplay ?? ""),
          present: String(row.present ?? ""),
          absent: String(row.absent ?? ""),
        };
        for (const date of dateKeys) {
          const field = dateFieldKey(date);
          flat[field] = String(row[field] ?? "--");
        }
        return flat;
      }),
    [dateKeys, gridRows],
  );

  const handleGetList = async () => {
    const cid = Number(f.collegeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!f.academicYearId) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!f.courseId || !f.courseGroupId || !f.courseYearId) {
      toastInfo("Course, Course Group and Course Year are required");
      return;
    }
    if (!f.sectionId || f.sectionId === "0") {
      toastInfo("Section is required");
      return;
    }
    if (!studentId) {
      toastInfo("Student is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    setLoadingList(true);
    clearResults();
    const from = formatYmd(fromDate);
    const to = formatYmd(toDate);
    const studentLabel =
      studentOptions.find((o) => o.value === studentId)?.label ?? "";
    try {
      const [raw, college] = await Promise.all([
        fetchStudentAttendanceDaywiseReport({
          collegeId: cid,
          academicYearId: Number(f.academicYearId),
          courseId: Number(f.courseId),
          courseGroupId: Number(f.courseGroupId),
          courseYearId: Number(f.courseYearId),
          sectionId: Number(f.sectionId),
          studentId: Number(studentId),
          fromDate: from,
          toDate: to,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
            f.collegeOptions.find((o) => o.value === f.collegeId)?.label ??
            "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No attendance records found.");
        setShowTable(false);
        return;
      }
      const pivoted = pivotDaywiseRows(raw);
      const studentDetail =
        pivoted.studentName || pivoted.rollNumber
          ? `${pivoted.studentName}${pivoted.rollNumber ? ` (${pivoted.rollNumber})` : ""}`
          : studentLabel;
      const details = f.buildDataDetails(
        [from, to, studentDetail].filter(Boolean),
      );
      setDataDetails(details);
      setDateKeys(pivoted.dateKeys);
      setGridRows(toGridRows(pivoted.subjects));
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
      setShowTable(false);
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildHtmlTable(excelColumns, exportFlatRows),
      headerHtml,
    );
  }, [dataDetails, excelColumns, exportFlatRows]);

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
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${buildHtmlTable(excelColumns, exportFlatRows)}
</body></html>`);
  }, [
    collegeLogo,
    collegeName,
    dataDetails,
    excelColumns,
    exportFlatRows,
    orgCode,
  ]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} — ${dataDetails}`
          : REPORT_TITLE
      }
      filters={
        <div className="space-y-3">
          {/* Row 1: College → Section */}
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Select
              label="College"
              required
              value={f.collegeId || null}
              onChange={f.onCollegeChange}
              options={f.collegeOptions}
              placeholder="College"
              isLoading={f.loadingFilters}
            />
            <Select
              label="Academic Year"
              required
              value={f.academicYearId || null}
              onChange={f.onAyChange}
              options={f.ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Course"
              required
              value={f.courseId || null}
              onChange={f.onCourseChange}
              options={f.courseOptions}
              placeholder="Course"
              disabled={!f.collegeId}
            />
            <Select
              label="Course Group"
              required
              value={f.courseGroupId || null}
              onChange={f.onGroupChange}
              options={f.groupOptions}
              placeholder="Course Group"
              disabled={!f.courseId}
            />
            <Select
              label="Course Year"
              required
              value={f.courseYearId || null}
              onChange={f.onYearChange}
              options={f.yearOptions}
              placeholder="Course Year"
              disabled={!f.courseGroupId}
            />
            <Select
              label="Section"
              required
              value={f.sectionId || null}
              onChange={(v) => {
                f.onSectionChange(v);
                setStudentId("");
              }}
              options={f.sectionOptions}
              placeholder="Section"
              disabled={!f.courseYearId}
            />
          </div>

          {/* Row 2: Student (wide) + dates + actions */}
          <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
            <div className="min-w-[18rem] w-[40%] max-w-[28rem] shrink-0 grow">
              <Select
                label="Student"
                required
                searchable
                value={studentId || null}
                onChange={(v) => {
                  setStudentId(v ?? "");
                  clearResults();
                }}
                options={studentOptions}
                placeholder="Student"
                isLoading={loadingStudents}
                disabled={!f.sectionId}
              />
            </div>
            <div className="w-[11rem] shrink-0">
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={onFromChange}
                displayFormat="dd-MM-yyyy"
                clearable={false}
              />
            </div>
            <div className="w-[11rem] shrink-0">
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={onToChange}
                displayFormat="dd-MM-yyyy"
                minDate={fromDate ?? undefined}
                clearable={false}
              />
            </div>
            <Button
              type="button"
              className="h-9 w-fit shrink-0 px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
            <Button
              type="button"
              className="h-9 min-w-20 shrink-0 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
              onClick={goBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      showTable={showTable}
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
    />
  );
}

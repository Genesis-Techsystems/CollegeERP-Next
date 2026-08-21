"use client";

/**
 * Student Daily Attendance Report —
 * Angular `daily-attendance-report` and `daily-period-attendance-report` parity
 * (College / AY / Course / Group / Year / Section / Date; table after Get).
 * On-screen grid uses FilteredListPage (same UI as Day-wise Attendance Summary).
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { exportHtmlTableAsExcel } from "@/common/export-html-table";
import { DataTable } from "@/common/components/table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import {
  fetchDailyAttendancePeriodWiseReport,
  getCollegeById,
} from "@/services";
import {
  useAttendanceReportFilters,
  formatYmd,
  buildBannerHtml,
  escapeHtml,
} from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

type PeriodBatch = {
  batch_name: string | null;
  subject: string;
  sub_short_name: unknown;
  Subject_name: unknown;
};

type GroupedPeriod = {
  Period_no: string;
  timeset: unknown;
  subject_type: string;
  subject: unknown;
  sub_short_name: unknown;
  Subject_name: unknown;
  batches: PeriodBatch[];
};

type StudentAtt = {
  rollNumber: string;
  firstName: string;
  Father_Mobile_No: unknown;
  classes_attended: unknown;
  total_clasess: unknown;
};

type UniqueKey = {
  subject: string;
  sub_short_name: unknown;
  Faculty: unknown;
  Period_no: unknown;
  batch_name: unknown;
  Subject_name: unknown;
  subject_type: unknown;
  sub_credits: unknown;
};

type AttCol = {
  field: string;
  period: GroupedPeriod;
  key: string | null;
  childHeader: string;
};

type GridRow = {
  __rowId: string;
  siNo: string | number;
  rollNumber: string;
  student: string;
  studentName: string;
  studentMobile: string;
  totalPeriods: string;
} & Record<string, string | number | boolean | undefined>;

type NoteRow = {
  __rowId: string;
  siNo: number;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  faculty: string;
  creditPoints: string;
};

const REPORT_TITLE = "Student Daily Attendance Report";
const PRINT_TITLE = "Day Wise Attendance Report";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function formatPrintedDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
}

function attField(periodNo: string, key: string | null): string {
  const safe = `${periodNo}_${key ?? "_"}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `att_${safe}`;
}

function findAttendanceRecord(
  resultList: AnyRow[],
  student: StudentAtt,
  periodNo: string,
  key: string | null,
): AnyRow | undefined {
  return resultList.find((r) => {
    if (str(r.RollNo) !== student.rollNumber) return false;
    if (str(r.Period_no) !== periodNo) return false;
    const type = str(r.subject_type);
    if (type === "LAB") return str(r.batch_name) === (key ?? "");
    if (type === "ELECTIVE") return str(r.subject_short_name) === (key ?? "");
    return true;
  });
}

function getAttendance(
  resultList: AnyRow[],
  student: StudentAtt,
  periodNo: string,
  key: string | null,
): string {
  const record = findAttendanceRecord(resultList, student, periodNo, key);
  return record ? str(record.Present_Classes) || "-" : "-";
}

function transformDailyRows(rows: AnyRow[]) {
  const groupedPeriods: GroupedPeriod[] = [];
  const studentAttendance: StudentAtt[] = [];

  for (const item of rows) {
    const periodName = str(item.Period_no);
    let periodGroup = groupedPeriods.find((x) => x.Period_no === periodName);
    if (!periodGroup) {
      periodGroup = {
        Period_no: periodName,
        timeset: item.timeset,
        subject_type: str(item.subject_type),
        subject: item.subject_short_name,
        sub_short_name: item.sub_short_name,
        Subject_name: item.Subject_name,
        batches: [],
      };
      groupedPeriods.push(periodGroup);
    }
    if (str(item.subject_type) === "LAB") {
      const exists = periodGroup.batches.some(
        (b) => b.batch_name === str(item.batch_name),
      );
      if (!exists) {
        periodGroup.batches.push({
          batch_name: str(item.batch_name),
          subject: str(item.subject_short_name),
          sub_short_name: item.sub_short_name,
          Subject_name: item.Subject_name,
        });
      }
    } else if (str(item.subject_type) === "ELECTIVE") {
      const exists = periodGroup.batches.some(
        (b) => b.subject === str(item.subject_short_name),
      );
      if (!exists) {
        periodGroup.batches.push({
          batch_name: null,
          subject: str(item.subject_short_name),
          Subject_name: item.Subject_name,
          sub_short_name: item.sub_short_name,
        });
      }
    }
  }

  for (const item of rows) {
    const roll = str(item.RollNo);
    if (!studentAttendance.some((s) => s.rollNumber === roll)) {
      studentAttendance.push({
        rollNumber: roll,
        firstName: str(item.Student_name),
        Father_Mobile_No: item.Father_Mobile_No,
        classes_attended: item.classes_attended,
        total_clasess: item.total_clasess,
      });
    }
  }

  groupedPeriods.sort((a, b) => a.Period_no.localeCompare(b.Period_no));

  const uniqueKeys: UniqueKey[] = Array.from(
    rows
      .reduce((map, item) => {
        const key = str(item.subject_short_name);
        if (!map.has(key)) {
          map.set(key, {
            subject: key,
            sub_short_name: item.sub_short_name,
            Faculty: item.Faculty,
            Period_no: item.Period_no,
            batch_name: item.batch_name,
            Subject_name: item.Subject_name,
            subject_type: item.subject_type,
            sub_credits: item.sub_credits,
          });
        }
        return map;
      }, new Map<string, UniqueKey>())
      .values(),
  );

  return {
    groupedPeriods,
    studentAttendance,
    uniqueKeys,
    resultList: rows,
  };
}

function collectAttCols(groupedPeriods: GroupedPeriod[]): AttCol[] {
  const cols: AttCol[] = [];
  for (const period of groupedPeriods) {
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    if (!isSplit) {
      cols.push({
        field: attField(period.Period_no, null),
        period,
        key: null,
        childHeader: `(${str(period.subject)})`,
      });
      continue;
    }
    for (const batch of period.batches) {
      const key =
        period.subject_type === "LAB" ? str(batch.batch_name) : batch.subject;
      const childHeader =
        period.subject_type === "LAB" && str(batch.batch_name)
          ? `${str(batch.batch_name)}(${batch.subject})`
          : `(${batch.subject})`;
      cols.push({
        field: attField(period.Period_no, key),
        period,
        key,
        childHeader,
      });
    }
  }
  return cols;
}

function presentCellRenderer(p: ICellRendererParams<GridRow>) {
  const val = str(p.value);
  if (val === "A") {
    return <span className="font-semibold text-red-600">{val}</span>;
  }
  return val || "-";
}

/** Angular AMS: `firstName (Father_Mobile_No)` with the number in blue. */
function studentCellRenderer(p: ICellRendererParams<GridRow>) {
  const row = p.data;
  if (!row) return "";
  if (!row.studentName) return row.student || "";
  return (
    <span>
      {row.studentName}
      {row.studentMobile ? (
        <>
          {" "}
          (<span className="text-[#0014ff]">{row.studentMobile}</span>)
        </>
      ) : null}
    </span>
  );
}

const LEADING_COLS: ColDef<GridRow>[] = [
  {
    colId: "siNo",
    field: "siNo",
    headerName: "S.No",
    // Caps let the period matrix absorb the leftover width, not the ID columns.
    width: 70,
    minWidth: 60,
    maxWidth: 90,
    pinned: "left",
    sortable: false,
    filter: false,
  },
  {
    colId: "rollNumber",
    field: "rollNumber",
    headerName: "Roll No.",
    minWidth: 110,
    maxWidth: 150,
    pinned: "left",
  },
  {
    colId: "student",
    field: "student",
    headerName: "Student",
    minWidth: 180,
    maxWidth: 260,
    pinned: "left",
    cellRenderer: studentCellRenderer,
  },
];

function periodHeaderTooltip(col: AttCol): string {
  const batch = col.period.batches.find((b) =>
    col.period.subject_type === "LAB"
      ? str(b.batch_name) === (col.key ?? "")
      : b.subject === (col.key ?? ""),
  );
  return str(batch?.Subject_name ?? col.period.Subject_name);
}

function buildGridColumnDefs(attCols: AttCol[]): ColDef<GridRow>[] {
  const cols: ColDef<GridRow>[] = [...LEADING_COLS];

  for (const col of attCols) {
    cols.push({
      colId: col.field,
      field: col.field,
      headerName: `${col.period.Period_no}\n${col.childHeader}`,
      headerTooltip: periodHeaderTooltip(col),
      headerClass: "app-header-lines",
      wrapHeaderText: true,
      autoHeaderHeight: true,
      minWidth: 110,
      cellDataType: false,
      cellRenderer: presentCellRenderer,
      cellClass: "text-center",
    });
  }

  return cols;
}

const NOTE_COL_DEFS = {
  siNo: {
    field: "siNo",
    headerName: "S.No",
    width: 80,
    minWidth: 70,
    maxWidth: 90,
    sortable: false,
    filter: false,
  } as ColDef<NoteRow>,
  subjectCode: {
    field: "subjectCode",
    headerName: "Subject Code",
    minWidth: 130,
  } as ColDef<NoteRow>,
  subject: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 220,
    flex: 1,
  } as ColDef<NoteRow>,
  faculty: {
    field: "faculty",
    headerName: "Faculty",
    minWidth: 160,
  } as ColDef<NoteRow>,
  creditPoints: {
    field: "creditPoints",
    headerName: "Credit Points",
    minWidth: 120,
    maxWidth: 150,
    cellClass: "text-center",
  } as ColDef<NoteRow>,
};

function noteSubjectRenderer(p: ICellRendererParams<NoteRow>) {
  const name = p.data?.subjectName ?? "";
  const type = p.data?.subjectType ?? "";
  if (!type) return name;
  return (
    <span>
      {name} (<span className="text-[#0014ff]">{type}</span>)
    </span>
  );
}

function buildNoteColumnDefs(): ColDef<NoteRow>[] {
  return [
    NOTE_COL_DEFS.siNo,
    NOTE_COL_DEFS.subjectCode,
    { ...NOTE_COL_DEFS.subject, cellRenderer: noteSubjectRenderer },
    NOTE_COL_DEFS.faculty,
    NOTE_COL_DEFS.creditPoints,
  ];
}

function buildNoteRows(uniqueKeys: UniqueKey[]): NoteRow[] {
  return uniqueKeys.map((key, i) => ({
    __rowId: `note-${key.subject}-${i}`,
    siNo: i + 1,
    subjectCode: key.subject,
    subjectName: str(key.Subject_name),
    subjectType: str(key.subject_type),
    faculty: str(key.Faculty),
    creditPoints: str(key.sub_credits),
  }));
}

function buildGridRows(opts: {
  studentAttendance: StudentAtt[];
  resultList: AnyRow[];
  attCols: AttCol[];
}): GridRow[] {
  const { studentAttendance, resultList, attCols } = opts;

  return studentAttendance.map((student, i) => {
    const total =
      student.classes_attended != null || student.total_clasess != null
        ? `${str(student.classes_attended) || "0"}/${str(student.total_clasess) || "0"}`
        : "";
    const mobile = str(student.Father_Mobile_No);
    const row: GridRow = {
      __rowId: `stu-${student.rollNumber}`,
      siNo: i + 1,
      rollNumber: student.rollNumber,
      student: mobile ? `${student.firstName} (${mobile})` : student.firstName,
      studentName: student.firstName,
      studentMobile: mobile,
      totalPeriods: total,
    };
    for (const col of attCols) {
      row[col.field] = getAttendance(
        resultList,
        student,
        col.period.Period_no,
        col.key,
      );
    }
    return row;
  });
}

function buildPeriodHeaderCells(groupedPeriods: GroupedPeriod[]): string {
  const attCols = collectAttCols(groupedPeriods);
  return attCols
    .map((col) => {
      return `<th style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;vertical-align:middle;" title="${escapeHtml(periodHeaderTooltip(col))}">
        <div>${escapeHtml(col.period.Period_no)}</div>
        <div>${escapeHtml(col.childHeader)}</div>
      </th>`;
    })
    .join("");
}

function buildPeriodBodyCells(
  resultList: AnyRow[],
  student: StudentAtt,
  groupedPeriods: GroupedPeriod[],
): string {
  let cells = "";
  for (const period of groupedPeriods) {
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    if (!isSplit) {
      const val = getAttendance(resultList, student, period.Period_no, null);
      const cls = val === "A" ? "color:#c00;font-weight:600;" : "";
      cells += `<td style="border:1px solid #333;padding:3px 5px;text-align:center;${cls}">${escapeHtml(val)}</td>`;
    } else {
      for (const batch of period.batches) {
        const key =
          period.subject_type === "LAB" ? batch.batch_name : batch.subject;
        const val = getAttendance(resultList, student, period.Period_no, key);
        const cls = val === "A" ? "color:#c00;font-weight:600;" : "";
        cells += `<td style="border:1px solid #333;padding:3px 5px;text-align:center;${cls}">${escapeHtml(val)}</td>`;
      }
    }
  }
  return cells;
}

function buildReportTableHtml(opts: {
  groupedPeriods: GroupedPeriod[];
  studentAttendance: StudentAtt[];
  uniqueKeys: UniqueKey[];
  resultList: AnyRow[];
}): string {
  const { groupedPeriods, studentAttendance, uniqueKeys, resultList } = opts;
  const periodHeaders = buildPeriodHeaderCells(groupedPeriods);

  const body = studentAttendance
    .map((student, i) => {
      const mobile = str(student.Father_Mobile_No);
      const studentCell = mobile
        ? `${escapeHtml(student.firstName)} (<span style="color:blue;">${escapeHtml(mobile)}</span>)`
        : escapeHtml(student.firstName);
      return `<tr>
        <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(student.rollNumber)}</td>
        <td style="border:1px solid #333;padding:3px 5px;">${studentCell}</td>
        ${buildPeriodBodyCells(resultList, student, groupedPeriods)}
      </tr>`;
    })
    .join("");

  const noteBody = uniqueKeys
    .map(
      (key, i) => `<tr>
      <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(key.subject)}</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(str(key.Subject_name))} (<span style="color:blue;">${escapeHtml(str(key.subject_type))}</span>)</td>
      <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(str(key.Faculty))}</td>
      <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${escapeHtml(str(key.sub_credits))}</td>
    </tr>`,
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;font-size:10px;">
  <thead>
    <tr>
      <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">S.No</th>
      <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Roll No.</th>
      <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Student</th>
      ${periodHeaders}
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>
<div style="padding:8px 0;margin-top:8px;">
  <p style="margin:7px 0;"><span style="font-weight:500;color:red;">Note :</span></p>
  <table style="width:100%;border-collapse:collapse;font-size:10px;">
    <thead>
      <tr>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">S.No</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Subject Code</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Subject</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Faculty</th>
        <th style="border:1px solid #333;padding:4px;background:#e8f0fe;">Credit Points</th>
      </tr>
    </thead>
    <tbody>${noteBody}</tbody>
  </table>
</div>`;
}

export default function DailyAttendancePeriodWiseReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [clsDate, setClsDate] = useState<Date | null>(() => new Date());
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [groupedPeriods, setGroupedPeriods] = useState<GroupedPeriod[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAtt[]>([]);
  const [uniqueKeys, setUniqueKeys] = useState<UniqueKey[]>([]);
  const [resultList, setResultList] = useState<AnyRow[]>([]);

  const clearResults = useCallback(() => {
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
    setGroupedPeriods([]);
    setStudentAttendance([]);
    setUniqueKeys([]);
    setResultList([]);
  }, []);

  const filters = useAttendanceReportFilters({
    autoSelectFirstSection: false,
    onClearResults: clearResults,
  });

  const collegeNum = Number(filters.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const attCols = useMemo(
    () => collectAttCols(groupedPeriods),
    [groupedPeriods],
  );

  const columnDefs = useMemo(() => buildGridColumnDefs(attCols), [attCols]);

  const gridRows = useMemo(
    () =>
      showTable
        ? buildGridRows({
            studentAttendance,
            resultList,
            attCols,
          })
        : [],
    [showTable, studentAttendance, resultList, attCols],
  );

  const noteColumnDefs = useMemo(() => buildNoteColumnDefs(), []);
  const noteRows = useMemo(
    () => (showTable ? buildNoteRows(uniqueKeys) : []),
    [showTable, uniqueKeys],
  );

  const tableHtml = useMemo(() => {
    if (!showTable || studentAttendance.length === 0) return "";
    return buildReportTableHtml({
      groupedPeriods,
      studentAttendance,
      uniqueKeys,
      resultList,
    });
  }, [showTable, groupedPeriods, studentAttendance, uniqueKeys, resultList]);

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
    if (!clsDate) {
      toastInfo("Date is required");
      return;
    }

    setLoadingList(true);
    clearResults();
    const dateStr = formatYmd(clsDate);
    const details = filters.buildDataDetails([dateStr]);
    setDataDetails(details);

    try {
      const [raw, college] = await Promise.all([
        fetchDailyAttendancePeriodWiseReport({
          collegeId: cid,
          academicYearId: Number(filters.academicYearId || 0),
          courseYearId: Number(filters.courseYearId || 0),
          courseGroupId: Number(filters.courseGroupId || 0),
          sectionId: Number(filters.sectionId || 0),
          clsDate: dateStr,
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
      const transformed = transformDailyRows(raw.rows ?? []);
      if (transformed.studentAttendance.length === 0) {
        toastInfo("No attendance records found.");
        return;
      }
      setGroupedPeriods(transformed.groupedPeriods);
      setStudentAttendance(transformed.studentAttendance);
      setUniqueKeys(transformed.uniqueKeys);
      setResultList(transformed.resultList);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = useCallback(() => {
    if (!tableHtml) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(PRINT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, tableHtml]);

  const handlePrintReport = useCallback(() => {
    if (!tableHtml) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: PRINT_TITLE,
      orgCode,
    });
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${PRINT_TITLE}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
<div style="font-size:11px;margin:0 0 6px;">Printed Date : ${formatPrintedDate(new Date())}</div>
${tableHtml}
</body></html>`);
  }, [collegeLogo, collegeName, dataDetails, orgCode, tableHtml]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle =
    showTable && dataDetails
      ? `${REPORT_TITLE} - ${dataDetails}`
      : REPORT_TITLE;

  return (
    <FilteredListPage<GridRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          {/* Row 1: College → Section (Angular fxFlex row of 6) */}
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Select
              label="College"
              required
              value={filters.collegeId || null}
              onChange={filters.onCollegeChange}
              options={filters.collegeOptions}
              placeholder="College"
              isLoading={filters.loadingFilters}
            />
            <Select
              label="Academic Year"
              required
              value={filters.academicYearId || null}
              onChange={filters.onAyChange}
              options={filters.ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Course"
              required
              value={filters.courseId || null}
              onChange={filters.onCourseChange}
              options={filters.courseOptions}
              placeholder="Course"
              disabled={!filters.collegeId}
            />
            <Select
              label="Course Group"
              required
              value={filters.courseGroupId || null}
              onChange={filters.onGroupChange}
              options={filters.groupOptions}
              placeholder="Course Group"
              disabled={!filters.courseId}
            />
            <Select
              label="Course Year"
              required
              value={filters.courseYearId || null}
              onChange={filters.onYearChange}
              options={filters.yearOptions}
              placeholder="Course Year"
              disabled={!filters.courseGroupId}
            />
            <Select
              label="Section"
              required
              value={filters.sectionId || null}
              onChange={filters.onSectionChange}
              options={filters.sectionOptions}
              placeholder="Section"
              disabled={!filters.courseYearId}
            />
          </div>

          {/* Row 2: Date (same col width) + Get / Back */}
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DatePicker
              label="Date"
              required
              value={clsDate}
              maxDate={today}
              clearable={false}
              displayFormat="dd/MM/yyyy"
              onChange={(d) => {
                setClsDate(d);
                clearResults();
              }}
            />
            <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-2">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                {loadingList ? "Loading…" : "Get Daily Attendance"}
              </Button>
              <Button
                type="button"
                className="h-9 min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
                onClick={goBack}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      }
      showTable={showTable}
      rowData={gridRows}
      columnDefs={columnDefs}
      rowHeight={48}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      autoHeight
      getRowId={(p) => String(p.data?.__rowId ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <>
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
          </>
        ) : null
      }
      afterGrid={
        showTable && noteRows.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-red-600">Note :</p>
            <DataTable<NoteRow>
              title=""
              bordered={false}
              rowData={noteRows}
              columnDefs={noteColumnDefs}
              pagination={false}
              columnFilters={false}
              autoHeight
              getRowId={(p) => String(p.data?.__rowId ?? "")}
              toolbar={false}
            />
          </div>
        ) : null
      }
    />
  );
}

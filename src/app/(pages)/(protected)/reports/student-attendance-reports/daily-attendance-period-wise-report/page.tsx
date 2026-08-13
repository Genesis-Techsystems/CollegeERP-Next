"use client";

/**
 * Student Daily Attendance Report —
 * Angular `daily-attendance-report` and `daily-period-attendance-report` parity
 * (College / AY / Course / Group / Year / Section / Date; table after Get).
 * On-screen grid uses FilteredListPage (same UI as Day-wise Attendance Summary).
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ColDef,
  ColGroupDef,
  ICellRendererParams,
} from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { exportHtmlTableAsExcel } from "@/common/export-html-table";
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

type PeriodTotals = { present: number; absent: number; strength: number };

/** Angular footer rows under the period matrix. */
const TOTAL_ROWS: {
  id: string;
  label: string;
  pick: (t: PeriodTotals) => number;
}[] = [
  { id: "total-present", label: "Total Present", pick: (t) => t.present },
  { id: "total-absent", label: "Total Absent", pick: (t) => t.absent },
  { id: "total-strength", label: "Total Strength", pick: (t) => t.strength },
];

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

/** Strength counts students with a record for the period, marked or not. */
function computeColumnTotals(
  resultList: AnyRow[],
  studentAttendance: StudentAtt[],
  periodNo: string,
  key: string | null,
): PeriodTotals {
  let present = 0;
  let absent = 0;
  let strength = 0;
  for (const student of studentAttendance) {
    const record = findAttendanceRecord(resultList, student, periodNo, key);
    if (!record) continue;
    strength += 1;
    const val = str(record.Present_Classes);
    if (val === "A") absent += 1;
    else if (val !== "" && val !== "-") present += 1;
  }
  return { present, absent, strength };
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
        childHeader: `${str(period.subject)}\n(${period.subject_type})`,
      });
      continue;
    }
    for (const batch of period.batches) {
      const key =
        period.subject_type === "LAB" ? str(batch.batch_name) : batch.subject;
      const childHeader =
        period.subject_type === "LAB"
          ? `${str(batch.batch_name)} (${batch.subject})\n(${period.subject_type})`
          : `${batch.subject}\n(${period.subject_type})`;
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

/** Angular renders the student name and father's mobile on separate lines. */
function studentCellRenderer(p: ICellRendererParams<GridRow>) {
  const row = p.data;
  if (!row) return "";
  // Total rows carry their label here so the column borders stay unbroken.
  if (!row.studentName) return row.student || "";
  return (
    <div className="leading-tight">
      <div>{row.studentName}</div>
      {row.studentMobile ? <div>({row.studentMobile})</div> : null}
    </div>
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
    // Total rows leave this blank; without this AG Grid infers a number column
    // and renders their empty label as "Invalid Number".
    cellDataType: false,
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
    cellStyle: (p) =>
      p.node?.rowPinned === "bottom"
        ? { textAlign: "right", fontWeight: 600 }
        : null,
  },
];

function buildGridColumnDefs(
  attCols: AttCol[],
): (ColDef<GridRow> | ColGroupDef<GridRow>)[] {
  const cols: (ColDef<GridRow> | ColGroupDef<GridRow>)[] = [...LEADING_COLS];

  const byPeriod = new Map<string, AttCol[]>();
  for (const col of attCols) {
    const list = byPeriod.get(col.period.Period_no) ?? [];
    list.push(col);
    byPeriod.set(col.period.Period_no, list);
  }

  for (const [, periodCols] of byPeriod) {
    const period = periodCols[0]?.period;
    if (!period) continue;
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    const groupHeader = `${str(period.timeset)}\n${period.Period_no}`;

    if (!isSplit) {
      const only = periodCols[0];
      cols.push({
        colId: only.field,
        field: only.field,
        headerName: `${groupHeader}\n${only.childHeader}`,
        headerTooltip: str(period.Subject_name),
        headerClass: "app-header-lines",
        wrapHeaderText: true,
        autoHeaderHeight: true,
        minWidth: 110,
        // Marks are text, totals rows are numbers — skip AG Grid type inference.
        cellDataType: false,
        cellRenderer: presentCellRenderer,
        cellClass: "text-center",
      });
      continue;
    }

    cols.push({
      headerName: groupHeader,
      headerClass: "app-header-lines",
      marryChildren: true,
      children: periodCols.map(
        (c) =>
          ({
            colId: c.field,
            field: c.field,
            headerName: c.childHeader,
            headerClass: "app-header-lines",
            headerTooltip: str(
              c.period.batches.find((b) =>
                c.period.subject_type === "LAB"
                  ? str(b.batch_name) === (c.key ?? "")
                  : b.subject === (c.key ?? ""),
              )?.Subject_name ?? c.period.Subject_name,
            ),
            wrapHeaderText: true,
            autoHeaderHeight: true,
            minWidth: 120,
            cellDataType: false,
            cellRenderer: presentCellRenderer,
            cellClass: "text-center",
          }) as ColDef<GridRow>,
      ),
    });
  }

  cols.push({
    colId: "totalPeriods",
    field: "totalPeriods",
    headerName: "Total Periods",
    minWidth: 100,
    maxWidth: 140,
    cellClass: "text-center",
  });

  return cols;
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

/** Angular Total Present / Absent / Strength footer, pinned so paging keeps it. */
function buildPinnedTotalRows(opts: {
  studentAttendance: StudentAtt[];
  resultList: AnyRow[];
  attCols: AttCol[];
}): GridRow[] {
  const { studentAttendance, resultList, attCols } = opts;
  if (studentAttendance.length === 0) return [];

  const totals = attCols.map((col) =>
    computeColumnTotals(
      resultList,
      studentAttendance,
      col.period.Period_no,
      col.key,
    ),
  );

  return TOTAL_ROWS.map(({ id, label, pick }) => {
    const row: GridRow = {
      __rowId: id,
      siNo: "",
      rollNumber: "",
      student: label,
      studentName: "",
      studentMobile: "",
      totalPeriods: "",
    };
    attCols.forEach((col, i) => {
      const t = totals[i];
      if (t) row[col.field] = pick(t);
    });
    return row;
  });
}

function buildPeriodHeaderCells(groupedPeriods: GroupedPeriod[]): {
  row1: string;
  row2: string;
} {
  let row1 = "";
  let row2 = "";
  for (const period of groupedPeriods) {
    const isSplit =
      period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
    if (!isSplit) {
      row1 += `<th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;vertical-align:middle;">
        <div>${escapeHtml(str(period.timeset))}</div>
        <div>${escapeHtml(period.Period_no)}</div>
        <div title="${escapeHtml(str(period.Subject_name))}">${escapeHtml(str(period.subject))}</div>
        <div>(${escapeHtml(period.subject_type)})</div>
      </th>`;
    } else {
      const colspan = Math.max(period.batches.length, 1);
      row1 += `<th colspan="${colspan}" style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;">
        <div>${escapeHtml(str(period.timeset))}</div>
        <div>${escapeHtml(period.Period_no)}</div>
      </th>`;
      for (const batch of period.batches) {
        const label =
          period.subject_type === "LAB"
            ? `${escapeHtml(str(batch.batch_name))} (${escapeHtml(batch.subject)})`
            : escapeHtml(batch.subject);
        row2 += `<th style="border:1px solid #333;padding:4px;background:#e8f0fe;text-align:center;" title="${escapeHtml(str(batch.Subject_name))}">
          ${label}
          <div>(${escapeHtml(period.subject_type)})</div>
        </th>`;
      }
    }
  }
  return { row1, row2 };
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

function buildTotalsRowsHtml(opts: {
  groupedPeriods: GroupedPeriod[];
  studentAttendance: StudentAtt[];
  resultList: AnyRow[];
}): string {
  const { groupedPeriods, studentAttendance, resultList } = opts;
  if (studentAttendance.length === 0) return "";
  const cell = "border:1px solid #333;padding:3px 5px;text-align:center;";

  return TOTAL_ROWS.map(({ label, pick }) => {
    let cells = "";
    for (const period of groupedPeriods) {
      const isSplit =
        period.subject_type === "LAB" || period.subject_type === "ELECTIVE";
      const keys = isSplit
        ? period.batches.map((b) =>
            period.subject_type === "LAB" ? b.batch_name : b.subject,
          )
        : [null];
      for (const key of keys) {
        const totals = computeColumnTotals(
          resultList,
          studentAttendance,
          period.Period_no,
          key,
        );
        cells += `<td style="${cell}">${pick(totals)}</td>`;
      }
    }
    return `<tr>
      <td colspan="3" style="border:1px solid #333;padding:3px 5px;text-align:right;font-weight:600;">${escapeHtml(label)}</td>
      ${cells}
      <td style="${cell}"></td>
    </tr>`;
  }).join("");
}

function buildReportTableHtml(opts: {
  groupedPeriods: GroupedPeriod[];
  studentAttendance: StudentAtt[];
  uniqueKeys: UniqueKey[];
  resultList: AnyRow[];
}): string {
  const { groupedPeriods, studentAttendance, uniqueKeys, resultList } = opts;
  const { row1, row2 } = buildPeriodHeaderCells(groupedPeriods);

  const body = studentAttendance
    .map((student, i) => {
      const total =
        student.classes_attended != null || student.total_clasess != null
          ? `${str(student.classes_attended) || "0"}/${str(student.total_clasess) || "0"}`
          : "";
      return `<tr>
        <td style="border:1px solid #333;padding:3px 5px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(student.rollNumber)}</td>
        <td style="border:1px solid #333;padding:3px 5px;">${escapeHtml(student.firstName)} (${escapeHtml(str(student.Father_Mobile_No))})</td>
        ${buildPeriodBodyCells(resultList, student, groupedPeriods)}
        <td style="border:1px solid #333;padding:3px 5px;mso-number-format:'\\@';">${escapeHtml(total)}</td>
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
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">S.No</th>
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">Roll No.</th>
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">Student</th>
      ${row1}
      <th rowspan="2" style="border:1px solid #333;padding:4px;background:#e8f0fe;">Total Periods</th>
    </tr>
    <tr>${row2}</tr>
  </thead>
  <tbody>${body}${buildTotalsRowsHtml({ groupedPeriods, studentAttendance, resultList })}</tbody>
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

  const pinnedTotalRows = useMemo(
    () =>
      showTable
        ? buildPinnedTotalRows({ studentAttendance, resultList, attCols })
        : [],
    [showTable, studentAttendance, resultList, attCols],
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="College"
              required
              value={filters.collegeId || null}
              onChange={filters.onCollegeChange}
              options={filters.collegeOptions}
              placeholder="College"
              isLoading={filters.loadingFilters}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Academic Year"
              required
              value={filters.academicYearId || null}
              onChange={filters.onAyChange}
              options={filters.ayOptions}
              placeholder="Academic Year"
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Course"
              required
              value={filters.courseId || null}
              onChange={filters.onCourseChange}
              options={filters.courseOptions}
              placeholder="Course"
              disabled={!filters.collegeId}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Course Group"
              required
              value={filters.courseGroupId || null}
              onChange={filters.onGroupChange}
              options={filters.groupOptions}
              placeholder="Course Group"
              disabled={!filters.courseId}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <Select
              label="Course Year"
              required
              value={filters.courseYearId || null}
              onChange={filters.onYearChange}
              options={filters.yearOptions}
              placeholder="Course Year"
              disabled={!filters.courseGroupId}
            />
          </div>
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
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
          <div className="w-full min-w-[9rem] sm:w-auto sm:min-w-[10rem]">
            <DatePicker
              label="Date"
              required
              value={clsDate}
              maxDate={today}
              clearable={false}
              displayFormat="dd-MMM-yyyy"
              onChange={(d) => {
                setClsDate(d);
                clearResults();
              }}
            />
          </div>
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
      }
      showTable={showTable}
      rowData={gridRows}
      columnDefs={columnDefs}
      pinnedBottomRowData={pinnedTotalRows}
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
        showTable && uniqueKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <p className="mb-2 text-sm font-medium text-red-600">Note :</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-border bg-muted/40 px-2 py-1.5 text-left">
                    S.No
                  </th>
                  <th className="border border-border bg-muted/40 px-2 py-1.5 text-left">
                    Subject Code
                  </th>
                  <th className="border border-border bg-muted/40 px-2 py-1.5 text-left">
                    Subject
                  </th>
                  <th className="border border-border bg-muted/40 px-2 py-1.5 text-left">
                    Faculty
                  </th>
                  <th className="border border-border bg-muted/40 px-2 py-1.5 text-left">
                    Credit Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {uniqueKeys.map((key, i) => (
                  <tr key={`${key.subject}-${i}`}>
                    <td className="border border-border px-2 py-1.5 text-center">
                      {i + 1}
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      {key.subject}
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      {str(key.Subject_name)} (
                      <span className="text-blue-600">
                        {str(key.subject_type)}
                      </span>
                      )
                    </td>
                    <td className="border border-border px-2 py-1.5">
                      {str(key.Faculty)}
                    </td>
                    <td className="border border-border px-2 py-1.5 text-center">
                      {str(key.sub_credits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null
      }
    />
  );
}

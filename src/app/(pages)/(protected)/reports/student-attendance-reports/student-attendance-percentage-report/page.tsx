"use client";

/**
 * Student Attendance Percentage Report —
 * Angular `reports/student-attendance-reports/student-attendance-percentage-report` parity.
 * Table appears only after Get List. Note subjects table is a DataTable below the grid.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CellClassParams,
  CellStyle,
  ColDef,
  ICellRendererParams,
} from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { FormModal } from "@/common/components/feedback";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchStudentAttendancePercentageReport,
  getCollegeById,
  sendBulkSmsToStudents,
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

type SmsStudentRow = {
  __rowId: string;
  rollNumber: string;
  firstName: string;
  Father_Mobile_No: string;
};

type NoteRow = {
  __rowId: string;
  siNo: number;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  faculty: string;
  creditPoints: string;
};

const REPORT_TITLE = "Student Attendance Percentage Report";
const SMS_MESSAGE = "You have less attendance percentage";

const SMS_COL_DEFS: ColDef<SmsStudentRow>[] = [
  {
    headerName: "S No",
    valueGetter: rowIndexGetter,
    width: 80,
    minWidth: 70,
    maxWidth: 90,
    sortable: false,
    filter: false,
  },
  {
    field: "rollNumber",
    headerName: "Roll No.",
    minWidth: 130,
  },
  {
    field: "firstName",
    headerName: "Student Name",
    minWidth: 180,
    flex: 1,
  },
  {
    field: "Father_Mobile_No",
    headerName: "Mobile No.",
    minWidth: 140,
  },
];

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

const NOTE_COLUMN_DEFS: ColDef<NoteRow>[] = [
  NOTE_COL_DEFS.siNo,
  NOTE_COL_DEFS.subjectCode,
  { ...NOTE_COL_DEFS.subject, cellRenderer: noteSubjectRenderer },
  NOTE_COL_DEFS.faculty,
  NOTE_COL_DEFS.creditPoints,
];

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

function buildNoteRows(keys: SubjectKey[]): NoteRow[] {
  return keys.map((key, i) => ({
    __rowId: `note-${key.subject}-${i}`,
    siNo: i + 1,
    subjectCode: key.subject,
    subjectName: str(key.Subject_name),
    subjectType: str(key.Subject_Type),
    faculty: str(key.Faculty),
    creditPoints: str(key.sub_credits),
  }));
}

function transformPercentageRows(rows: AnyRow[]): {
  keys: SubjectKey[];
  gridRows: AnyRow[];
  academicDetails: string;
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

  const academicDetails = str(
    rows.find((row) => str(row.Academic_details))?.Academic_details,
  );

  return { keys, gridRows, academicDetails };
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
  const [academicDetails, setAcademicDetails] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsSearch, setSmsSearch] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  const clearResults = useCallback(() => {
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
    setKeys([]);
    setGridRows([]);
    setAcademicDetails("");
    setSmsOpen(false);
    setSmsSearch("");
  }, []);

  const filters = useAttendanceReportFilters({
    autoSelectFirstSection: true,
    onClearResults: clearResults,
  });

  const collegeNum = Number(filters.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);
  const isManagementLogin = useMemo(() => {
    if (typeof globalThis.window === "undefined") return false;
    try {
      const storage = globalThis.localStorage;
      if (storage.getItem("isMgnt") === "true") return true;
      const roleName = String(storage.getItem("roleName") ?? "").toUpperCase();
      const userRole = String(storage.getItem("userRole") ?? "").toUpperCase();
      return (
        roleName.includes("MANAGEMENT") ||
        userRole.includes("MANAGEMENT") ||
        userRole.includes("MGNT")
      );
    } catch {
      return false;
    }
  }, []);

  const noteRows = useMemo(
    () => (showTable ? buildNoteRows(keys) : []),
    [showTable, keys],
  );

  /** Pinned top row: "No. of Classes" per subject (Angular parity). */
  const pinnedTopRowData = useMemo<AnyRow[]>(() => {
    if (!showTable || keys.length === 0) return [];
    const row: AnyRow = {
      rollNumber: "",
      studentDisplay: "No. of Classes",
      present: keys.reduce((sum, k) => sum + num(k.Total_classes), 0),
      totalPercenteage: "",
    };
    for (const k of keys) {
      row[subjectFieldKey(k.subject)] = num(k.Total_classes);
    }
    return [row];
  }, [showTable, keys]);

  const columnDefs = useMemo((): ColDef<AnyRow>[] => {
    const subjectCols = keys.map((key): ColDef<AnyRow> => {
      const field = subjectFieldKey(key.subject);
      const typeLabel = str(key.Subject_Type);
      return {
        field,
        headerName: typeLabel ? `${key.subject} (${typeLabel})` : key.subject,
        headerTooltip: str(key.Subject_name),
        minWidth: 110,
        flex: 0,
        cellStyle: (p) =>
          ({
            textAlign: "center",
            ...(p.node.rowPinned === "top"
              ? { fontWeight: 700, background: "#e8f0fe", color: "#0c51a4" }
              : {}),
          }) satisfies CellStyle,
        valueGetter: (p) => {
          const v = p.data?.[field];
          return v == null || v === "" ? "-" : String(v);
        },
      };
    });

    const pinnedCellStyle = (p: CellClassParams<AnyRow>): CellStyle | null =>
      p.node.rowPinned === "top"
        ? { fontWeight: 700, background: "#e8f0fe", color: "#0c51a4" }
        : null;

    return [
      {
        headerName: "S.No",
        valueGetter: (p) =>
          p.node?.rowPinned === "top" ? "" : rowIndexGetter(p),
        width: 70,
        flex: 0,
        cellStyle: pinnedCellStyle,
      },
      {
        field: "rollNumber",
        headerName: "Roll No.",
        minWidth: 110,
        cellStyle: pinnedCellStyle,
      },
      {
        field: "studentDisplay",
        headerName: "Student",
        minWidth: 180,
        cellStyle: (p) =>
          p.node?.rowPinned === "top"
            ? ({
                fontWeight: 700,
                background: "#e8f0fe",
                color: "#0c51a4",
              } satisfies CellStyle)
            : null,
      },
      ...subjectCols,
      {
        field: "present",
        headerName: "Total",
        minWidth: 90,
        flex: 0,
        cellStyle: (p) =>
          ({
            textAlign: "center",
            ...(p.node?.rowPinned === "top"
              ? { fontWeight: 700, background: "#e8f0fe", color: "#0c51a4" }
              : {}),
          }) satisfies CellStyle,
      },
      {
        field: "totalPercenteage",
        headerName: "Percentage(%)",
        minWidth: 120,
        flex: 0,
        cellStyle: (p) =>
          ({
            textAlign: "center",
            ...(p.node?.rowPinned === "top"
              ? { fontWeight: 700, background: "#e8f0fe", color: "#0c51a4" }
              : {}),
          }) satisfies CellStyle,
        valueGetter: (p) => {
          if (p.node?.rowPinned === "top") return "";
          const v = p.data?.totalPercenteage;
          return v == null || v === "" ? "" : String(v);
        },
      },
    ];
  }, [keys]);

  const buildReportTableHtml = useCallback(() => {
    const headerCells: string[] = [
      "S.No",
      "Roll No.",
      "Student",
      ...keys.map((key) => {
        const typeLabel = str(key.Subject_Type);
        return typeLabel ? `${key.subject} (${typeLabel})` : key.subject;
      }),
      "Total",
      "Percentage(%)",
    ];
    const head = headerCells
      .map(
        (h) =>
          `<th style="border:1px solid #333;padding:4px 6px;background:#f3f4f6;">${escapeHtml(h)}</th>`,
      )
      .join("");

    const subjectCells = (row: AnyRow) =>
      keys
        .map((key) => {
          const f = subjectFieldKey(key.subject);
          const v = row[f];
          return `<td style="border:1px solid #333;padding:4px 6px;text-align:center;">${escapeHtml(String(v ?? "-"))}</td>`;
        })
        .join("");

    const body = gridRows
      .map((row, i) => {
        return `<tr>
      <td style="border:1px solid #333;padding:4px 6px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #333;padding:4px 6px;">${escapeHtml(String(row.rollNumber ?? ""))}</td>
      <td style="border:1px solid #333;padding:4px 6px;">${escapeHtml(String(row.studentDisplay ?? ""))}</td>
      ${subjectCells(row)}
      <td style="border:1px solid #333;padding:4px 6px;text-align:center;">${escapeHtml(String(row.present ?? ""))}</td>
      <td style="border:1px solid #333;padding:4px 6px;text-align:center;">${escapeHtml(String(row.totalPercenteage ?? ""))}</td>
    </tr>`;
      })
      .join("");

    return `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }, [gridRows, keys]);

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
      setAcademicDetails(transformed.academicDetails);
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
    if (gridRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    const tableHtml = buildReportTableHtml() + noteTableHtml;
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [buildReportTableHtml, dataDetails, gridRows.length, noteTableHtml]);

  const handlePrintReport = useCallback(() => {
    if (gridRows.length === 0) {
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
    const tableHtml = buildReportTableHtml() + noteTableHtml;
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
    buildReportTableHtml,
    collegeLogo,
    collegeName,
    dataDetails,
    gridRows.length,
    noteTableHtml,
    orgCode,
  ]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const smsRows = useMemo<SmsStudentRow[]>(
    () =>
      gridRows.map((row, i) => ({
        __rowId: `sms-${str(row.rollNumber)}-${i}`,
        rollNumber: str(row.rollNumber),
        firstName: str(row.firstName),
        Father_Mobile_No: str(row.Father_Mobile_No),
      })),
    [gridRows],
  );

  const filteredSmsRows = useMemo(() => {
    const q = smsSearch.trim().toLowerCase();
    if (!q) return smsRows;
    return smsRows.filter(
      (row) =>
        row.rollNumber.toLowerCase().includes(q) ||
        row.firstName.toLowerCase().includes(q) ||
        row.Father_Mobile_No.toLowerCase().includes(q),
    );
  }, [smsRows, smsSearch]);

  const openSmsModal = () => {
    if (isManagementLogin) return;
    if (gridRows.length === 0) {
      toastInfo("No students to send SMS.");
      return;
    }
    setSmsSearch("");
    setSmsOpen(true);
  };

  const handleSendSms = async () => {
    const collegeId = Number(filters.collegeId || 0);
    const academicYearId = Number(filters.academicYearId || 0);
    const courseId = Number(filters.courseId || 0);
    const courseGroupId = Number(filters.courseGroupId || 0);
    const courseYearId = Number(filters.courseYearId || 0);
    const groupSectionId = Number(filters.sectionId || 0);
    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      !groupSectionId
    ) {
      toastError("Please complete all filters");
      return;
    }
    const numbers = smsRows
      .map((row) => row.Father_Mobile_No.trim())
      .filter(Boolean);
    if (numbers.length === 0) {
      toastError("No student is selected with a valid mobile number.");
      return;
    }
    setSendingSms(true);
    try {
      await sendBulkSmsToStudents({
        collegeId,
        academicYearId,
        courseId,
        courseGroupId,
        courseYearId,
        groupSectionId,
        messageContent: SMS_MESSAGE,
        isSmsAlert: true,
        patternId: 2,
        numbers,
      });
      toastSuccess("SMS sent successfully");
      setSmsOpen(false);
      await handleGetList();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSendingSms(false);
    }
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
              className="h-9 min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
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
      showTable={showTable}
      resultsVisible={showTable}
      hideEmptyGrid
      pinnedTopRowData={pinnedTopRowData}
      getRowId={(p) => str(p.data?.rollNumber)}
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
            {/* {gridRows.length > 0 && !isManagementLogin ? (
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={openSmsModal}
              >
                Send SMS
              </Button>
            ) : null} */}
          </div>
        ) : undefined
      }
      afterGrid={
        showTable && noteRows.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-red-600">Note :</p>
            <DataTable<NoteRow>
              title=""
              bordered={false}
              rowData={noteRows}
              columnDefs={NOTE_COLUMN_DEFS}
              pagination={false}
              columnFilters={false}
              autoHeight
              getRowId={(p) => String(p.data?.__rowId ?? "")}
              toolbar={false}
            />
          </div>
        ) : null
      }
    >
      <FormModal
        open={smsOpen}
        onClose={() => {
          if (!sendingSms) setSmsOpen(false);
        }}
        title="Send SMS to Students"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendSms();
        }}
        submitLabel="Save"
        cancelLabel="Close"
        isSubmitting={sendingSms}
        size="lg"
      >
        <div className="space-y-3">
          {academicDetails || dataDetails ? (
            <span
              style={{ color: "#0c51a4" }}
              className="text-sm font-medium color-[#0c51a4]"
            >
              Course Details : {academicDetails || dataDetails}
            </span>
          ) : undefined}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-5">
            <SearchInput
              className="max-w-sm"
              placeholder="Student Name / Roll No."
              value={smsSearch}
              onChange={setSmsSearch}
            />
            <div className="text-sm">
              Selected Students Count :{" "}
              <span className="font-semibold">{smsRows.length}</span>
            </div>
          </div>
          <DataTable<SmsStudentRow>
            title=""
            bordered={false}
            rowData={filteredSmsRows}
            columnDefs={SMS_COL_DEFS}
            pagination={filteredSmsRows.length > 10}
            paginationPageSize={10}
            columnFilters={false}
            autoHeight
            getRowId={(p) => String(p.data?.__rowId ?? "")}
            toolbar={false}
          />
        </div>
      </FormModal>
    </FilteredListPage>
  );
}

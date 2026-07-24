"use client";

/**
 * Angular `student-academics/student-my-attendance` → `StudentMyAttendanceComponent`.
 * Subject-wise attendance % + total attendance header.
 * Reuses getAllRecords / loadStudentProfileTabData / buildStudentAttendanceView (no new APIs).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { useSession } from "@/hooks/useSession";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  buildStudentAttendanceView,
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  getAllRecords,
  loadStudentProfileTabData,
} from "@/services";

type AnyRow = Record<string, unknown>;

/** Angular `CONSTANTS.studentAttendancePercentageReportUrl` */
const ATTENDANCE_PER_PROC = "s_rep_tt_std_attendance_per";

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

function asProcRows(data: unknown): AnyRow[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      const first = data[0];
      if (Array.isArray(first)) return first as AnyRow[];
    }
    if (data.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      return data as AnyRow[];
    }
  }
  if (data && typeof data === "object") {
    const o = data as AnyRow;
    if (Array.isArray(o.result)) return asProcRows(o.result);
    if (Array.isArray(o.resultList)) return asProcRows(o.resultList);
  }
  return [];
}

/** Angular header: `studentAttendancePrecentage[0].percentage.toFixed(2)` */
function formatTotalAttendancePct(rows: AnyRow[]): string | null {
  for (const row of rows) {
    const hasSubject = Boolean(
      txt(row, ["Subject_name", "Subject_Code", "subjectName", "subjectCode"]),
    );
    if (hasSubject) continue;
    const pct = num(row, ["percentage", "Percentage", "attendancePercentage"]);
    if (pct > 0) return pct.toFixed(2);
  }

  const view = buildStudentAttendanceView(rows);
  if (view.totalClasses > 0) {
    return ((view.present / view.totalClasses) * 100).toFixed(2);
  }
  if (view.totalAttendancePct > 0) return view.totalAttendancePct.toFixed(2);
  return null;
}

function cellText(p: ValueGetterParams<AnyRow>, keys: string[]): string {
  return txt(p.data, keys) || "—";
}

function cellNum(p: ValueGetterParams<AnyRow>, keys: string[]): string {
  if (!p.data) return "—";
  for (const key of keys) {
    const v = p.data[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return String(v);
  }
  return "—";
}

function cellPct(p: ValueGetterParams<AnyRow>): string {
  if (!p.data) return "—";
  const raw = p.data.Percentage ?? p.data.percentage ?? p.data.attendancePercentage;
  if (raw == null || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return n.toFixed(2);
}

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectCode: {
    headerName: "Subject Code",
    minWidth: 130,
    valueGetter: (p) =>
      cellText(p, ["Subject_Code", "subjectCode", "subject_code"]),
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    minWidth: 200,
    valueGetter: (p) =>
      cellText(p, ["Subject_name", "subjectName", "subject_name"]),
  } as ColDef<AnyRow>,
  subjectType: {
    headerName: "Subject Type",
    minWidth: 130,
    valueGetter: (p) =>
      cellText(p, [
        "Subject_Type",
        "subjectType",
        "subjectTypeName",
        "subjectTypeCode",
      ]),
  } as ColDef<AnyRow>,
  credits: {
    headerName: "Credits",
    minWidth: 100,
    valueGetter: (p) =>
      cellNum(p, ["sub_credits", "subCredits", "credits"]),
  } as ColDef<AnyRow>,
  totalClasses: {
    headerName: "Total Classes",
    minWidth: 120,
    valueGetter: (p) =>
      cellNum(p, ["Total_classes", "totalClasses", "classesHeld"]),
  } as ColDef<AnyRow>,
  presentClasses: {
    headerName: "Present Classes",
    minWidth: 130,
    valueGetter: (p) =>
      cellNum(p, ["Present_classes", "present", "presentCount"]),
  } as ColDef<AnyRow>,
  absentClasses: {
    headerName: "Absent Classes",
    minWidth: 130,
    valueGetter: (p) =>
      cellNum(p, ["Absent_classes", "absent", "absentCount"]),
  } as ColDef<AnyRow>,
  percentage: {
    headerName: "Percentage %",
    minWidth: 120,
    valueGetter: cellPct,
  } as ColDef<AnyRow>,
};

export function StudentMyAttendancePage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [totalPct, setTotalPct] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setTotalPct(null);
    try {
      // Angular: localStorage studentId / collegeId / courseYearId / …
      const storageStudentId = positiveId(readStorage("studentId"));
      const sessionStudentId = positiveId(user?.studentId);
      const studentId = sessionStudentId || storageStudentId;

      let detail: AnyRow | null = null;
      if (studentId) {
        detail = (await fetchStudentDetail(studentId)) as AnyRow | null;
      }
      if (!detail && user?.userId) {
        detail = (await fetchStudentDetailByUserId(
          user.userId,
        )) as AnyRow | null;
      }

      const collegeId =
        positiveId(readStorage("collegeId"), user?.collegeId) ||
        num(detail, ["collegeId", "fk_college_id"]);
      const courseYearId =
        positiveId(readStorage("courseYearId")) ||
        num(detail, ["courseYearId", "fk_course_year_id"]);
      const courseGroupId =
        positiveId(readStorage("courseGroupId")) ||
        num(detail, ["courseGroupId", "fk_course_group_id"]);
      const academicYearId =
        positiveId(readStorage("academicYearId")) ||
        num(detail, ["academicYearId", "fk_academic_year_id"]);
      const groupSectionId =
        positiveId(readStorage("groupSectionId")) ||
        num(detail, ["groupSectionId", "fk_group_section_id", "sectionId"]);
      const sid =
        studentId ||
        num(detail, ["studentId", "fk_student_id", "student_id"]);

      if (!sid) {
        toastInfo("Could not load your student profile.");
        return;
      }

      let attendanceRows: AnyRow[] = [];

      // Angular listByNineIds(studentAttendancePercentageReportUrl, …)
      if (
        collegeId &&
        courseYearId &&
        courseGroupId &&
        academicYearId &&
        groupSectionId
      ) {
        try {
          const raw = await getAllRecords<unknown>(ATTENDANCE_PER_PROC, {
            in_collegeId: collegeId,
            in_course_year_id: courseYearId,
            in_course_group_id: courseGroupId,
            in_academic_year_id: academicYearId,
            in_sectionId: groupSectionId,
            in_studentId: sid,
            in_empId: "0",
            in_from_percentage: 0,
            in_to_percentage: 100,
          });
          attendanceRows = asProcRows(raw);
        } catch {
          // fall through to profile loader
        }
      }

      // Fallback: same proc path used by students-profile attendance tab
      if (attendanceRows.length === 0 && detail) {
        attendanceRows = await loadStudentProfileTabData("attendance", detail);
      }

      if (attendanceRows.length === 0) {
        toastInfo("No attendance records found.");
      }

      setRows(attendanceRows);
      setTotalPct(formatTotalAttendancePct(attendanceRows));
    } catch (e) {
      toastError(e, "Failed to load attendance");
      setRows([]);
      setTotalPct(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [sessionLoading, load]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectCode,
      COL_DEFS.subjectName,
      COL_DEFS.subjectType,
      COL_DEFS.credits,
      COL_DEFS.totalClasses,
      COL_DEFS.presentClasses,
      COL_DEFS.absentClasses,
      COL_DEFS.percentage,
    ],
    [],
  );

  const busy = sessionLoading || loading;

  return (
    <ListPage
      title="Attendance Report"
      columnDefs={columnDefs}
      rowData={rows}
      loading={busy}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: true,
      }}
      toolbarTrailing={
        totalPct != null ? (
          <span className="text-sm font-medium whitespace-nowrap">
            Total Attendance : {totalPct} %
          </span>
        ) : null
      }
    />
  );
}

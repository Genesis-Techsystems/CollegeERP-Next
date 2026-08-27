"use client";

/**
 * Angular `student-academics/student-my-attendance` → `StudentMyAttendanceComponent`.
 *
 * On load Angular fires exactly **2** APIs in parallel:
 *   1. `getAllRecords/s_rep_tt_std_tot_attendance_per` → Total Attendance %
 *   2. `getAllRecords/s_rep_tt_std_attendance_per` → subject-wise grid
 * No studentdetail / classwise / daywise / special-activity calls.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { useSession } from "@/hooks/useSession";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { getAllRecordsEnvelope } from "@/services";

type AnyRow = Record<string, unknown>;

/** Angular `CONSTANTS.studentAttendancePercentageReportUrl` */
const ATTENDANCE_PER_PROC = "s_rep_tt_std_attendance_per";
/** Angular `CONSTANTS.studentAttendancePercentageOnlyReportUrl` */
const ATTENDANCE_TOT_PROC = "s_rep_tt_std_tot_attendance_per";

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

/**
 * Angular: `result.data.result[0]` is the row array for both procs.
 * `getAllRecordsEnvelope` already unwraps to `body.data`.
 */
function asAngularResult0(data: unknown): AnyRow[] {
  if (data == null || data === "" || data === false) return [];

  // data.result[0] (Angular shape)
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as AnyRow;
    if (Array.isArray(o.result)) {
      const first = o.result[0];
      if (Array.isArray(first)) {
        return first.filter(
          (item): item is AnyRow =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        );
      }
      if (
        first &&
        typeof first === "object" &&
        !Array.isArray(first) &&
        first !== ""
      ) {
        // single object in result[0]
        return [first as AnyRow];
      }
      // result itself is flat list of rows
      if (
        o.result.every(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        )
      ) {
        return o.result as AnyRow[];
      }
    }
    if (Array.isArray(o.resultList)) return asAngularResult0({ result: o.resultList });
  }

  // already [[rows]] or [rows]
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data[0] as unknown[]).filter(
        (item): item is AnyRow =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      );
    }
    if (
      data.every(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      )
    ) {
      return data as AnyRow[];
    }
  }

  return [];
}

/** Angular: `studentAttendancePrecentage[0].percentage.toFixed(2)` */
function formatTotalPct(rows: AnyRow[]): string | null {
  const first = rows[0];
  if (!first) return null;
  const raw = first.percentage ?? first.Percentage ?? first.attendancePercentage;
  if (raw == null || raw === "") return null;
  const pct = Number(raw);
  if (!Number.isFinite(pct)) return null;
  return pct.toFixed(2);
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
  const raw =
    p.data.Percentage ?? p.data.percentage ?? p.data.attendancePercentage;
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

  const sessionStudentId = positiveId(user?.studentId);
  const sessionCollegeId = positiveId(user?.collegeId);

  const load = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setTotalPct(null);
    try {
      // Angular constructor: collegeId / studentId / groupSectionId from localStorage
      const collegeId = positiveId(readStorage("collegeId"), sessionCollegeId);
      const courseYearId = positiveId(readStorage("courseYearId"));
      const courseGroupId = positiveId(readStorage("courseGroupId"));
      const academicYearId = positiveId(readStorage("academicYearId"));
      const groupSectionId = positiveId(readStorage("groupSectionId"));
      const studentId = positiveId(readStorage("studentId"), sessionStudentId);

      if (!studentId || !collegeId || !groupSectionId) {
        toastInfo("Could not load your student profile.");
        return;
      }

      // Angular ngOnInit → getStudentAttetndance:
      //   getStudentAttetndancePercentage(...)  // tot — fired first, not awaited
      //   listByNineIds(...attendance_per...)  // grid — fired immediately after
      const [totEnv, perEnv] = await Promise.all([
        getAllRecordsEnvelope<unknown>(ATTENDANCE_TOT_PROC, {
          in_collegeId: collegeId,
          in_studentId: studentId,
          in_sectionId: groupSectionId,
          in_empId: "0",
          in_percentage_value: "0",
        }),
        getAllRecordsEnvelope<unknown>(ATTENDANCE_PER_PROC, {
          in_collegeId: collegeId,
          in_course_year_id: courseYearId,
          in_course_group_id: courseGroupId,
          in_academic_year_id: academicYearId,
          in_sectionId: groupSectionId,
          in_studentId: studentId,
          in_empId: "0",
          in_from_percentage: 0,
          in_to_percentage: 100,
        }),
      ]);

      // Angular: statusCode 200 + data.result[0]
      let nextTotal: string | null = null;
      if (totEnv.statusCode === 200 || totEnv.success) {
        const totRows = asAngularResult0(totEnv.data);
        nextTotal = formatTotalPct(totRows);
        if (!totRows.length && totEnv.message && !totEnv.success) {
          // keep quiet for tot — Angular shows success toast only when empty; skip noise
        }
      }

      let attendanceRows: AnyRow[] = [];
      if (perEnv.statusCode === 200 || perEnv.success) {
        attendanceRows = asAngularResult0(perEnv.data);
        if (!attendanceRows.length && perEnv.message) {
          toastInfo(perEnv.message);
        }
      } else if (perEnv.message) {
        toastError(perEnv.message);
      }

      setRows(attendanceRows);
      setTotalPct(nextTotal);
    } catch (e) {
      toastError(e, "Failed to load attendance");
      setRows([]);
      setTotalPct(null);
    } finally {
      setLoading(false);
    }
  }, [sessionStudentId, sessionCollegeId]);

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
          <span className="whitespace-nowrap text-sm font-medium text-[#0c51a4]">
            Total Attendance : {totalPct} %
          </span>
        ) : null
      }
    />
  );
}

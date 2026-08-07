/**
 * Angular employee / faculty-subjects attendance date-pivot parity.
 * Flat rows → unique dates × (emp_number + subject_code) matrix with P/A cells.
 */

export type AnyRow = Record<string, unknown>;

export type EmpAttendancePivotRow = {
  first_name: string;
  emp_number: string;
  dept_name: string;
  course_group: string;
  course_year: string;
  section: string;
  subject_name: string;
  subject_code: string;
  /** Dynamic date keys → "P" | "A" */
  [dateKey: string]: string | number;
  present: number;
  absent: number;
};

function pickStr(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function attendanceDateOf(row: AnyRow): string {
  return pickStr(row, [
    "attendance_Date",
    "attendance_date",
    "cls_date",
    "class_date",
  ]);
}

function isPresentValue(raw: unknown): boolean {
  if (raw === true || raw === 1 || raw === "1") return true;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    return s === "p" || s === "present" || s === "true";
  }
  return false;
}

/** Collect unique attendance dates and sort ascending. */
export function collectAttendanceDates(rows: AnyRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const d = attendanceDateOf(row);
    if (d) set.add(d);
  }
  return Array.from(set).sort((a, b) => {
    const ta = Date.parse(a);
    const tb = Date.parse(b);
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
    return a.localeCompare(b);
  });
}

/**
 * Pivot flat emp-attendance rows into matrix rows keyed by emp_number + subject_code.
 */
export function pivotEmpAttendanceRows(
  rows: AnyRow[],
  dates: string[],
): EmpAttendancePivotRow[] {
  const byKey = new Map<string, EmpAttendancePivotRow>();

  for (const row of rows) {
    const empNumber = pickStr(row, ["emp_number", "empNumber"]);
    const subjectCode = pickStr(row, ["subject_code", "subjectCode"]);
    const key = `${empNumber}||${subjectCode}`;
    let matrix = byKey.get(key);
    if (!matrix) {
      matrix = {
        first_name: pickStr(row, ["first_name", "emp_name", "employee_name"]),
        emp_number: empNumber,
        dept_name: pickStr(row, ["dept_name", "department_name", "dept_code"]),
        course_group: pickStr(row, [
          "course_group",
          "group_code",
          "course_group_code",
        ]),
        course_year: pickStr(row, [
          "course_year",
          "course_year_name",
          "courseYearName",
        ]),
        section: pickStr(row, ["section", "section_name"]),
        subject_name: pickStr(row, ["subject_name", "subjectName"]),
        subject_code: subjectCode,
        present: 0,
        absent: 0,
      };
      for (const d of dates) matrix[d] = "A";
      byKey.set(key, matrix);
    }

    const date = attendanceDateOf(row);
    if (!date) continue;
    const present = isPresentValue(
      row.is_present ?? row.status ?? row.attendance_status,
    );
    matrix[date] = present ? "P" : "A";
  }

  const out = Array.from(byKey.values());
  for (const row of out) {
    let present = 0;
    for (const d of dates) {
      if (row[d] === "P") present += 1;
    }
    row.present = present;
    row.absent = Math.max(0, dates.length - present);
  }
  return out;
}

export function formatAttendanceDateHeader(dateStr: string): string {
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return dateStr;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(t));
  } catch {
    return dateStr;
  }
}

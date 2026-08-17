/**
 * Angular pivot helpers for daily / weekly / staff timetable reports.
 */

export type AnyRow = Record<string, unknown>;

export type PeriodKey = {
  Period: string | number;
  Period_Time: string;
};

export type StatisticalPeriodKey = {
  periodno: string | number;
  Period_TIme: string;
};

export type StatisticalCell = {
  text: string;
  attendanceTaken: number;
};

export type StatisticalRow = {
  SEC_Display_Name: string;
  subjectTimetable: StatisticalCell[];
};

export type WeekdayKey = {
  weekday_name: string;
};

export type DeptCourseCell = {
  sub: string;
  batch: string;
  time: string;
};

export type DeptWiseRow = {
  Faculty: string;
  cells: Record<string, DeptCourseCell[]>;
};

export type DailyTimetableRow = {
  Section_Details: string;
  subjectTimetable: string[];
};

export type WeeklyCell = {
  subject: string;
  Period: string | number;
};

export type WeeklyTimetableRow = {
  WeekDay_Name: string;
  Period: string | number;
  subjectTimetable: WeeklyCell[];
};

export type StaffCell = {
  peroid: string | number;
  subject: string;
};

export type StaffTimetableRow = {
  WeekDay_Name: string;
  subjectTimetable: StaffCell[];
};

function txt(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function periodOf(row: AnyRow, ...keys: string[]): string | number {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "")
      return row[k] as string | number;
  }
  return "";
}

/** Angular dialy-timetable-report.selectedSection pivot. */
export function buildDailyTimetableMatrix(rows: AnyRow[]): {
  keys: PeriodKey[];
  studentTimetable: DailyTimetableRow[];
} {
  const keys: PeriodKey[] = [];
  const studentTimetable: DailyTimetableRow[] = [];

  for (const row of rows) {
    const period = periodOf(row, "Period");
    if (!keys.some((k) => k.Period === period)) {
      keys.push({
        Period: period,
        Period_Time: txt(row.Period_Time),
      });
    }
  }

  for (const row of rows) {
    const section = txt(row.Section_Details);
    const period = periodOf(row, "Period");
    const subject = txt(row.Subject_Name);
    const periodIdx = keys.findIndex((k) => k.Period === period);

    const existing = studentTimetable.find(
      (x) => x.Section_Details === section,
    );
    if (existing) {
      existing.subjectTimetable[periodIdx] = subject;
    } else {
      const subjectTimetable = keys.map(() => "");
      if (periodIdx >= 0) subjectTimetable[periodIdx] = subject;
      studentTimetable.push({ Section_Details: section, subjectTimetable });
    }
  }

  return { keys, studentTimetable };
}

/** Angular weekly-timetable-report.selectedSection pivot. */
export function buildWeeklyTimetableMatrix(rows: AnyRow[]): {
  keys: PeriodKey[];
  subjectKeys: PeriodKey[];
  studentTimetable: WeeklyTimetableRow[];
} {
  let keys: PeriodKey[] = [];
  const subjectKeys: PeriodKey[] = [];
  const studentTimetable: WeeklyTimetableRow[] = [];

  for (const row of rows) {
    const period = periodOf(row, "Period");
    if (!keys.some((k) => k.Period === period)) {
      keys.push({
        Period: period,
        Period_Time: txt(row.Period_Time),
      });
    }
  }

  keys = [...keys].sort((a, b) => Number(a.Period) - Number(b.Period));

  for (const key of keys) {
    if (!subjectKeys.some((k) => k.Period === key.Period)) {
      subjectKeys.push({ Period: key.Period, Period_Time: key.Period_Time });
    }
  }

  for (const row of rows) {
    const weekDay = txt(row.WeekDay_Name);
    const period = periodOf(row, "Period");
    const subject = txt(row.Subject_Name);

    if (studentTimetable.length > 0) {
      if (!studentTimetable.some((x) => x.WeekDay_Name === weekDay)) {
        for (let j = 0; j < subjectKeys.length; j++) {
          if (j === 0) {
            studentTimetable.push({
              Period: period,
              WeekDay_Name: weekDay,
              subjectTimetable: [{ subject, Period: period }],
            });
          }
          if (
            j > 0 &&
            studentTimetable.some((x) => x.WeekDay_Name === weekDay)
          ) {
            studentTimetable
              .find((x) => x.WeekDay_Name === weekDay)!
              .subjectTimetable.push({
                subject: "-",
                Period: subjectKeys[j].Period,
              });
          }
        }
      }

      const dayRow = studentTimetable.find((x) => x.WeekDay_Name === weekDay);
      if (dayRow) {
        const cell = dayRow.subjectTimetable.find((y) => y.Period === period);
        if (cell) cell.subject = subject;
      }
    } else {
      for (let j = 0; j < subjectKeys.length; j++) {
        if (j === 0) {
          studentTimetable.push({
            Period: period,
            WeekDay_Name: weekDay,
            subjectTimetable: [{ subject, Period: subjectKeys[j].Period }],
          });
        }
        if (j > 0 && studentTimetable.some((x) => x.WeekDay_Name === weekDay)) {
          studentTimetable
            .find((x) => x.WeekDay_Name === weekDay)!
            .subjectTimetable.push({
              subject: "-",
              Period: subjectKeys[j].Period,
            });
        }
      }
    }
  }

  return { keys, subjectKeys, studentTimetable };
}

/** Angular staff-timetable-report.getReport pivot. */
export function buildStaffTimetableMatrix(rows: AnyRow[]): {
  keys: PeriodKey[];
  studentTimetable: StaffTimetableRow[];
} {
  const keys: PeriodKey[] = [];
  const studentTimetable: StaffTimetableRow[] = [];

  for (const row of rows) {
    const period = periodOf(row, "period_name", "Period");
    if (!keys.some((k) => k.Period === period)) {
      keys.push({
        Period: period,
        Period_Time: txt(row.Period_Time),
      });
    }

    const weekDay = txt(row.weekday_name ?? row.WeekDay_Name);
    const subject = txt(row.subject ?? row.Subject_Name);

    if (studentTimetable.length > 0) {
      const dayRow = studentTimetable.find((x) => x.WeekDay_Name === weekDay);
      if (dayRow) {
        const cell = dayRow.subjectTimetable.find((y) => y.peroid === period);
        if (cell) {
          cell.subject = `${cell.subject} / ${subject}`;
        } else {
          dayRow.subjectTimetable.push({ peroid: period, subject });
        }
      } else {
        studentTimetable.push({
          WeekDay_Name: weekDay,
          subjectTimetable: [{ peroid: period, subject }],
        });
      }
    } else {
      studentTimetable.push({
        WeekDay_Name: weekDay,
        subjectTimetable: [{ peroid: period, subject }],
      });
    }
  }

  return { keys, studentTimetable };
}

export function subjectForStaffPeriod(
  row: StaffTimetableRow,
  period: string | number,
): string {
  return row.subjectTimetable.find((c) => c.peroid === period)?.subject ?? "";
}

/** Angular daily-statistical-report pivot. */
export function buildDailyStatisticalMatrix(rows: AnyRow[]): {
  keys: StatisticalPeriodKey[];
  studentTimetable: StatisticalRow[];
} {
  const keys: StatisticalPeriodKey[] = [];
  const studentTimetable: StatisticalRow[] = [];

  for (const row of rows) {
    const periodTime = txt(row.Period_TIme);
    if (!keys.some((k) => k.Period_TIme === periodTime)) {
      keys.push({
        periodno: row.periodno as string | number,
        Period_TIme: periodTime,
      });
    }
  }

  for (const row of rows) {
    const section = txt(row.SEC_Display_Name);
    const periodno = row.periodno as string | number;
    const periodIdx = keys.findIndex((k) => k.periodno === periodno);
    const cellText = `${txt(row.Period)}(${section})`;
    const attendanceTaken = num(row.Attendance_Taken);

    const existing = studentTimetable.find(
      (x) => x.SEC_Display_Name === section,
    );
    if (existing) {
      if (periodIdx >= 0) {
        existing.subjectTimetable[periodIdx] = {
          text: cellText,
          attendanceTaken,
        };
      }
    } else {
      const subjectTimetable = keys.map(() => ({
        text: "",
        attendanceTaken: 0,
      }));
      if (periodIdx >= 0) {
        subjectTimetable[periodIdx] = { text: cellText, attendanceTaken };
      }
      studentTimetable.push({ SEC_Display_Name: section, subjectTimetable });
    }
  }

  return { keys, studentTimetable };
}

/** Angular department-wise-timetable pivot. */
export function buildDepartmentWiseMatrix(rows: AnyRow[]): {
  keys: WeekdayKey[];
  studentTimetable: DeptWiseRow[];
} {
  const keys: WeekdayKey[] = [];
  const studentTimetable: DeptWiseRow[] = [];

  for (const row of rows) {
    const weekday = txt(row.weekday_name);
    if (weekday && !keys.some((k) => k.weekday_name === weekday)) {
      keys.push({ weekday_name: weekday });
    }
  }

  for (const row of rows) {
    const faculty = txt(row.Faculty);
    const weekday = txt(row.weekday_name);
    if (!faculty || !weekday) continue;

    const course: DeptCourseCell = {
      sub: txt(row.subject),
      batch: txt(row.Batch),
      time: txt(row.Period_Time),
    };

    let facultyRow = studentTimetable.find((x) => x.Faculty === faculty);
    if (!facultyRow) {
      facultyRow = { Faculty: faculty, cells: {} };
      studentTimetable.push(facultyRow);
    }

    if (!facultyRow.cells[weekday]) {
      facultyRow.cells[weekday] = [];
    }
    facultyRow.cells[weekday].push(course);
  }

  return { keys, studentTimetable };
}

export function formatDeptWiseCell(
  courses: DeptCourseCell[] | undefined,
): string {
  if (!courses?.length) return "";
  return courses
    .map((c) => [c.sub, c.batch, c.time].filter(Boolean).join("\n"))
    .join("\n\n");
}

/**
 * Angular department-wise-timetable print/excel cell markup:
 * each period ends with `<hr style="border:2px solid #888888">`.
 */
export function formatDeptWiseCellHtml(
  courses: DeptCourseCell[] | undefined,
): string {
  if (!courses?.length) return "";
  return courses
    .map((c) => {
      const subject = escape(c.sub);
      const batch = c.batch
        ? `<span style="color:#888888">${escape(c.batch)}</span><br/>`
        : "";
      const time = c.time
        ? `<span style="color:#888888">${escape(c.time)}</span>`
        : "";
      return `${subject}<br/>${batch}${time}<hr style="border:2px solid #888888"/>`;
    })
    .join("");
}

export function statisticalPeriodField(periodno: string | number): string {
  return `p_${String(periodno).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function weekdayField(weekday: string): string {
  return `w_${weekday.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildMatrixTableHtml(opts: {
  firstColHeader: string;
  keys: PeriodKey[];
  rows: { label: string; cells: string[] }[];
}): string {
  const head = [
    `<th>${escape(opts.firstColHeader)}</th>`,
    ...opts.keys.map(
      (k) =>
        `<th>${escape(String(k.Period))}<br/><span style="font-weight:400;font-size:10px">${escape(k.Period_Time)}</span></th>`,
    ),
  ].join("");

  const body = opts.rows
    .map((r) => {
      const cells = r.cells
        .map((c) => {
          const isBrk = !c || c === "-";
          return `<td style="text-align:center;${isBrk ? "background:#f5f5f5;" : ""}">${escape(c)}</td>`;
        })
        .join("");
      return `<tr><th style="text-align:center;color:blue">${escape(r.label)}</th>${cells}</tr>`;
    })
    .join("");

  return `<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildStatisticalTableHtml(opts: {
  keys: StatisticalPeriodKey[];
  rows: StatisticalRow[];
}): string {
  const th =
    "border:1px solid #333;padding:5px;background:#C3D9FF;font-weight:500;text-align:center;";
  const td =
    "border:1px solid #333;padding:8px;text-align:center;font-weight:500;";
  const head = [
    `<th style="${th}">Days/Hours</th>`,
    ...opts.keys.map((k) => {
      const time = escape(k.Period_TIme);
      return `<th style="${th}">${escape(String(k.periodno))}${
        time
          ? `<p style="margin:5px 0;color:#c76d2f;font-weight:400;">${time}</p>`
          : ""
      }</th>`;
    }),
  ].join("");

  const body = opts.rows
    .map((r) => {
      const cells = r.subjectTimetable
        .map((c) => {
          if (!c.text) {
            return `<td style="${td}background:#dedede;"></td>`;
          }
          const color = c.attendanceTaken === 1 ? "green" : "red";
          return `<td style="${td}"><p style="color:${color};padding-bottom:10px;margin:5px 0;">${escape(c.text)}</p></td>`;
        })
        .join("");
      return `<tr><th style="${td}color:blue;">${escape(r.SEC_Display_Name)}</th>${cells}</tr>`;
    })
    .join("");

  const legend = `<p style="margin-top:8px;font-size:11px"><span style="color:green;font-weight:500">Attendance Capture</span> | <span style="color:red;font-weight:500">Attendance Not Capture</span></p>`;

  return `<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${legend}`;
}

export function buildDepartmentWiseTableHtml(opts: {
  keys: WeekdayKey[];
  rows: DeptWiseRow[];
}): string {
  const head = [
    `<th>Employee</th>`,
    ...opts.keys.map((k) => `<th>${escape(k.weekday_name)}</th>`),
  ].join("");

  const body = opts.rows
    .map((r) => {
      const cells = opts.keys
        .map((k) => {
          const courses = r.cells[k.weekday_name];
          const isBrk = !courses?.length;
          const inner = formatDeptWiseCellHtml(courses);
          return `<td style="text-align:center;${isBrk ? "background:#f5f5f5;" : ""}">${inner}</td>`;
        })
        .join("");
      return `<tr><th style="text-align:center;color:blue">${escape(r.Faculty)}</th>${cells}</tr>`;
    })
    .join("");

  return `<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

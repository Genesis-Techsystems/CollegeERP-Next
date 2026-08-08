/**
 * Master Timetable pivot — Angular `master-timetable.component.ts` parity.
 */

import type { AnyRow } from "./timetable-matrix";

export type MasterPeriodKey = {
  Period: number | string;
  time: string;
};

export type MasterSemSubject = {
  name: string;
  facultyList: string;
  section: string;
};

export type MasterSemGroup = {
  year: string;
  sem: string;
  subjects: MasterSemSubject[];
};

export type MasterWeekdayPeriod = {
  period: number | string;
  subject: string;
};

export type MasterWeekdayRow = {
  year: string;
  section: string;
  periods: MasterWeekdayPeriod[];
};

export type MasterWeekdayGroup = {
  weekday_name: string;
  sem: string;
  list: MasterWeekdayRow[];
};

export type MasterTimetablePivot = {
  totalSems: MasterSemGroup[];
  totalWeekdays: MasterWeekdayGroup[];
  keys: MasterPeriodKey[];
};

function txt(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function splitAcademic(ad: string): { year: string; sem: string; section: string } {
  const parts = ad.split("-");
  return {
    year: parts[3] ?? "",
    sem: parts[4] ?? "",
    section: parts[5] ?? "",
  };
}

function facultyFromPart(part: string): string {
  const open = part.indexOf("[");
  if (open < 0) return "";
  const after = part.slice(open + 1);
  return after.split("]<")[0].split("]")[0];
}

function nameFromPart(part: string): string {
  return part.split("[")[0];
}

function sectionLabel(year: string, sem: string, section: string): string {
  return `${year}-${sem},${section}`;
}

function parseSubjectCell(subject: string): string {
  const parts = subject.split(";");
  if (parts.length > 1) {
    return parts
      .map((part) => {
        const name = nameFromPart(part);
        const batchParts = part.split("{");
        if (batchParts.length > 1) {
          return `${name}(${batchParts[1].split("}")[0]})`;
        }
        return name;
      })
      .join("/");
  }
  if (subject.split("[").length > 1) {
    return nameFromPart(subject);
  }
  return "-";
}

function periodTimeFromSubject(subject: string): string {
  const lt = subject.split("<");
  if (lt.length > 1) {
    return lt[1].split(">")[0] ?? "";
  }
  return "";
}

function pushSemSubject(
  totalSems: MasterSemGroup[],
  year: string,
  sem: string,
  part: string,
  section: string,
): void {
  const name = nameFromPart(part);
  if (!name) return;
  const facultyList = facultyFromPart(part);
  const sectionStr = sectionLabel(year, sem, section);

  let group = totalSems.find((g) => g.year === year && g.sem === sem);
  if (!group) {
    group = { year, sem, subjects: [] };
    totalSems.push(group);
  }
  if (group.subjects.some((s) => s.name === name)) return;
  group.subjects.push({ name, facultyList, section: sectionStr });
}

function addSemSubjects(
  totalSems: MasterSemGroup[],
  row: AnyRow,
  sem: string,
): void {
  const subject = txt(row.subject);
  const { year, sem: rowSem, section } = splitAcademic(txt(row.Academic_Details));
  if (rowSem !== sem || !subject.split("[")[0]) return;

  const parts = subject.split(";");
  if (parts.length > 1) {
    for (const part of parts) {
      pushSemSubject(totalSems, year, sem, part, section);
    }
    return;
  }
  pushSemSubject(totalSems, year, sem, subject, section);
}

function asPeriodKey(v: unknown): string | number {
  if (typeof v === "number" || typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function addWeekdayEntry(
  totalWeekdays: MasterWeekdayGroup[],
  row: AnyRow,
  sem: string,
  sub: string,
): void {
  const weekday = txt(row.weekday_name);
  const { year, sem: rowSem, section } = splitAcademic(txt(row.Academic_Details));
  if (rowSem !== sem) return;

  const yearSection = `${year}-${rowSem}`;
  const period = asPeriodKey(row.Period);

  let week = totalWeekdays.find(
    (w) => w.weekday_name === weekday && w.sem === sem,
  );
  if (!week) {
    week = { weekday_name: weekday, sem, list: [] };
    totalWeekdays.push(week);
  }

  let listRow = week.list.find(
    (l) => l.year === yearSection && l.section === section,
  );
  if (!listRow) {
    listRow = { year: yearSection, section, periods: [] };
    week.list.push(listRow);
  }

  listRow.periods.push({ period, subject: sub });
}

export function buildMasterTimetablePivot(
  rawRows: AnyRow[],
  sem: string,
): MasterTimetablePivot {
  const totalSems: MasterSemGroup[] = [];
  const totalWeekdays: MasterWeekdayGroup[] = [];
  const keys: MasterPeriodKey[] = [];

  for (const row of rawRows) {
    addSemSubjects(totalSems, row, sem);

    const subject = txt(row.subject);
    const sub = parseSubjectCell(subject);
    addWeekdayEntry(totalWeekdays, row, sem, sub);

    const period = asPeriodKey(row.Period);
    if (keys.some((k) => String(k.Period) === String(period))) continue;
    keys.push({
      Period: period,
      time: subject ? periodTimeFromSubject(subject) : "",
    });
  }

  return { totalSems, totalWeekdays, keys };
}

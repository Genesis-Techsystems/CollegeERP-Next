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
  label: string;
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

function splitAcademic(ad: string): {
  year: string;
  sem: string;
  section: string;
} {
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

function semGroupLabel(year: string, sem: string): string {
  return sem ? `${year}-${sem}` : year;
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
    group = { year, sem, label: semGroupLabel(year, sem), subjects: [] };
    totalSems.push(group);
  }
  if (group.subjects.some((s) => s.name === name)) return;
  group.subjects.push({ name, facultyList, section: sectionStr });
}

function addSemSubjects(totalSems: MasterSemGroup[], row: AnyRow): void {
  const subject = txt(row.subject);
  const { year, sem, section } = splitAcademic(txt(row.Academic_Details));
  if (!subject.split("[")[0]) return;

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
  sub: string,
): void {
  const weekday = txt(row.weekday_name);
  const { year, sem, section } = splitAcademic(txt(row.Academic_Details));

  const yearSection = semGroupLabel(year, sem);
  const period = asPeriodKey(row.Period);

  let week = totalWeekdays.find((w) => w.weekday_name === weekday);
  if (!week) {
    week = { weekday_name: weekday, list: [] };
    totalWeekdays.push(week);
  }

  let listRow = week.list.find(
    (l) => l.year === yearSection && l.section === section,
  );
  if (!listRow) {
    listRow = { year: yearSection, section, periods: [] };
    week.list.push(listRow);
  }

  if (listRow.periods.some((p) => String(p.period) === String(period))) return;
  listRow.periods.push({ period, subject: sub });
}

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function weekdayRank(name: string): number {
  const idx = WEEKDAY_ORDER.indexOf(name.trim().toLowerCase());
  return idx < 0 ? WEEKDAY_ORDER.length : idx;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function comparePeriod(a: number | string, b: number | string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return compareText(String(a), String(b));
}

export function buildMasterTimetablePivot(
  rawRows: AnyRow[],
): MasterTimetablePivot {
  const totalSems: MasterSemGroup[] = [];
  const totalWeekdays: MasterWeekdayGroup[] = [];
  const keys: MasterPeriodKey[] = [];

  for (const row of rawRows) {
    addSemSubjects(totalSems, row);

    const subject = txt(row.subject);
    addWeekdayEntry(totalWeekdays, row, parseSubjectCell(subject));

    const period = asPeriodKey(row.Period);
    const time = subject ? periodTimeFromSubject(subject) : "";
    const existing = keys.find((k) => String(k.Period) === String(period));
    if (existing) {
      if (!existing.time && time) existing.time = time;
      continue;
    }
    keys.push({ Period: period, time });
  }

  keys.sort((a, b) => comparePeriod(a.Period, b.Period));
  totalSems.sort(
    (a, b) => compareText(a.year, b.year) || compareText(a.sem, b.sem),
  );
  totalWeekdays.sort(
    (a, b) =>
      weekdayRank(a.weekday_name) - weekdayRank(b.weekday_name) ||
      compareText(a.weekday_name, b.weekday_name),
  );
  for (const week of totalWeekdays) {
    week.list.sort(
      (a, b) =>
        compareText(a.year, b.year) || compareText(a.section, b.section),
    );
  }

  return { totalSems, totalWeekdays, keys };
}

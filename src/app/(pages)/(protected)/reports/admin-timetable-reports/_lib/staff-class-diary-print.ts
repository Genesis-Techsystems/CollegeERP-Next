/**
 * Angular Staff Class Diary Report — weekly grid print layout.
 */

import { addDays, format } from "date-fns";
import { escapeHtml } from "@/common/export-html-table";

const HOUR_HEADERS = [
  "1st Hour",
  "2nd Hour",
  "3rd Hour",
  "4th Hour",
  "5th Hour",
  "6th Hour",
] as const;

export type StaffDiaryPrintPeriod = {
  periodNo: number;
  slotType: string;
  subjectName: string;
  subjectCode: string;
};

export type StaffDiaryPrintDay = {
  classDate: string;
  weekDay: string;
  periods: StaffDiaryPrintPeriod[];
};

export function employeePrintName(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function printSubjectLabel(period: StaffDiaryPrintPeriod): string {
  const name = period.subjectName.trim();
  if (name) return name;
  return period.subjectCode.trim();
}

function hourCellsForDay(day: StaffDiaryPrintDay | undefined): string[] {
  const cells = ["", "", "", "", "", ""];
  if (!day) return cells;

  for (const period of day.periods) {
    if (period.slotType.toUpperCase() !== "CLASS") continue;
    if (period.periodNo < 1 || period.periodNo > 6) continue;
    cells[period.periodNo - 1] = printSubjectLabel(period);
  }
  return cells;
}

export function buildStaffClassDiaryPrintHtml(params: {
  employeeName: string;
  weekStart: Date;
  days: StaffDiaryPrintDay[];
}): string {
  const dayByDate = new Map(params.days.map((d) => [d.classDate, d]));
  const rows: string[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(params.weekStart, i);
    const dateKey = format(date, "yyyy-MM-dd");
    const weekDay = format(date, "EEEE");
    const dateLabel = format(date, "dd-MM-yyyy");
    const hours = hourCellsForDay(dayByDate.get(dateKey));

    rows.push(`<tr>
      <td class="day-date">${escapeHtml(weekDay)} ${escapeHtml(dateLabel)}</td>
      ${hours
        .map(
          (cell, idx) =>
            `<td class="hour-cell${idx === 5 ? " last-hour" : ""}">${escapeHtml(cell)}</td>`,
        )
        .join("")}
    </tr>`);
  }

  const headerCells = HOUR_HEADERS.map(
    (label, idx) =>
      `<th class="hour-head${idx === 5 ? " last-hour" : ""}">${escapeHtml(label)}</th>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Staff Class Diary Report</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #111;
      font-family: "Times New Roman", Times, serif;
      font-size: 12px;
    }
    h1 {
      margin: 0 0 10px;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
    }
    .employee {
      margin: 0 0 14px;
      text-align: right;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #111;
      padding: 10px 6px;
      vertical-align: middle;
      word-wrap: break-word;
    }
    th {
      font-weight: 700;
      text-align: center;
    }
    .day-date {
      width: 18%;
      text-align: left;
      font-weight: 400;
    }
    .hour-head,
    .hour-cell {
      text-align: center;
    }
    .last-hour {
      border-right: 2px solid #111;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 56px;
      font-size: 12px;
    }
    .signature-block {
      min-width: 220px;
    }
    .signature-line {
      margin-top: 42px;
      border-top: 1px solid #111;
      min-height: 1px;
    }
  </style>
</head>
<body>
  <h1>Staff Class Diary Report</h1>
  <div class="employee">Employee: ${escapeHtml(params.employeeName)}</div>
  <table>
    <thead>
      <tr>
        <th class="day-date">Day / Date</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${rows.join("")}
    </tbody>
  </table>
  <div class="signatures">
    <div class="signature-block">
      <div>Signature of the Teacher</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature-block" style="text-align:right;">
      <div>Signature of the incharge/Head of the Department</div>
      <div class="signature-line"></div>
    </div>
  </div>
</body>
</html>`;
}

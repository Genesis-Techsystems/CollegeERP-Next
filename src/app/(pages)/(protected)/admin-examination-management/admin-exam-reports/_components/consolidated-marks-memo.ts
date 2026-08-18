import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { MINIO_URL } from "@/config/constants/api";
import { printHtmlInIframe } from "@/lib/print";
import { toPrintLogoUrl } from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import type { AnyRow } from "@/services";

export type ConsolidatedMemoRow = AnyRow;

export type ConsolidatedMemoSubject = {
  subject_name: string;
  subject_code: string;
  internal_marks: string;
  external_marks: string;
  grade: string;
  grade_points: string;
  result: string;
  credits: string;
};

export type ConsolidatedMemoExamGroup = {
  exam_name: string;
  examtype: string;
  course_year_code: string;
  regulation_code: string;
  subjects: ConsolidatedMemoSubject[];
};

export type ConsolidatedMemoPayload = {
  data: ConsolidatedMemoRow[];
  examdata: ConsolidatedMemoExamGroup[];
};

export const CONSOLIDATED_MEMO_STORAGE_KEY = "consolidated-marks-memo-print";
export const CONSOLIDATED_MEMO_LIST_HREF =
  "/reports/admin-exam-reports/consolidated-marks-report";
export const CONSOLIDATED_MEMO_PRINT_HREF =
  "/reports/admin-exam-reports/consolidated-marks-report/print-consolidated-memo";

export function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function dash(v: unknown): string {
  const s = txt(v).trim();
  return s ? s : " - ";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function minioSrc(path: unknown): string {
  const raw = txt(path).trim();
  if (!raw) return "";
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/${raw.replace(/^\/+/, "")}` : raw;
}

export function groupExamRows(
  rows: ConsolidatedMemoRow[],
): ConsolidatedMemoExamGroup[] {
  const groups: ConsolidatedMemoExamGroup[] = [];
  for (const row of rows) {
    const examName = txt(row.exam_name);
    const yearCode = txt(row.course_year_code);
    const existing = groups.find(
      (g) => g.exam_name === examName && g.course_year_code === yearCode,
    );
    const subject: ConsolidatedMemoSubject = {
      subject_name: txt(row.subject_name),
      subject_code: txt(row.subject_code),
      internal_marks: dash(row.internal_marks),
      external_marks: dash(row.external_marks),
      grade: txt(row.grade),
      grade_points: txt(row.grade_points),
      result: txt(row.result),
      credits: txt(row.credits) || " ",
    };
    if (existing) {
      existing.subjects.push(subject);
    } else {
      groups.push({
        exam_name: examName,
        examtype: txt(row.examtype),
        course_year_code: yearCode,
        regulation_code: txt(row.regulation_code),
        subjects: [subject],
      });
    }
  }
  return groups;
}

export function saveConsolidatedMemoPrint(
  payload: ConsolidatedMemoPayload,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    CONSOLIDATED_MEMO_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function loadConsolidatedMemoPrint(): ConsolidatedMemoPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(CONSOLIDATED_MEMO_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsolidatedMemoPayload;
    if (
      !parsed ||
      !Array.isArray(parsed.data) ||
      !Array.isArray(parsed.examdata)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function printConsolidatedMemo(payload: ConsolidatedMemoPayload): void {
  const head = payload.data[0] ?? {};
  const groups = payload.examdata;
  const logo = toPrintLogoUrl(minioSrc(head.logo_path) || DEFAULT_COLLEGE_LOGO);
  const photo = minioSrc(head.student_photo_path);
  const photoAbs = photo ? toPrintLogoUrl(photo) : "";
  const orgName = txt(head.org_name);
  const orgAddress = txt(head.org_Address ?? head.org_address);
  const courseLine = [txt(head.course_name), txt(head.group_name)]
    .filter(Boolean)
    .join("-");

  const tables = groups
    .map((ex) => {
      const rowsHtml = ex.subjects
        .map(
          (s, i) => `<tr>
  <td>${i + 1}</td>
  <td>${escapeHtml(s.subject_name)} - ${escapeHtml(s.subject_code)}</td>
  <td>${escapeHtml(s.internal_marks)}</td>
  <td>${escapeHtml(s.external_marks)}</td>
  <td>${escapeHtml(s.result)}</td>
  <td>${escapeHtml(s.credits)}</td>
</tr>`,
        )
        .join("");
      return `<table class="marks">
  <tr>
    <td colspan="6" class="group">
      <b>${escapeHtml(
        [ex.exam_name, ex.examtype, ex.course_year_code, ex.regulation_code]
          .filter(Boolean)
          .join(" / "),
      )}</b>
    </td>
  </tr>
  <tr>
    <th>S.No</th>
    <th>Subject</th>
    <th>InternalMarks</th>
    <th>External Marks</th>
    <th>Result</th>
    <th>Credits</th>
  </tr>
  ${rowsHtml}
</table>`;
    })
    .join("");

  printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Consolidated Marks Memo</title>
<style>
@page { margin: 12mm; }
body { font-family: Arial, sans-serif; color: #111; margin: 0; }
.header { display: flex; align-items: flex-start; gap: 12px; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
.header img { width: 100px; height: 100px; object-fit: contain; }
.header-text { flex: 1; text-align: center; }
.org { font-size: 30px; margin: 20px 0 6px; color: rgb(36, 99, 154); font-weight: 700; }
.addr, .title, .course { margin: 4px 0; font-weight: 700; text-align: center; }
.meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 14px; }
.meta td { text-align: left; padding: 5px; border: none; }
table.marks { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 15px; }
table.marks th, table.marks td { border: 2px solid #c5bec0; padding: 10px; text-align: center; }
table.marks td:nth-child(2) { text-align: left; }
table.marks td.group { text-align: left; border: none; padding: 8px 0 4px; text-transform: capitalize; }
</style></head><body>
<div class="header">
  <img src="${escapeHtml(logo)}" alt="College Logo" />
  <div class="header-text">
    <p class="org">${escapeHtml(orgName)}</p>
    <p class="addr">${escapeHtml(orgAddress)}</p>
    <p class="title">CONSOLIDATED MARKS MEMO / CREDIT SHEET</p>
    <p class="course">${escapeHtml(courseLine)}</p>
  </div>
  ${photoAbs ? `<img src="${escapeHtml(photoAbs)}" alt="Student" />` : `<div style="width:100px;height:100px"></div>`}
</div>
<table class="meta">
  <tr>
    <td style="width:50%">Year Of Admission : ${escapeHtml(txt(head.yearOfAdmission))}</td>
    <td>Month &amp; Year of Examination : ${escapeHtml(txt(head.exam_month_yr))}</td>
  </tr>
  <tr>
    <td>Hall Ticket Number : ${escapeHtml(txt(head.roll_number))}</td>
    <td>Name : ${escapeHtml(txt(head.student_name))}</td>
  </tr>
</table>
${tables}
</body></html>`);
}

"use client";

/**
 * Practical Exam Batch List — iframe print (Angular student-exam-lab-batches
 * print-div). Isolated document avoids AppShell bleed; waits for logo load.
 */

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";

type AnyRow = Record<string, any>;

export type LabBatchPrintMeta = {
  collegeName: string;
  courseName: string;
  courseGroupName: string;
  subjectName: string;
  subjectCode: string;
  courseYearName: string;
  examEndName?: string;
  logoUrl?: string;
  orgCode?: string;
};

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const tConvert = (time?: string | null) => {
  if (!time) return "";
  const m = String(time).match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!m) return String(time);
  const hh = Number(m[1]);
  const mm = m[2];
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
};

const fmtDate = (value?: string | null) => {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

/** Angular student-exam-lab-batches.component.scss — screen + print */
const PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-div { width: 100%; }
  table {
    width: 99%;
    border-collapse: collapse;
    border-spacing: 0;
    margin: 0 0 8px 0;
    page-break-inside: auto;
  }
  .table-th {
    padding: 5px;
    font-weight: 500;
    color: #000;
    border: 1px solid #000;
    text-align: center;
  }
  .table-td {
    padding: 5px;
    font-weight: 500;
    color: #000;
    border: 1px solid #000;
    text-align: left;
  }
  .college-name {
    text-align: left;
    font-size: 25px;
    margin: 1% 0 -1px;
    font-weight: 550;
    color: #000;
  }
  .college-name-center {
    text-align: center;
    font-size: 25px;
    margin: 1% 0 -1px;
    font-weight: 550;
    color: #000;
  }
  .portrait-logo {
    height: 80%;
    width: 80%;
    max-height: 100px;
    border: none;
    vertical-align: top;
  }
  .header-table {
    width: 100%;
    border: none;
    margin-bottom: 4px;
  }
  .header-table td {
    border: none;
    padding: 0;
    vertical-align: middle;
  }
  .header-logo-cell { width: 18%; }
  .header-title-cell { width: 82%; }
  .clg-logo-wrap {
    text-align: center;
    margin-bottom: 8px;
  }
  .clg-logo-wide {
    height: auto;
    width: 100%;
    max-width: 1200px;
    border: none;
  }
  .details-table {
    width: 99%;
    border-collapse: collapse;
    margin-bottom: 1%;
    border: 1px solid #000;
  }
  .details-table th {
    border: none;
    text-align: left;
    font-weight: 550;
    font-size: 13px;
    padding: 6px 8px;
    color: #000;
    background: #fff;
  }
  #main-tb {
    width: 100%;
    margin: auto;
  }
  #table-4 {
    width: 99%;
    border-collapse: collapse;
    margin-bottom: 12px;
    color: #000;
  }
  #table-4 th {
    width: 50%;
    padding: 5px;
    font-weight: 500;
    color: #000;
    background: #fff;
    border: none;
    border-bottom: 1px solid #000;
  }
  #table-4 th:first-child {
    text-align: left;
    border-right: 1px solid #000;
  }
  #table-4 th:last-child {
    text-align: right;
  }
  .signature-1 {
    text-align: end;
    margin-top: 30px;
    font-weight: 800;
    margin-left: 75%;
  }
  @media print {
    html, body { background: #fff !important; }
    table, th, td { color: #000 !important; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
  @page { margin: 1cm; }
`;

function printHtmlInIframe(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }

  fdoc.open();
  fdoc.write(html);
  fdoc.close();

  const cleanup = () => frame.remove();
  win.addEventListener("afterprint", cleanup);

  const imgs = Array.from(fdoc.images);
  const waitForImages = imgs.length
    ? Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      )
    : Promise.resolve();

  void waitForImages.then(() => {
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(cleanup, 1500);
    }, 800);
  });
}

function buildLabBatchDocument(
  batchesData: AnyRow[],
  studentBatchesData: AnyRow[],
  meta: LabBatchPrintMeta,
): string {
  const orgCode =
    meta.orgCode ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("orgCode") ?? "")
      : "");
  const isSuk = orgCode === "SUK";
  const logoSrc = escapeHtml(meta.logoUrl || DEFAULT_COLLEGE_LOGO);
  const subjectLine = `${escapeHtml(meta.subjectName)}-(${escapeHtml(meta.subjectCode)})`;

  const sortedBatches = [...batchesData].sort(
    (a, b) =>
      Number(pickText(a, ["fk_exam_labbatch_id", "examLabBatchId"]) || 0) -
      Number(pickText(b, ["fk_exam_labbatch_id", "examLabBatchId"]) || 0),
  );

  let headerHtml = "";
  if (!isSuk) {
    headerHtml = `
      <table class="header-table" cellspacing="0" cellpadding="0">
        <tr>
          <td class="header-logo-cell">
            <img src="${logoSrc}" class="portrait-logo" alt="" onerror="this.onerror=null;this.src='${DEFAULT_COLLEGE_LOGO}';" />
          </td>
          <td class="header-title-cell">
            <p class="college-name" style="text-align:left !important">Practical Exam Batch List</p>
          </td>
        </tr>
      </table>`;
  } else {
    headerHtml = `
      <div class="clg-logo-wrap">
        <img src="${logoSrc}" class="clg-logo-wide" alt="" onerror="this.onerror=null;this.src='${DEFAULT_COLLEGE_LOGO}';" />
      </div>
      <div class="header">
        <p class="college-name-center">Practical Exam Batch List${meta.examEndName ? ` - ${escapeHtml(meta.examEndName)}` : ""}</p>
      </div>`;
  }

  const batchBlocks = sortedBatches
    .map((batch) => {
      const batchName = pickText(batch, [
        "labbatch_name",
        "batchName",
        "labBatchName",
      ]);
      const batchStudents = studentBatchesData.filter(
        (s) =>
          pickText(s, ["labbatch_name", "batchName", "labBatchName"]) ===
          batchName,
      );

      const studentRows = batchStudents
        .map((student) => {
          const ht = escapeHtml(
            pickText(student, ["hallticket_number", "hallticketNumber"]),
          );
          const name = escapeHtml(
            pickText(student, ["student_name", "studentName"]),
          );
          return `<tr>
            <th style="width:50% !important;">
              <span style="color:black !important;">${ht}</span>
            </th>
            <th style="width:50% !important;">
              <span style="color:black !important;">${name}</span>
            </th>
          </tr>`;
        })
        .join("");

      return `
        <table class="details-table" cellspacing="0" cellpadding="0">
          <tr>
            <th style="border:none !important; font-size:16px !important; text-align:left !important;">
              Batch : ${escapeHtml(batchName)},
              &nbsp; &nbsp;Date : ${fmtDate(pickText(batch, ["exam_date", "examDate"]))},
              &nbsp; &nbsp; Time : ${tConvert(pickText(batch, ["session_start_time", "sessionStartTime"]))}
              To ${tConvert(pickText(batch, ["session_end_time", "sessionEndTime"]))}
            </th>
          </tr>
        </table>
        <table id="table-4" cellspacing="0" cellpadding="0" style="width:100%; border-collapse:collapse; border:1px solid #000;">
          <tbody>${studentRows}</tbody>
        </table>`;
    })
    .join("");

  const body = `
    <div class="print-div">
      <div style="width:100% !important;">
        ${headerHtml}
        <table cellspacing="0" cellpadding="0">
          <tr>
            <th class="table-th" style="text-align:left !important;">Faculty Name</th>
            <th class="table-th" style="text-align:left !important;">Programme</th>
            <th class="table-th">Course Title with code</th>
            <th class="table-th">Semester</th>
          </tr>
          <tr>
            <td class="table-td" style="text-align:left !important;">${escapeHtml(meta.collegeName)}</td>
            <td class="table-td" style="text-align:left !important;">${escapeHtml(meta.courseName)} - ${escapeHtml(meta.courseGroupName)}</td>
            <td class="table-td" style="text-align:left !important;">${subjectLine}</td>
            <td class="table-td" style="text-align:left !important;">${escapeHtml(meta.courseYearName)}</td>
          </tr>
        </table>
        <div id="main-tb">${batchBlocks}</div>
        <div class="signature-1"><label>Signature of Chairperson</label></div>
      </div>
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.collegeName || "Practical Exam Batch List")}</title><style>${PRINT_STYLES}</style></head><body>${body}</body></html>`;
}

export function useLabBatchPrint(
  batchesData: AnyRow[],
  studentBatchesData: AnyRow[],
  meta: LabBatchPrintMeta,
): {
  printButton: ReactNode;
  printBatchList: () => void;
} {
  const printBatchList = () => {
    if (studentBatchesData.length === 0) return;
    printHtmlInIframe(
      buildLabBatchDocument(batchesData, studentBatchesData, meta),
    );
  };

  const printButton = (
    <Button
      type="button"
      className="h-9 text-[12px]"
      disabled={studentBatchesData.length === 0}
      onClick={printBatchList}
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      Print
    </Button>
  );

  return { printButton, printBatchList };
}

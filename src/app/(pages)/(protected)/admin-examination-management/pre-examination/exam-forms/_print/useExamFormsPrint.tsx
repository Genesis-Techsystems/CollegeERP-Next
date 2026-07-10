"use client";

/**
 * Exam Forms — three iframe-isolated print views (Angular parity):
 *  - Print Form-A  → print-form-a (FORM - A)
 *  - Print D Forms → print-dforms (SUBJECT WISE D-FORM)
 *  - Print Forms   → print-exam-form (EXAM FORM)
 *
 * Uses a hidden iframe (like lab-batch / OMR prints) so AppShell animations
 * and @media print chrome rules never produce blank PDF pages.
 */

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";

type AnyRow = Record<string, any>;

export type ExamFormsPrintMeta = {
  courseYear: string;
  examName: string;
  logoUrl?: string;
  groupName?: string;
};

const g = (r: AnyRow, keys: string[]): string => {
  for (const k of keys) {
    const v = r?.[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function fmtDate(v: unknown, style: "dd/MM/yyyy" | "MMM d, y"): string {
  const s = v ? String(v).slice(0, 10) : "";
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(v ?? "");
  if (style === "dd/MM/yyyy") {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HT = (r: AnyRow) => g(r, ["hallticket_number", "hallticketNumber"]);
const NAME = (r: AnyRow) =>
  g(r, ["student_name", "studentName", "StudentName"]);
const SERIAL = (r: AnyRow) => g(r, ["omr_serial_no", "omrSerialNo"]);
const presentVal = (r: AnyRow) => r?.is_present ?? r?.isPresent ?? null;
const isUfm = (r: AnyRow) => r?.isUfm ?? r?.is_ufm === true;

/** Angular print-form-a / print-dforms / print-exam-form SCSS */
const PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .layout {
    margin: 0 auto;
    width: 990px;
    max-width: 100%;
    font-family: Arial, sans-serif;
    color: #000;
  }
  #table1 { border: none !important; width: 100%; border-collapse: collapse; }
  #table1 tr { border: none !important; }
  #table1 td {
    border: none !important;
    width: 249px;
    font-family: arial, sans-serif;
    font-size: 14px;
    padding: 6px;
    font-weight: bold;
  }
  #table2 {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    margin: auto;
    padding: 10px 0;
    font-family: arial, sans-serif;
    border: none;
  }
  #table2 .ht-cell {
    border: none !important;
    vertical-align: middle;
    text-align: center;
    box-sizing: border-box;
    padding: 2px 0;
    font-family: arial, sans-serif;
  }
  #table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2%;
  }
  #table .table-th {
    padding: 5px 16px;
    border: 1px solid #000;
    font-size: 15px;
    text-align: left;
    font-weight: bold;
  }
  hr {
    clear: both;
    display: block;
    width: 100%;
    height: 1px;
    background: #000;
    border: none;
    margin: 0;
  }
  .collegeName {
    text-align: center;
    font-size: 23px;
    margin-top: 1%;
    margin-bottom: -15px;
    font-weight: 550;
  }
  .collegeName-2 {
    text-align: center;
    font-size: 23px;
    margin-top: 1%;
    font-weight: 550;
  }
  .title {
    text-align: center;
    font-size: 18px;
    font-weight: 500;
    margin-bottom: -5px;
  }
  .title2 {
    text-align: right;
    font-size: 15px;
    font-weight: 650;
    margin-bottom: 3px;
  }
  .text {
    font-family: arial, sans-serif;
    font-size: 14px;
    padding: 8px;
    font-weight: bold;
    margin: 0;
  }
  .portraitLogo { height: 80%; width: 80%; }
  .college-banner { width: 100%; height: auto; display: block; }
  .college-banner-2 {
    width: 100%;
    height: 90px;
    display: block;
    object-fit: contain;
  }
  .custom-table {
    width: 100%;
    font-size: 14px;
    border-collapse: collapse;
    margin-bottom: 20px;
    border: 1px solid #000;
  }
  .custom-table th,
  .custom-table td {
    border: 1px solid #000;
    padding: 8px;
    text-align: center;
  }
  .custom-table th { font-weight: bold; }
  .table-container {
    margin: 20px auto;
    width: 90%;
    font-family: Arial, sans-serif;
  }
  .footer-info td {
    border: none !important;
    font-size: 14px;
    padding: 4px 0;
  }
  .header-row { display: flex; align-items: center; }
  .header-logo { width: 15%; flex-shrink: 0; }
  .header-title { width: 85%; text-align: center; }
  .sig-row { display: flex; margin-top: 8%; gap: 16px; }
  .sig-col { flex: 1; }
  @media print {
    html, body { background: #fff !important; }
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
    }, 100);
  });
}

function wrapDocument(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body><div class="layout">${body}</div></body></html>`;
}

function resolveOrgCode(head: AnyRow): string {
  const fromRow = g(head, ["university_code", "universityCode"]);
  if (fromRow) return fromRow.toUpperCase();
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("orgCode");
    if (stored) return stored.toUpperCase();
  }
  return "";
}

function hallticketGridHtml(
  rows: AnyRow[],
  colWidth: string,
  fontSize: string,
): string {
  if (!rows.length) return "";
  const cells = rows
    .map(
      (d) =>
        `<div class="ht-cell" style="width:${colWidth};font-size:${fontSize};">${escapeHtml(HT(d))}</div>`,
    )
    .join("");
  return `<div id="table2">${cells}</div>`;
}

const ORG_BANNER_PATH: Record<string, string> = {
  MVSR: "/assets/images/avatars/MVSR_BANNER.png",
  MECS: "/assets/images/avatars/MECS_BANNER.png",
};

/** Absolute URL for iframe print documents (static paths + MinIO logos). */
function absUrl(src: string): string {
  if (!src) return "";
  if (/^(https?:\/\/|data:)/i.test(src)) return src;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${src.startsWith("/") ? src : `/${src}`}`;
  }
  return src.startsWith("/") ? src : `/${src}`;
}

function bannerImgHtml(
  orgCode: string,
  logoSrc: string,
  cssClass: string,
): string {
  const logo = absUrl(logoSrc || DEFAULT_COLLEGE_LOGO);
  const staticPath = ORG_BANNER_PATH[orgCode];
  const primary = staticPath ? absUrl(staticPath) : logo;
  const fb = logo.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<img src="${escapeHtml(primary)}" alt="" class="${cssClass}"
    onerror="if(this.dataset.fbk)return;this.dataset.fbk='1';this.src='${fb}';" />`;
}

function formAHeaderHtml(
  orgCode: string,
  logoSrc: string,
  examName: string,
  examDate: unknown,
): string {
  const e = escapeHtml;
  const dateStr = e(fmtDate(examDate, "dd/MM/yyyy"));
  const nameStr = e(examName);
  const logo = absUrl(logoSrc || DEFAULT_COLLEGE_LOGO);

  if (orgCode === "MVSR") {
    return `
      ${bannerImgHtml(orgCode, logoSrc, "college-banner-2")}
      <p class="collegeName">FORM - A</p>
      <p class="title">${nameStr}</p>
      <p class="title2">Exam Date : ${dateStr}</p>`;
  }
  if (orgCode === "MECS") {
    return `
      ${bannerImgHtml(orgCode, logoSrc, "college-banner")}
      <p class="collegeName">FORM - A</p>
      <p class="title">${nameStr}</p>
      <p class="title2">Exam Date : ${dateStr}</p>`;
  }
  if (orgCode === "SUK") {
    const fb = logo.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `
      <img src="${e(logo)}" alt="" style="width:100%;max-height:60px;object-fit:contain"
        onerror="if(this.dataset.fbk)return;this.dataset.fbk='1';this.src='${fb}';" />
      <p class="collegeName">FORM - A</p>
      <p class="title">${nameStr}</p>
      <p class="title2">Exam Date : ${dateStr}</p>`;
  }
  const fb = logo.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `
    <div class="header-row">
      <div class="header-logo">
        <img src="${e(logo)}" alt="" class="portraitLogo"
          onerror="if(this.dataset.fbk)return;this.dataset.fbk='1';this.src='${fb}';" />
      </div>
      <div class="header-title" style="margin-top:5%;">
        <p class="collegeName-2">FORM - A</p>
      </div>
    </div>`;
}

function formASignaturesHtml(orgCode: string): string {
  const isMvsrMecs = orgCode === "MVSR" || orgCode === "MECS";
  const left = isMvsrMecs
    ? "Sign of Controller of Examinations"
    : "Signature of Chief Superintendent (CS) :";
  const right = isMvsrMecs
    ? "Signature of Chief Superintendent (CS) :"
    : "Signature of Dy.Chief Superintendent (DCS) :";
  return `
    <div class="sig-row">
      <div class="sig-col">
        <table id="table1"><tr><td>${left}</td></tr><tr><td>Name :</td></tr></table>
      </div>
      <div class="sig-col">
        <table id="table1"><tr><td>${right}</td></tr><tr><td>Name :</td></tr></table>
      </div>
    </div>`;
}

function buildFormADocument(
  students: AnyRow[],
  meta: ExamFormsPrintMeta,
): string {
  const head = students[0] ?? {};
  const orgCode = resolveOrgCode(head);
  const logoSrc = meta.logoUrl || DEFAULT_COLLEGE_LOGO;
  const collegeName = g(head, ["college_name", "collegeName"]);
  const groupCode = g(head, ["group_code", "groupCode"]);
  const subjectName = g(head, ["subject_name", "subjectName"]);
  const subjectCode = g(head, ["subject_code", "subjectCode"]);
  const examName = g(head, ["exam_name", "examName"]) || meta.examName;
  const examDate = head.exam_date ?? head.examDate;
  const courseYear = meta.courseYear;

  const appearing = students.filter((s) => presentVal(s) === null);
  const presentStudents = students.filter((s) => presentVal(s) === true);
  const absentStudents = students.filter((s) => presentVal(s) === false);
  const malpractice = students.filter((s) => isUfm(s));

  const absentSpans = absentStudents
    .map(
      (d) =>
        `<span style="padding-left:10px;font-weight:400;">${escapeHtml(HT(d))}</span>`,
    )
    .join("");
  const malSpans = malpractice
    .map(
      (d) =>
        `<span style="padding-left:10px;font-weight:400;">${escapeHtml(HT(d))}</span>`,
    )
    .join("");

  const e = escapeHtml;
  const body = `
    ${formAHeaderHtml(orgCode, logoSrc, examName, examDate)}
    <table id="table">
      <tr><th class="table-th">College</th><th class="table-th">${e(collegeName)}</th></tr>
      <tr><th class="table-th">Course Group</th><th class="table-th">${e(groupCode)}</th></tr>
      <tr><th class="table-th">Semester</th><th class="table-th">${e(courseYear)}</th></tr>
      <tr><th class="table-th">Subject title with Code</th>
        <th class="table-th">${e(subjectName)}&nbsp;(${e(subjectCode)})</th></tr>
    </table>
    ${hallticketGridHtml(appearing, "16.6%", "14px")}
    ${hallticketGridHtml(presentStudents, "16.6%", "14px")}
    <hr />
    <p class="text">HallTicket No of Absentees :${absentSpans}</p>
    <p class="text" style="margin-top:1.5%;margin-bottom:1.5%;">HallTicket No of Malpractice :${malSpans}</p>
    <table id="table">
      <tr><th class="table-th">Total number of students appearance</th>
        <th class="table-th">${students.length}</th></tr>
      <tr><th class="table-th">Total number of students present</th>
        <th class="table-th">${presentStudents.length > 0 ? presentStudents.length : ""}</th></tr>
      <tr><th class="table-th">Total number of students absent</th>
        <th class="table-th">${absentStudents.length > 0 ? absentStudents.length : ""}</th></tr>
      <tr><th class="table-th">Malpractice Case</th>
        <th class="table-th">${malpractice.length > 0 ? malpractice.length : ""}</th></tr>
      <tr><th class="table-th">Total number of answer scripts dispatched</th>
        <th class="table-th"></th></tr>
    </table>
    ${formASignaturesHtml(orgCode)}`;

  return wrapDocument(`FORM - A — ${collegeName || examName}`, body);
}

function buildDFormDocument(
  students: AnyRow[],
  meta: ExamFormsPrintMeta,
): string {
  const head = students[0] ?? {};
  const orgCode = resolveOrgCode(head);
  const logoSrc = meta.logoUrl || DEFAULT_COLLEGE_LOGO;
  const collegeName = g(head, ["college_name", "collegeName"]);
  const groupCode = g(head, ["group_code", "groupCode"]);
  const groupName =
    meta.groupName || g(head, ["group_name", "groupName"]) || groupCode;
  const subjectName = g(head, ["subject_name", "subjectName"]);
  const subjectCode = g(head, ["subject_code", "subjectCode"]);
  const examDate = head.exam_date ?? head.examDate;
  const sessinTime = g(head, ["sessin_time", "sessinTime"]);
  const sessionName = g(head, ["exam_session_name", "examSessionName"]);
  const e = escapeHtml;

  let orgHeader = "";
  if (orgCode === "AMS") {
    orgHeader = `
      <div style="text-align:center;">
        <h2 style="font-size:20px;margin-bottom:-17px;"><b>ANDHRA MAHILA SABHA ARTS &amp; SCIENCE COLLEGE FOR WOMEN</b></h2>
        <h2 style="font-size:20px;margin-bottom:-17px;"><b>(AUTONOMOUS)</b></h2>
        <h3 style="margin-bottom:15px;"><b>O.U CAMPUS. HYDERABAD</b></h3>
      </div>`;
  } else if (orgCode === "SUK") {
    orgHeader = `
      <img src="${e(logoSrc)}" alt="" style="width:100%;max-height:60px;object-fit:contain"
        onerror="this.onerror=null;this.src='${DEFAULT_COLLEGE_LOGO}';" />
      <div style="text-align:center;">
        <h2 style="font-size:20px;margin-bottom:-10px;"><b>${e(collegeName)}</b></h2>
      </div>`;
  }

  const body = `
    ${orgHeader}
    <table id="table1"><tr>
      <td>Course: &nbsp;${e(groupName)}</td>
      <td style="text-align:center;">SUBJECT WISE D-FORM</td>
      <td></td>
    </tr></table>
    <hr />
    <table id="table1"><tr>
      <td>Exam Date : &nbsp;${e(fmtDate(examDate, "MMM d, y"))}</td>
      <td>Exam Time :&nbsp;${e(sessinTime)}</td>
      <td>Exam Session :&nbsp;${e(sessionName)}&nbsp;</td>
    </tr></table>
    <hr />
    <table id="table1"><tr>
      <td>Subject Name: &nbsp;${e(subjectName)}-${e(subjectCode)}</td>
    </tr></table>
    <hr />
    ${hallticketGridHtml(students, "25%", "17px")}
    <hr />
    <table id="table1"><tr>
      <td>Total : ${students.length}</td>
      <td>No.of Additions :</td>
      <td>No. of Present :</td>
      <td>No. of Absent :</td>
    </tr></table>`;

  return wrapDocument(`SUBJECT WISE D-FORM — ${subjectName}`, body);
}

function buildExamFormDocument(
  students: AnyRow[],
  meta: ExamFormsPrintMeta,
): string {
  const head = students[0] ?? {};
  const orgCode = resolveOrgCode(head);
  const logoSrc = meta.logoUrl || DEFAULT_COLLEGE_LOGO;
  const collegeName = g(head, ["college_name", "collegeName"]);
  const groupCode = g(head, ["group_code", "groupCode"]);
  const subjectName = g(head, ["subject_name", "subjectName"]);
  const subjectCode = g(head, ["subject_code", "subjectCode"]);
  const examDate = head.exam_date ?? head.examDate;
  const courseYear = meta.courseYear;
  const e = escapeHtml;

  const headerHtml =
    orgCode !== "SUK"
      ? `
    <div class="header-row" style="justify-content:center;">
      <div class="header-logo">
        <img src="${e(absUrl(logoSrc))}" alt="" class="portraitLogo"
          onerror="if(this.dataset.fbk)return;this.dataset.fbk='1';this.src='${absUrl(DEFAULT_COLLEGE_LOGO).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}';" />
      </div>
      <div class="header-title">
        <p class="collegeName" style="margin-top:2%;">${e(collegeName)}</p>
        <p class="collegeName" style="padding-top:10px;">EXAM FORM</p>
      </div>
    </div>`
      : "";

  const studentRows = students
    .map(
      (d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e(HT(d))}</td>
        <td>${e(NAME(d))}</td>
        <td>${e(SERIAL(d))}</td>
        <td></td>
        <td>&nbsp;<input type="radio" name="status-${i}" />&nbsp;Absent</td>
        <td>&nbsp;<input type="radio" name="status-${i}" />&nbsp;Malpractice</td>
      </tr>`,
    )
    .join("");

  const body = `
    ${headerHtml}
    <div class="table-container">
      <table class="custom-table">
        <tr>
          <th>COURSE:</th><td>${e(groupCode)}</td>
          <th>SEMESTER:</th><td>${e(courseYear)}</td>
        </tr>
        <tr>
          <th>SUBJECT:</th><td>${e(subjectName)}&nbsp;(${e(subjectCode)})</td>
          <th>PAPER CODE:</th><td></td>
        </tr>
        <tr>
          <th>EXAM DATE &amp; TIME:</th><td>${e(fmtDate(examDate, "dd/MM/yyyy"))}</td>
          <th>SCHEME:</th><td></td>
        </tr>
      </table>
      <table class="custom-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Hall Ticket Number</th>
            <th>Student Name</th>
            <th>Answer Book Serial Number</th>
            <th>Signature</th>
            <th colspan="2">Record Attendence for Absent and Malpractice Only</th>
          </tr>
        </thead>
        <tbody>${studentRows}</tbody>
      </table>
      <p style="font-size:14px;margin:8px 0;">
        Please darken the circle Absent or Malpractice again Hall ticket number, if any.
      </p>
      <div class="footer-info">
        <table id="table">
          <tr>
            <td>Total no. of students in this sheet: </td>
            <td>Total no. of Malpractice cases in this sheet:</td>
          </tr>
          <tr>
            <td>Total no. of Absent students in this sheet:</td>
            <td>Total no. of Malpractice cases in this sheet:</td>
          </tr>
        </table>
      </div>
      <div class="footer-info">
        <table id="table" style="margin-top:10px;">
          <tr>
            <td>Signature of Invigilator</td>
            <td style="text-align:end;">Signature of Exam Superintendent with seal</td>
          </tr>
        </table>
      </div>
    </div>`;

  return wrapDocument(`EXAM FORM — ${collegeName}`, body);
}

export function useExamFormsPrint(
  students: AnyRow[],
  meta: ExamFormsPrintMeta,
): { printButtons: ReactNode } {
  const printFormA = () => {
    if (!students.length) return;
    printHtmlInIframe(buildFormADocument(students, meta));
  };
  const printDForm = () => {
    if (!students.length) return;
    printHtmlInIframe(buildDFormDocument(students, meta));
  };
  const printForm = () => {
    if (!students.length) return;
    printHtmlInIframe(buildExamFormDocument(students, meta));
  };

  const printButtons = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        className="h-8 text-[12px]"
        disabled={students.length === 0}
        onClick={printFormA}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Form-A
      </Button>
      <Button
        type="button"
        className="h-8 text-[12px]"
        disabled={students.length === 0}
        onClick={printDForm}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print D Forms
      </Button>
      <Button
        type="button"
        className="h-8 text-[12px]"
        disabled={students.length === 0}
        onClick={printForm}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Forms
      </Button>
    </div>
  );

  return { printButtons };
}

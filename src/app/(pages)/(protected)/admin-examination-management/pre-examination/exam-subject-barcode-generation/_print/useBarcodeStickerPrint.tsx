"use client";

/**
 * Exam Subject Barcode — print modes (Angular exam-subject-barcode-generation):
 *
 *  presence-barcode     → printPresencebarcode()  printHn:false barcodeNo:true  is_present only
 *  stickers             → Stickers()               printHn:true  barcodeNo:false
 *  stickers-with-bn     → StickersWithBn()         printHn:true  barcodeNo:true
 *  stickers-without-usn → StickersHallTicketNo()   printHn:false barcodeNo:true
 *  omr-sheets           → omrpage()                → omr-sheets-design (ANSWER SHEET + details)
 *  answer-sheets        → omrSinglePage()          → omr-single-page-design (barcode only)
 *
 * All modes print via hidden iframe so AppShell @media print never blanks the preview.
 */

import { useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Printer } from "lucide-react";
import { printHtmlInIframe } from "@/lib/print";
import { toast } from "sonner";

type AnyRow = Record<string, any>;

export type BarcodePrintMode =
  | "presence-barcode"
  | "stickers"
  | "stickers-with-bn"
  | "stickers-without-usn"
  | "omr-sheets"
  | "answer-sheets";

/** Angular query params for print-barcode-stickers / omr pages */
export type BarcodePrintMeta = {
  examName: string;
  collegeName: string;
  collegeCode: string;
  academicYear: string;
  courseCode: string;
  courseGroupCode: string;
  courseYear: string;
};

const STICKER_FLAGS: Record<string, { printHn: boolean; barcodeNo: boolean }> =
  {
    "presence-barcode": { printHn: false, barcodeNo: true },
    stickers: { printHn: true, barcodeNo: false },
    "stickers-with-bn": { printHn: true, barcodeNo: true },
    "stickers-without-usn": { printHn: false, barcodeNo: true },
  };

function isPresentStudent(row: AnyRow): boolean {
  const v = row?.is_present ?? row?.isPresent;
  return (
    v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true"
  );
}

const txt = (v: unknown) => (v == null ? "" : String(v).trim());

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const barcodeSrc = (r: AnyRow) => {
  const b = txt(r.omr_barcode ?? r.omrBarcode);
  if (!b || b === "-") return "";
  if (b.startsWith("data:")) return b;
  return `data:image/jpg;base64,${b}`;
};

/** Angular print-barcode-stickers.component */
const STICKER_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #000;
    font-family: arial, sans-serif;
  }
  .layout {
    margin: 0 auto;
    width: 990px;
  }
  #table-print {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed !important;
  }
  thead { display: table-header-group; }
  .header-cell {
    width: 100%;
    border: 1px solid #000;
    padding: 25px 0 9px 0;
    text-align: center;
    vertical-align: middle;
    font-size: 10px !important;
    font-weight: bold;
  }
  .span-1 { font-size: 10px !important; font-weight: bold !important; }
  tbody tr {
    margin: 0 4px;
    display: block;
  }
  .sticker-td {
    margin: auto;
    float: left;
    width: 25%;
    border: none !important;
    vertical-align: middle !important;
    padding: 27px 0 9px 0 !important;
    text-align: center;
    page-break-inside: avoid;
  }
  .sticker-td .top {
    display: flex;
    justify-content: center;
    margin-bottom: 3px;
    font-size: 12px !important;
  }
  .sticker-td img {
    height: 30px;
    width: 180px !important;
    display: block;
    margin: 0 auto;
  }
  .sticker-td .bottom {
    display: flex;
    justify-content: center;
    font-size: 7px;
    margin-top: 1px;
  }
  .empty { text-align: center; font-size: 12px; padding: 24px; }
  @page { size: A4; margin: 10mm; }
`;

/** Angular omr-sheets-design.component.scss */
const OMR_SHEET_STYLES = `
  h2 { font-weight: bold; margin-bottom: -15px; text-align: center; }
  .sheet { text-align: center !important; margin-bottom: 35px; }
  h3 { margin-bottom: -15px; text-align: center; }
  .main-card {
    margin-left: 10px !important;
    border-radius: 0;
    border: 1px solid #d87093;
    margin-right: 2px !important;
  }
  table {
    width: 100%;
    font-family: arial, sans-serif;
    font-size: 11px !important;
    border-collapse: collapse;
  }
  td, th { padding: 3px; }
  th {
    text-align: right;
    width: 26%;
    border: none !important;
    color: palevioletred;
    font-weight: normal;
  }
  td {
    text-align: left;
    border: none !important;
  }
  .layout {
    margin: 0 auto !important;
    width: 990px !important;
  }
  body {
    background-color: #fff !important;
    margin: 0;
    color: #000;
  }
  .page {
    height: 1048px;
    max-height: 1048px !important;
    overflow: hidden !important;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .barcode {
    padding: 11px;
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    border: 1px solid #d87093;
    margin-top: 5px;
    margin-left: 10px;
    margin-right: 2px;
  }
  @page { margin: 1cm; }
`;

/** Angular omr-single-page-design — barcode page only */
const ANSWER_SHEET_STYLES = `
  .layout {
    margin: 0 auto !important;
    width: 990px !important;
  }
  body {
    background-color: #fff !important;
    margin: 0;
    color: #000;
  }
  .page {
    height: 1048px;
    max-height: 1048px !important;
    overflow: hidden !important;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  @page { margin: 1cm; }
`;

function firstRow(rows: AnyRow[]): AnyRow {
  return rows[0] ?? {};
}

/** Angular print-barcode-stickers header (single continuous sticker sheet). */
function buildStickerDocument(
  targetRows: AnyRow[],
  meta: BarcodePrintMeta,
  printHn: boolean,
  barcodeNo: boolean,
): string {
  if (targetRows.length === 0) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Stickers</title><style>${STICKER_STYLES}</style></head><body><p class="empty">No students with barcodes to print.</p></body></html>`;
  }

  const head = firstRow(targetRows);
  const examName = escapeHtml(
    txt(head.exam_name ?? head.examName ?? meta.examName),
  );
  const examDate = escapeHtml(txt(head.exam_date ?? head.examDate));
  const session = escapeHtml(
    txt(head.exam_session_name ?? head.examSessionName ?? head.session_name),
  );
  const subjectName = escapeHtml(txt(head.subject_name ?? head.subjectName));
  const subjectCode = escapeHtml(txt(head.subject_code ?? head.subjectCode));

  const cells = targetRows
    .map((data) => {
      const ht = printHn
        ? escapeHtml(txt(data.hallticket_number ?? data.hallticketNumber))
        : "";
      const serial = barcodeNo
        ? escapeHtml(txt(data.omr_serial_no ?? data.omrSerialNo))
        : "";
      const top = [ht, serial].filter(Boolean).join("&nbsp;&nbsp;");
      const src = barcodeSrc(data);
      const img = src
        ? `<img src="${src}" alt="" />`
        : `<div style="height:30px;width:180px;margin:0 auto;"></div>`;
      const date = escapeHtml(txt(data.exam_date ?? data.examDate));
      const code = escapeHtml(txt(data.subject_code ?? data.subjectCode));
      return `
        <td class="sticker-td">
          <span class="top">${top}</span>
          ${img}
          <span class="bottom">${date}&nbsp;&nbsp;${code}</span>
        </td>
      `;
    })
    .join("");

  const body = `
    <div class="layout">
      <table id="table-print">
        <thead>
          <tr>
            <td class="header-cell">
              <span class="span-1">${examName}</span><br>
              <span>${escapeHtml(meta.collegeCode)} | ${escapeHtml(meta.academicYear)} | ${escapeHtml(meta.courseCode)} | ${escapeHtml(meta.courseGroupCode)} | ${escapeHtml(meta.courseYear)}</span><br>
              <span>${examDate}</span>&nbsp;<span>${session}</span><br>
              <span>${subjectName}-(${subjectCode})</span>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>${cells}</tr>
        </tbody>
      </table>
    </div>
  `;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${examName || "Stickers"}</title><style>${STICKER_STYLES}</style></head><body>${body}</body></html>`;
}

function omrSheetSection(
  data: AnyRow,
  collegeName: string,
  examNameFallback: string,
): string {
  const src = barcodeSrc(data);
  const barcodeImg = src
    ? `<img src="${src}" style="height:30px; width:382px !important;" alt="" />`
    : "";

  const rows: Array<[string, string]> = [
    ["Examination :", txt(data.exam_name ?? data.examName ?? examNameFallback)],
    [
      "Hall Ticket Number :",
      txt(data.hallticket_number ?? data.hallticketNumber),
    ],
    ["Center Code :", txt(data.examcenter ?? data.exam_center)],
    ["Seating Number :", txt(data.room_number ?? data.roomNumber)],
    [
      "Subject :",
      `${txt(data.subject_name ?? data.subjectName)} (${txt(data.subject_code ?? data.subjectCode)})`,
    ],
    ["Exam Date :", txt(data.exam_date ?? data.examDate)],
    [
      "Full Name :",
      txt(data.StudentName ?? data.student_name ?? data.studentName),
    ],
    ["Gender :", txt(data.gender)],
    ["Aadhar Number :", txt(data.aadhar_card_no ?? data.aadharCardNo)],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `
    <div class="page">
      <div class="sheet">
        <h2>${escapeHtml(collegeName)}</h2>
        <h3><b>ANSWER SHEET</b></h3>
      </div>
      <div class="main-card">
        <table>${tableRows}</table>
      </div>
      <div class="barcode">
        <div style="margin-left:20px; font-size:11px !important;">
          <p style="margin-left:10px !important;">${escapeHtml(txt(data.omr_serial_no ?? data.omrSerialNo))}</p>
          ${barcodeImg}
        </div>
      </div>
    </div>
  `;
}

function answerSheetSection(data: AnyRow): string {
  const src = barcodeSrc(data);
  const barcodeImg = src
    ? `<img src="${src}" style="height:40px; width:400px !important;" alt="" />`
    : "";

  return `
    <div class="page">
      <div style="text-align:center; margin-left:20px; font-size:11px !important;">
        ${barcodeImg}
        <p style="text-align:center; margin:0; display:flex; justify-content:center;">${escapeHtml(txt(data.omr_serial_no ?? data.omrSerialNo))}</p>
      </div>
    </div>
  `;
}

function buildOmrDocument(
  targetRows: AnyRow[],
  meta: BarcodePrintMeta,
): string {
  const body = targetRows
    .map((row) => omrSheetSection(row, meta.collegeName, meta.examName))
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.collegeName || "Answer Sheet")}</title><style>${OMR_SHEET_STYLES}</style></head><body><div class="layout">${body}</div></body></html>`;
}

function buildAnswerDocument(targetRows: AnyRow[]): string {
  const body = targetRows.map((row) => answerSheetSection(row)).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Answer Page</title><style>${ANSWER_SHEET_STYLES}</style></head><body><div class="layout">${body}</div></body></html>`;
}

export function useBarcodeStickerPrint(
  rows: AnyRow[],
  meta: BarcodePrintMeta,
): {
  printButton: ReactNode;
  printOmrFor: (row: AnyRow) => void;
  printAnswerFor: (row: AnyRow) => void;
} {
  const printOmrSheets = useCallback(
    (targetRows: AnyRow[]) => {
      if (targetRows.length === 0) {
        toast.info("No students to print.");
        return;
      }
      printHtmlInIframe(buildOmrDocument(targetRows, meta));
    },
    [meta],
  );

  const printAnswerSheets = useCallback((targetRows: AnyRow[]) => {
    if (targetRows.length === 0) {
      toast.info("No students to print.");
      return;
    }
    printHtmlInIframe(buildAnswerDocument(targetRows));
  }, []);

  const printStickers = useCallback(
    (mode: keyof typeof STICKER_FLAGS, targetRows: AnyRow[]) => {
      if (targetRows.length === 0) {
        toast.info(
          mode === "presence-barcode"
            ? "No present students with barcodes to print."
            : "No students with barcodes to print.",
        );
        return;
      }
      const flags = STICKER_FLAGS[mode];
      printHtmlInIframe(
        buildStickerDocument(targetRows, meta, flags.printHn, flags.barcodeNo),
      );
    },
    [meta],
  );

  const startBulk = useCallback(
    (mode: BarcodePrintMode) => {
      if (mode === "omr-sheets") {
        printOmrSheets(rows);
        return;
      }
      if (mode === "answer-sheets") {
        printAnswerSheets(rows);
        return;
      }
      const stickerRows =
        mode === "presence-barcode" ? rows.filter(isPresentStudent) : rows;
      printStickers(mode, stickerRows);
    },
    [rows, printOmrSheets, printAnswerSheets, printStickers],
  );

  const printOmrFor = useCallback(
    (row: AnyRow) => {
      printOmrSheets([row]);
    },
    [printOmrSheets],
  );

  const printAnswerFor = useCallback(
    (row: AnyRow) => {
      printAnswerSheets([row]);
    },
    [printAnswerSheets],
  );

  const printButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-[30px] px-3 text-[12px]"
          disabled={rows.length === 0}
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem
          className="text-[12px]"
          onClick={() => startBulk("presence-barcode")}
        >
          Print Presence Barcode
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[12px]"
          onClick={() => startBulk("stickers")}
        >
          Print Stickers
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[12px]"
          onClick={() => startBulk("stickers-with-bn")}
        >
          Print Stickers With Barcode No
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[12px]"
          onClick={() => startBulk("stickers-without-usn")}
        >
          Print Stickers Without USN
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[12px]"
          onClick={() => startBulk("omr-sheets")}
        >
          Print OMR Sheets
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-[12px]"
          onClick={() => startBulk("answer-sheets")}
        >
          Print Answer Sheets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return { printButton, printOmrFor, printAnswerFor };
}

"use client";

/**
 * Exam Subject Barcode — print modes (mirrors Angular exam-subject-barcode-generation):
 *
 *  - 'stickers'              Angular Stickers()
 *  - 'stickers-with-bn'      Angular StickersWithBn()
 *  - 'stickers-without-usn'  Angular StickersHallTicketNo()
 *  - 'omr-sheets'            Angular omrpage() → omr-sheets-design
 *  - 'answer-sheets'         Angular omrSinglePage() → omr-single-page-design
 *
 * Stickers render in-page via usePrintMode. OMR / Answer sheets print through a
 * hidden iframe with Angular HTML/CSS (omr-sheets-design / omr-single-page-design)
 * so AppShell grey backgrounds never bleed into the print preview.
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
import { usePrintMode } from "@/lib/print";

type AnyRow = Record<string, any>;

export type BarcodePrintMode =
  | "stickers"
  | "stickers-with-bn"
  | "stickers-without-usn"
  | "omr-sheets"
  | "answer-sheets";

const STICKER_FLAGS: Record<
  string,
  { showHallticket: boolean; showSerial: boolean }
> = {
  stickers: { showHallticket: true, showSerial: false },
  "stickers-with-bn": { showHallticket: true, showSerial: true },
  "stickers-without-usn": { showHallticket: false, showSerial: true },
};

const txt = (v: unknown) => (v == null ? "" : String(v));

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const barcodeOf = (r: AnyRow) => {
  const b = txt(r.omr_barcode ?? r.omrBarcode);
  return b && b !== "-" ? b : "";
};

/** Angular omr-sheets-design.component.scss */
const OMR_SHEET_STYLES = `
  h2 { font-weight: bold; margin-bottom: -15px; }
  .sheet { text-align: center !important; margin-bottom: 35px; }
  h3 { margin-bottom: -15px; }
  .main-card {
    margin-left: 10px !important;
    border-radius: 0;
    border: 1px solid #d87093;
    margin-right: 2px !important;
    padding: 4px 0;
  }
  table {
    width: 100%;
    table-layout: fixed;
    font-family: arial, sans-serif;
    font-size: 16px !important;
    border-collapse: collapse;
  }
  td, th { padding: 8px; }
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
    width: 74%;
  }
  .layout {
    padding:0.5rem !important;
    margin: 0 auto !important;
    margin-top: 0 !important;
    width: 990px !important;
  }
  body {
    background-color: #fff !important;
    margin: 0;
    color: #000;
  }
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
    padding:5px;
    margin: 0 auto !important;
    margin-top: 0 !important;
    width: 990px !important;
  }
  body {
    background-color: #fff !important;
    margin: 0;
    color: #000;
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
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 1500);
  }, 50);
}

function omrSheetSection(
  data: AnyRow,
  examName: string,
  collegeName: string,
  bulk: boolean,
): string {
  const pageStyle = bulk
    ? "height:1048px; max-height:1048px !important; overflow:auto !important;"
    : "";
  const barcode = barcodeOf(data);
  const barcodeImg = barcode
    ? `<img src="data:image/jpg;base64,${barcode}" style="height:30px; width:382px !important;" alt="" />`
    : "";

  const rows: Array<[string, string]> = [
    ["Examination :", txt(data.exam_name ?? examName)],
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
    <div class="layout">
      <div id="printsection" class="page-layout simple" style="${pageStyle}">
        <div class="sheet">
          <h3><b>ANSWER SHEET</b></h3>
        </div>
        <div class="main-card">
          <table>${tableRows}</table>
        </div>
        <div class="barcode">
          <div style="padding:5px; margin-left:20px; font-size:16px !important;">
            <p style="padding-bottom:8px; margin-left:10px !important; margin-top:0; margin-bottom:0;">${escapeHtml(txt(data.omr_serial_no ?? data.omrSerialNo))}</p>
            ${barcodeImg}
          </div>
        </div>
      </div>
    </div>
  `;
}

function answerSheetSection(data: AnyRow, bulk: boolean): string {
  const pageStyle = bulk
    ? "height:1048px; max-height:1048px !important; overflow:auto !important;"
    : "";
  const barcode = barcodeOf(data);
  const barcodeImg = barcode
    ? `<img src="data:image/jpg;base64,${barcode}" style="height:50px; width:420px !important;" alt="" />`
    : "";

  return `
    <div class="layout">
      <div id="printsection" class="page-layout simple" style="${pageStyle}">
        <div style="text-align:center; margin-left:20px; font-size:16px !important;">
          ${barcodeImg}
          <p style="text-align:center; margin:0;">${escapeHtml(txt(data.omr_serial_no ?? data.omrSerialNo))}</p>
        </div>
      </div>
    </div>
  `;
}

function buildOmrDocument(
  targetRows: AnyRow[],
  examName: string,
  collegeName: string,
): string {
  const bulk = targetRows.length > 1;
  const body = targetRows
    .map((row) => omrSheetSection(row, examName, collegeName, bulk))
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(collegeName || "Answer Sheet")}</title><style>${OMR_SHEET_STYLES}</style></head><body>${body}</body></html>`;
}

function buildAnswerDocument(targetRows: AnyRow[]): string {
  const bulk = targetRows.length > 1;
  const body = targetRows.map((row) => answerSheetSection(row, bulk)).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Answer Page</title><style>${ANSWER_SHEET_STYLES}</style></head><body>${body}</body></html>`;
}

export function useBarcodeStickerPrint(
  rows: AnyRow[],
  examName: string,
  collegeName?: string,
): {
  printMode: BarcodePrintMode | null;
  printButton: ReactNode;
  printView: ReactNode;
  printOmrFor: (row: AnyRow) => void;
  printAnswerFor: (row: AnyRow) => void;
} {
  const { mode: printMode, triggerPrint } = usePrintMode<BarcodePrintMode>();
  const college = collegeName ?? "";

  const printOmrSheets = useCallback(
    (targetRows: AnyRow[]) => {
      if (targetRows.length === 0) return;
      printHtmlInIframe(buildOmrDocument(targetRows, examName, college));
    },
    [examName, college],
  );

  const printAnswerSheets = useCallback((targetRows: AnyRow[]) => {
    if (targetRows.length === 0) return;
    printHtmlInIframe(buildAnswerDocument(targetRows));
  }, []);

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
      triggerPrint(mode);
    },
    [rows, printOmrSheets, printAnswerSheets, triggerPrint],
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

  function StickerCell({
    data,
    showHallticket,
    showSerial,
  }: {
    data: AnyRow;
    showHallticket: boolean;
    showSerial: boolean;
  }) {
    return (
      <div
        style={{
          width: "25%",
          boxSizing: "border-box",
          padding: "27px 0 9px 0",
          textAlign: "center",
          float: "left",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "-3px",
            fontSize: "12px",
          }}
        >
          {showHallticket ? (
            <span>{txt(data.hallticket_number ?? data.hallticketNumber)}</span>
          ) : null}
          {showSerial && txt(data.omr_serial_no ?? data.omrSerialNo) ? (
            <>
              &nbsp;&nbsp;
              <span>{txt(data.omr_serial_no ?? data.omrSerialNo)}</span>
            </>
          ) : null}
        </div>
        {barcodeOf(data) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/jpg;base64,${barcodeOf(data)}`}
            style={{ height: "30px", width: "180px" }}
            alt=""
          />
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: "7px",
            marginTop: "1px",
          }}
        >
          {txt(data.exam_date ?? data.examDate)} &nbsp;&nbsp;{" "}
          {txt(data.subject_code ?? data.subjectCode)}
        </div>
      </div>
    );
  }

  function StickerHeader({ row }: { row: AnyRow }) {
    return (
      <div
        style={{
          border: "1px solid #000",
          padding: "25px 0 9px 0",
          textAlign: "center",
          fontSize: "10px",
          fontWeight: "bold",
          marginBottom: "8px",
          pageBreakAfter: "avoid",
          breakAfter: "avoid",
        }}
      >
        <div style={{ fontSize: "10px", fontWeight: "bold" }}>
          {row?.exam_name ?? examName}
        </div>
        <div>|{row?.university_code ?? "—"}|</div>
        <div>
          <span>{txt(row?.exam_date)}</span> &nbsp;
          <span>{txt(row?.exam_session_name ?? row?.session_name)}</span>
        </div>
        <div>
          <span>Room: {row?.room_name ?? "—"}</span>
          {row?.subject_code ? (
            <>
              {" "}
              | <span>Subject: {row.subject_code}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  let printView: ReactNode = null;

  if (printMode && printMode in STICKER_FLAGS) {
    const { showHallticket, showSerial } = STICKER_FLAGS[printMode];
    const byRoom = new Map<string, AnyRow[]>();
    for (const s of rows) {
      const key = String(s.room_id ?? s.room_name ?? "all");
      if (!byRoom.has(key)) byRoom.set(key, []);
      byRoom.get(key)!.push(s);
    }
    const groups = Array.from(byRoom.values());
    printView = (
      <div
        data-print-root
        className="text-black"
        style={{
          fontFamily: "Times New Roman, Times, serif",
          padding: "20px",
          maxWidth: "990px",
          margin: "0 auto",
          backgroundColor: "#fff",
        }}
      >
        {groups.length === 0 || rows.length === 0 ? (
          <p className="text-[11px] text-center py-6">
            No students with barcodes to print.
          </p>
        ) : (
          groups.map((groupStudents, gi) => {
            const head = groupStudents[0];
            return (
              <div
                key={`stk-${gi}`}
                className={gi > 0 ? "page-break" : ""}
                style={{ marginBottom: "20px" }}
              >
                <StickerHeader row={head} />
                <div style={{ overflow: "auto", margin: "0 4px" }}>
                  {groupStudents.map((stu, ci) => (
                    <StickerCell
                      key={`stk-${gi}-${ci}`}
                      data={stu}
                      showHallticket={showHallticket}
                      showSerial={showSerial}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return { printMode, printButton, printView, printOmrFor, printAnswerFor };
}

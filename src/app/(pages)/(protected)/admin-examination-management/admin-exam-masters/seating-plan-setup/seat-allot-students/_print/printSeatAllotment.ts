import { printHtmlInIframe } from "@/lib/print";

type AnyRow = Record<string, any>;

export type SeatAllotmentPrintMode =
  | "seating"
  | "attendance"
  | "stickers"
  | "groupwise-stickers";

export type SeatingPrintSeat = {
  key: string;
  serial: string;
  status: string;
  hallticket: string;
  subjectCode: string;
};

const PRINT_SHOW_HALLTICKET = true;
const PRINT_SHOW_BARCODE_NO = false;

const BASE_PRINT_CSS = `
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
    font-family: "Times New Roman", Times, serif;
    color: #000;
    padding: 20px;
  }
  .page-break { page-break-before: always; break-before: page; }
  .row-between { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; padding: 0 4px; }
  .row-between-lg { display: flex; justify-content: space-between; font-size: 12px; margin-top: 32px; padding: 0 4px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 4px 6px; }
  .sticker-wrap { overflow: auto; margin: 0 4px; }
  .sticker-cell {
    width: 25%;
    box-sizing: border-box;
    padding: 27px 0 9px 0;
    text-align: center;
    float: left;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sticker-header {
    border: 1px solid #000;
    padding: 25px 0 9px 0;
    text-align: center;
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 8px;
    page-break-after: avoid;
    break-after: avoid;
  }
  .sticker-line { display: flex; justify-content: center; margin-bottom: -3px; font-size: 12px; }
  .sticker-meta { display: flex; justify-content: center; font-size: 7px; margin-top: 1px; }
  @page { margin: 1cm; }
`;

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="layout">${body}</div>
</body>
</html>`;
}

function buildSeatingHtml(opts: {
  roomLabel: string;
  examName: string;
  examDate: string;
  examSession: string;
  seatingGrid: SeatingPrintSeat[][];
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
}): string {
  const rows = opts.seatingGrid
    .map((row) => {
      const cells = row
        .map((seat) => {
          const blocked = seat.status.toLowerCase() === "blocked";
          const booked =
            seat.status.toLowerCase() === "booked" || !!seat.hallticket;
          const bg = blocked ? "background:#d1d5db;" : "";
          let inner = "";
          if (booked && seat.hallticket) {
            inner = `<p style="font-size:12px;margin:0">${esc(seat.hallticket)} - ${esc(seat.serial)}</p>
              <p style="font-size:10px;margin:0">${esc(seat.subjectCode)}</p>`;
          } else if (blocked) {
            inner = '<p style="font-size:10px;margin:0">BLOCKED</p>';
          }
          return `<td style="border:1px solid #000;padding:4px;vertical-align:top;min-width:72px;text-align:center;${bg}">${inner}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <h2 style="color:blue;margin:0 0 8px 0;font-size:18px">
      Seating Order : <span style="color:black">(${esc(opts.roomLabel || "—")})</span>
    </h2>
    <h3 style="margin-top:-2px;color:blue;font-size:14px">
      Exam Name : <span style="color:black">${esc(opts.examName || "—")}${opts.examDate ? ` (${esc(opts.examDate)})` : ""}</span>
    </h3>
    <h3 style="margin-top:-2px;font-size:14px">
      Date : ${esc(opts.examDate || "—")} &nbsp;|&nbsp; Session : ${esc(opts.examSession || "—")}
    </h3>
    <table id="printTable" style="margin:12px 0"><tbody>${rows}</tbody></table>
    <table style="margin-top:12px">
      <tr><td>Total Seats</td><td>${opts.totalSeats}</td></tr>
      <tr><td>Booked Seats</td><td>${opts.bookedSeats}</td></tr>
      <tr><td>Available Seats</td><td>${opts.availableSeats}</td></tr>
      <tr><td>Present</td><td>&nbsp;</td></tr>
      <tr><td>Absent</td><td>&nbsp;</td></tr>
    </table>`;
}

function groupAttendance(source: AnyRow[]): AnyRow[][] {
  const byKey = new Map<string, AnyRow[]>();
  for (const s of source) {
    const key = [
      s.fk_course_group_id ?? s.groupCode ?? s.group_code,
      s.fk_subject_id ?? s.subjectCode ?? s.subject_code,
      s.room_id ?? s.roomCode,
      s.fk_examtype_catdet_id ?? s.examTypeCode ?? "EX",
    ].join("|");
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(s);
  }
  return Array.from(byKey.values()).map((students) =>
    students
      .slice()
      .sort((a, b) =>
        String(a.hallticket_number ?? a.hallticketNumber ?? "").localeCompare(
          String(b.hallticket_number ?? b.hallticketNumber ?? ""),
          undefined,
          { numeric: true },
        ),
      ),
  );
}

function buildAttendanceHtml(opts: {
  source: AnyRow[];
  collegeLogo: string;
  examName: string;
  examType: string;
  examDate: string;
  examSession: string;
  roomLabel: string;
}): string {
  const groups = groupAttendance(opts.source);
  if (groups.length === 0) {
    return '<p style="text-align:center;padding:40px 0">No allotted students for this room.</p>';
  }

  return groups
    .map((students, gi) => {
      const s = students[0] ?? {};
      const isLab = String(s.subjectTypeCode ?? "").toUpperCase() === "LAB";
      const studentRows = students
        .map(
          (stu, i) => `<tr>
            <td>${i + 1}</td>
            <td>${esc(stu.hallticket_number ?? stu.hallticketNumber ?? "—")}</td>
            <td>${esc(stu.student_name ?? stu.stdName ?? "—")}</td>
            <td>&nbsp;</td>
          </tr>`,
        )
        .join("");
      const footer = isLab
        ? `<div class="row-between-lg"><div>Signature of the Internal Examiner</div><div>Signature of the External Examiner</div></div>`
        : `<div class="row-between-lg"><div>Signature of the Invigilator - I</div><div>Signature of the Invigilator - II</div><div>Controller of Examinations</div></div>`;

      return `<div class="${gi > 0 ? "page-break" : ""}">
        <img src="${esc(opts.collegeLogo)}" alt="" style="max-height:80px;margin:0 auto 8px;display:block" />
        <h4 style="text-align:center;font-weight:bold;margin:0 0 8px 0">ATTENDANCE SHEET</h4>
        <h4 style="text-align:center;margin:0 0 12px 0;font-size:14px">
          ${esc(s.exam_label_name ?? opts.examName ?? "—")}
          ${s.exam_type_name ? ` (${esc(s.exam_type_name)})` : opts.examType ? ` (${esc(opts.examType)})` : ""}
        </h4>
        <div class="row-between">
          <div><b>Branch :</b> ${esc(s.group_code ?? s.groupCode ?? "—")}</div>
          <div><b>Date :</b> ${esc(s.exam_date ?? opts.examDate ?? "—")}</div>
          <div><b>Room :</b> ${esc(s.room_name ?? opts.roomLabel ?? "—")}</div>
        </div>
        <div class="row-between" style="margin-bottom:12px">
          <div style="flex:2"><b>Subject:</b> ${esc(s.subject_name ?? s.subjectName ?? "—")}</div>
          <div><b>Session:</b> ${esc(s.sessin_time ?? s.session_name ?? opts.examSession ?? "—")}</div>
        </div>
        <table style="margin-bottom:12px">
          <thead><tr><th>S.NO</th><th>H.T. NO.</th><th>Student Name</th><th>Signature of the Student</th></tr></thead>
          <tbody>${studentRows}</tbody>
        </table>
        <table style="margin-bottom:12px">
          <thead><tr><th>Total No.of Students Registered</th><th>Total No.of Students Absent</th><th>Total No.of Students Present</th></tr></thead>
          <tbody><tr><td>${students.length}</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>
        </table>
        ${footer}
      </div>`;
    })
    .join("");
}

function stickerCellHtml(data: AnyRow, examDate: string): string {
  const hallticket = PRINT_SHOW_HALLTICKET
    ? `<span>${esc(data.hallticket_number ?? data.hallticketNumber ?? "")}</span>`
    : "";
  const serial =
    PRINT_SHOW_BARCODE_NO && (data.omr_serial_no ?? data.seatNumber)
      ? `&nbsp;&nbsp;<span>${esc(data.omr_serial_no ?? data.seatNumber)}</span>`
      : "";
  const barcode = data.omr_barcode
    ? `<img src="data:image/jpg;base64,${data.omr_barcode}" style="height:30px;width:180px" alt="" />`
    : "";
  return `<div class="sticker-cell">
    <div class="sticker-line">${hallticket}${serial}</div>
    ${barcode}
    <div class="sticker-meta">${esc(data.exam_date ?? examDate ?? "")} &nbsp;&nbsp; ${esc(data.subject_code ?? data.subjectCode ?? "")}</div>
  </div>`;
}

function stickerHeaderHtml(
  row: AnyRow,
  roomLabel: string,
  examName: string,
  examDate: string,
  examSession: string,
  extraGroup?: string,
): string {
  const groupLine = extraGroup
    ? ` | <span>Group: ${esc(extraGroup)}</span>`
    : "";
  return `<div class="sticker-header">
    <div>${esc(row?.exam_name ?? examName ?? "Exam")}</div>
    <div>|${esc(row?.university_code ?? "—")}|</div>
    <div><span>${esc(row?.exam_date ?? examDate ?? "")}</span> &nbsp; <span>${esc(row?.exam_session_name ?? examSession ?? "")}</span></div>
    <div><span>Room: ${esc(row?.room_name ?? roomLabel ?? "—")}</span>${groupLine}</div>
  </div>`;
}

function buildStickersHtml(opts: {
  source: AnyRow[];
  roomLabel: string;
  examName: string;
  examDate: string;
  examSession: string;
  groupwise: boolean;
}): string {
  const byRoom = new Map<string, AnyRow[]>();
  for (const s of opts.source) {
    const key = String(s.room_id ?? s.room_name ?? opts.roomLabel ?? "—");
    if (!byRoom.has(key)) byRoom.set(key, []);
    byRoom.get(key)!.push(s);
  }
  const rooms = Array.from(byRoom.values());
  if (rooms.length === 0) {
    return '<p style="text-align:center;padding:40px 0">No allotted students for this room.</p>';
  }

  const sections: string[] = [];
  rooms.forEach((roomStudents, ri) => {
    if (opts.groupwise) {
      const byGroup = new Map<string, AnyRow[]>();
      for (const s of roomStudents) {
        const key = String(
          s.fk_course_group_id ?? s.group_code ?? s.groupCode ?? "—",
        );
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key)!.push(s);
      }
      byGroup.forEach((students, groupKey) => {
        const head = students[0] ?? {};
        const pageClass = sections.length > 0 ? "page-break" : "";
        sections.push(`<div class="${pageClass}" style="margin-bottom:20px">
          ${stickerHeaderHtml(head, opts.roomLabel, opts.examName, opts.examDate, opts.examSession, head?.group_code ?? head?.groupCode ?? groupKey)}
          <div class="sticker-wrap">${students.map((stu) => stickerCellHtml(stu, opts.examDate)).join("")}</div>
        </div>`);
      });
      return;
    }
    const head = roomStudents[0] ?? {};
    const pageClass = ri > 0 ? "page-break" : "";
    sections.push(`<div class="${pageClass}" style="margin-bottom:20px">
      ${stickerHeaderHtml(head, opts.roomLabel, opts.examName, opts.examDate, opts.examSession)}
      <div class="sticker-wrap">${roomStudents.map((stu) => stickerCellHtml(stu, opts.examDate)).join("")}</div>
    </div>`);
  });
  return sections.join("");
}

export function printSeatAllotmentDocument(opts: {
  mode: SeatAllotmentPrintMode;
  details: {
    examName: string;
    examDate: string;
    examSession: string;
    examType: string;
    roomCode: string;
  };
  roomMeta: {
    roomLabel: string;
    totalRows: number;
    totalCols: number;
    capacity: number;
    bookedSeats: number;
    availableSeats: number;
  };
  seatingGrid: SeatingPrintSeat[][];
  seatRows: AnyRow[];
  attendanceRows: AnyRow[];
  collegeLogo: string;
}): void {
  const roomLabel = opts.roomMeta.roomLabel || opts.details.roomCode || "—";
  const totalSeats =
    (opts.roomMeta.totalRows || 0) * (opts.roomMeta.totalCols || 0) ||
    opts.roomMeta.capacity;

  let body = "";
  let title = "Seating Order";

  if (opts.mode === "seating") {
    body = buildSeatingHtml({
      roomLabel,
      examName: opts.details.examName,
      examDate: opts.details.examDate,
      examSession: opts.details.examSession,
      seatingGrid: opts.seatingGrid,
      totalSeats,
      bookedSeats: opts.roomMeta.bookedSeats,
      availableSeats: opts.roomMeta.availableSeats,
    });
  } else if (opts.mode === "attendance") {
    title = "Attendance Sheet";
    const source =
      opts.seatRows.length > 0 ? opts.seatRows : opts.attendanceRows;
    body = buildAttendanceHtml({
      source,
      collegeLogo: opts.collegeLogo,
      examName: opts.details.examName,
      examType: opts.details.examType,
      examDate: opts.details.examDate,
      examSession: opts.details.examSession,
      roomLabel,
    });
  } else {
    title =
      opts.mode === "groupwise-stickers"
        ? "Group-Wise Seating Stickers"
        : "Seating Stickers";
    const source =
      opts.seatRows.length > 0 ? opts.seatRows : opts.attendanceRows;
    body = buildStickersHtml({
      source,
      roomLabel,
      examName: opts.details.examName,
      examDate: opts.details.examDate,
      examSession: opts.details.examSession,
      groupwise: opts.mode === "groupwise-stickers",
    });
  }

  printHtmlInIframe(wrapDocument(title, body));
}

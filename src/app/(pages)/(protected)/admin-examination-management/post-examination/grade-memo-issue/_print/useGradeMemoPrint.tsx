"use client";

/**
 * Grade Memo Issue — printable Grade Card / Mark Sheet / Sample layouts.
 *
 * Angular behaviour:
 * - Print Grade Card / Mark Sheet / Bulk — window.print() on page (SUK templates only).
 * - Sample / Bulk Sample — navigate to grade-card-modal preview (Back + Print).
 *   SUK → GRADE CARD layout; non-SUK → SEMESTER GRADE REPORT (Matrusri, etc.).
 */

import {
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { usePrintMode } from "@/lib/print";
import { MINIO_URL } from "@/config/constants/api";

export type GradeMemoPrintMode =
  | "gradeCard"
  | "markSheet"
  | "sample"
  | "bulkGradeCard"
  | "bulkMarkSheet"
  | "bulkSample";

type AnyRow = Record<string, any>;

const BANNER = "/assets/images/avatars/SUK_BANNER_NEW.jpg";
const DEFAULT_STUDENT = "/assets/images/avatars/default_Student.png";

const SEM_DEFAULT: { id: string; value: string }[] = [
  { id: "ISEM", value: "I Semester" },
  { id: "IISEM", value: "II Semester" },
  { id: "IIISEM", value: "III Semester" },
  { id: "IVSEM", value: "IV Semester" },
  { id: "VSEM", value: "V Semester" },
  { id: "VISEM", value: "VI Semester" },
  { id: "VIISEM", value: "VII Semester" },
  { id: "VIIISEM", value: "VIII Semester" },
];

const SEM_DPHARM: { id: string; value: string }[] = [
  { id: "IYEAR", value: "Part 1" },
  { id: "IIYEAR", value: "Part 2" },
  { id: "IIIYEAR", value: "Part 3" },
  { id: "IVYEAR", value: "Part 4" },
];

const txt = (v: unknown) => (v == null ? "" : String(v));

function minioSrc(path: unknown): string {
  const p = txt(path).trim();
  if (!p) return "";
  if (/^(https?:\/\/|data:)/i.test(p)) return p;
  return `${MINIO_URL}${p.replace(/^\/+/, "")}`;
}

function fmtMemoDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

/** Angular sample modal: date:'d/MMM/y' */
function fmtMemoDateSlash(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getDate()}/${months[d.getMonth()]}/${d.getFullYear()}`;
}

function numToWords(num: number): string {
  const a = [
    "",
    "one ",
    "two ",
    "three ",
    "four ",
    "five ",
    "six ",
    "seven ",
    "eight ",
    "nine ",
    "ten ",
    "eleven ",
    "twelve ",
    "thirteen ",
    "fourteen ",
    "fifteen ",
    "sixteen ",
    "seventeen ",
    "eighteen ",
    "nineteen ",
  ];
  const b = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const raw = String(Math.floor(Math.abs(num) || 0));
  if (raw.length > 9) return "overflow";
  const n = `000000000${raw}`
    .slice(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    Number(n[1]) !== 0
      ? `${a[Number(n[1])] || `${b[Number(n[1][0])]} ${a[Number(n[1][1])]}`}crore `
      : "";
  str +=
    Number(n[2]) !== 0
      ? `${a[Number(n[2])] || `${b[Number(n[2][0])]} ${a[Number(n[2][1])]}`}lakh `
      : "";
  str +=
    Number(n[3]) !== 0
      ? `${a[Number(n[3])] || `${b[Number(n[3][0])]} ${a[Number(n[3][1])]}`}thousand `
      : "";
  str +=
    Number(n[4]) !== 0
      ? `${a[Number(n[4])] || `${b[Number(n[4][0])]} ${a[Number(n[4][1])]}`}hundred `
      : "";
  str +=
    Number(n[5]) !== 0
      ? `${str ? "and " : ""}${a[Number(n[5])] || `${b[Number(n[5][0])]} ${a[Number(n[5][1])]}`}`
      : "";
  return str.trim();
}

function semesterLabel(courseYearCode: string, courseCode: string): string {
  const list = courseCode.toUpperCase() === "DPHARM" ? SEM_DPHARM : SEM_DEFAULT;
  return list.find((s) => s.id === courseYearCode)?.value ?? courseYearCode;
}

function examTypeSuffix(
  courseCode: string,
  isRegular: boolean,
  isSupply: boolean,
): string {
  const isDPharm =
    courseCode === "D.Pharm" || courseCode.toUpperCase() === "DPHARM";
  if (isSupply && !isRegular) {
    return isDPharm
      ? "Annual Examination Supplementary"
      : "Make-Up/Supplementary SEE";
  }
  if (isRegular) {
    return isDPharm ? "Annual Examination" : "SEE";
  }
  return "";
}

function filteredGrades(grades: AnyRow[], regulationId: unknown): AnyRow[] {
  const rid = Number(regulationId);
  if (!Number.isFinite(rid) || rid <= 0) return grades;
  return grades.filter(
    (g) => Number(g.fk_regulation_id ?? g.regulationId ?? 0) === rid,
  );
}

function scoreRange(grade: AnyRow): string {
  const code = txt(grade.grade_code);
  if (code === "AB") return "00";
  const max = Number(grade.total_score_percentage ?? 0);
  const min = Number(grade.min_score_percent ?? 0);
  const parts: string[] = [];
  if (max !== 0 && max !== 100) parts.push(`<${max}`);
  if (min !== 0 && min !== 100) parts.push(`≥${min}`);
  return parts.join(" ");
}

function emptyPad(count: number): number[] {
  return count > 0 ? Array.from({ length: count }, (_, i) => i) : [];
}

/** Print HTML in a hidden iframe (avoids AppShell @media print blank sheets). */
function printHtmlInIframe(html: string): void {
  if (typeof document === "undefined") return;
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
  const wait = imgs.length
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
  void wait.then(() => {
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(cleanup, 1500);
    }, 100);
  });
}

// ── styles ───────────────────────────────────────────────────────────────────

const page: CSSProperties = {
  background: "#fff",
  color: "#000",
  fontFamily: "'Times New Roman', Times, serif",
  pageBreakAfter: "always",
  padding: "12px 16px",
  boxSizing: "border-box",
  minHeight: "100vh",
};

/** Compact A4 card — Angular grade-card-modal non-SUK (screen ~50% / 210mm). */
const semesterPage: CSSProperties = {
  background: "#fff",
  color: "#000",
  fontFamily: "'Maiandra GD', Maiandra, sans-serif",
  pageBreakAfter: "always",
  padding: "16px 74px 70px",
  boxSizing: "border-box",
  fontSize: 12,
  width: "100%",
  maxWidth: 650,
  minHeight: 900,
  margin: "0 auto",
};

const titleRed: CSSProperties = {
  fontSize: 20,
  margin: 0,
  color: "rgb(229, 49, 49)",
  textAlign: "center",
  fontWeight: 700,
};

const titleBlack: CSSProperties = {
  fontSize: 20,
  margin: 0,
  color: "#000",
  textAlign: "center",
  fontWeight: 700,
};

const semesterTitle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.1,
  margin: "8px 0 0",
  color: "#000",
  textAlign: "center",
  fontWeight: 700,
};

const semesterSubTitle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.2,
  margin: "4px 0 18px",
  color: "#000",
  textAlign: "center",
  fontWeight: 700,
};

const subTitleRed: CSSProperties = {
  fontSize: 17,
  margin: "0 0 10px",
  color: "rgb(229, 49, 49)",
  textAlign: "center",
};

const subTitleBlack: CSSProperties = {
  fontSize: 15,
  margin: "10px 0 0",
  color: "#000",
  textAlign: "center",
};

const infoTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};
const infoTh: CSSProperties = {
  textAlign: "left",
  fontWeight: 700,
  padding: "2px 0",
  width: "38%",
};
const infoTd: CSSProperties = {
  textAlign: "left",
  padding: "2px 0",
  textTransform: "uppercase",
};

const gridTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 11,
  marginTop: 8,
};
const gridCell: CSSProperties = {
  border: "1px solid #000",
  padding: "3px 4px",
  textAlign: "center",
  verticalAlign: "middle",
};
const gridHead: CSSProperties = { ...gridCell, fontWeight: 700 };
const leftCell: CSSProperties = { ...gridCell, textAlign: "left" };

const photoWrap: CSSProperties = {
  width: 110,
  textAlign: "center",
  flexShrink: 0,
};
const photo: CSSProperties = {
  height: 96,
  width: 100,
  objectFit: "cover",
  border: "1px solid #000",
};
const usn: CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: 12,
  fontWeight: 700,
};

const watermark: CSSProperties = {
  position: "absolute",
  opacity: 0.08,
  left: "50%",
  top: "45%",
  transform: "translate(-50%, -50%)",
  width: 280,
  pointerEvents: "none",
};

const scaleTable: CSSProperties = { ...gridTable, fontSize: 10 };
const note: CSSProperties = {
  fontSize: 11,
  textAlign: "justify",
  margin: "2px 0",
};

// ── pieces ───────────────────────────────────────────────────────────────────

function StudentHeader({ row }: { row: AnyRow }) {
  const photoPath = minioSrc(row.student_photo_path);
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <table style={infoTable}>
          <tbody>
            <tr>
              <th style={infoTh}>Name of the Student</th>
              <td style={{ padding: "0 3px", textAlign: "center", width: 12 }}>
                :
              </td>
              <td style={infoTd}>{txt(row.student_name)}</td>
            </tr>
            <tr>
              <th style={infoTh}>Father&apos;s / Mother&apos;s Name</th>
              <td style={{ padding: "0 3px", textAlign: "center" }}>:</td>
              <td style={infoTd}>{txt(row.father_name)}</td>
            </tr>
            <tr>
              <th style={infoTh}>Faculty Name</th>
              <td style={{ padding: "0 3px", textAlign: "center" }}>:</td>
              <td style={{ ...infoTd, textTransform: "none" }}>
                {txt(row.clg_name)}
              </td>
            </tr>
            <tr>
              <th style={infoTh}>Programme</th>
              <td style={{ padding: "0 3px", textAlign: "center" }}>:</td>
              <td style={{ ...infoTd, textTransform: "none" }}>
                {txt(row.course_code)} - {txt(row.group_name)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={photoWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoPath || DEFAULT_STUDENT} alt="" style={photo} />
        <div style={usn}>USN : {txt(row.hallticket_number)}</div>
      </div>
    </div>
  );
}

function ExamSubtitle({
  row,
  isRegular,
  isSupply,
  sample,
}: {
  row: AnyRow;
  isRegular: boolean;
  isSupply: boolean;
  sample?: boolean;
}) {
  if (sample) {
    return <p style={subTitleBlack}>{txt(row.exam_name)}</p>;
  }
  const courseCode = txt(row.course_code);
  const yearCode = txt(row.course_year_code);
  const sem = semesterLabel(yearCode, courseCode);
  const suffix = examTypeSuffix(courseCode, isRegular, isSupply);
  return (
    <p style={subTitleRed}>
      {courseCode} - {sem}
      {suffix ? ` ${suffix}` : ""} {txt(row.exam_month_year1)}
    </p>
  );
}

function GradeCardSubjects({
  rows,
  padTo,
}: {
  rows: AnyRow[];
  padTo?: number;
}) {
  const pad = padTo ? emptyPad(padTo - rows.length) : [];
  return (
    <table style={gridTable}>
      <thead>
        <tr>
          <th style={gridHead}>Sl. No.</th>
          <th style={gridHead}>Course Code</th>
          <th style={gridHead}>Course Title</th>
          <th style={gridHead}>
            Theory/
            <br />
            Practical
          </th>
          <th style={gridHead}>Credits Assigned</th>
          <th style={gridHead}>
            Credits Earned
            <br />
            (C)
          </th>
          <th style={gridHead}>
            Grade Points
            <br />
            (G)
          </th>
          <th style={gridHead}>Letter Grade</th>
          <th style={gridHead}>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => (
          <tr key={`${txt(s.subject_code)}-${i}`}>
            <td style={gridCell}>{i + 1}</td>
            <td style={leftCell}>{txt(s.subject_code)}</td>
            <td style={leftCell}>{txt(s.subject_name)}</td>
            <td style={gridCell}>
              {txt(s.subject_type) === "LAB" ? "Pr." : "Th."}
            </td>
            <td style={gridCell}>{txt(s.credits_assigned)}</td>
            <td style={gridCell}>{txt(s.credits)}</td>
            <td style={gridCell}>{txt(s.grade_points)}</td>
            <td style={gridCell}>{txt(s.grade)}</td>
            <td style={gridCell}>{txt(s.examresult)}</td>
          </tr>
        ))}
        {pad.map((i) => (
          <tr key={`pad-${i}`}>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
            <td style={gridCell}>&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function sumField(rows: AnyRow[], key: string): number {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

function SgpaSummaryFromList({ rows }: { rows: AnyRow[] }) {
  const head = rows[0] ?? {};
  const creditsReg =
    head.total_credits_registered ?? sumField(rows, "credits_registered");
  const creditsEarned = head.grandtotal_credits ?? sumField(rows, "credits");
  const ciGi = head.grand_ci_gi_points ?? sumField(rows, "ci_gi_points");
  return (
    <table style={{ ...gridTable, marginTop: 10 }}>
      <thead>
        <tr>
          <th style={gridHead}>Credit Registered</th>
          <th style={gridHead}>Credits Earned</th>
          <th style={gridHead}>Σ (Ci) X (Gi)</th>
          <th style={gridHead}>SGPA</th>
          <th style={gridHead}>CGPA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={gridCell}>{txt(creditsReg)}</td>
          <td style={gridCell}>{txt(creditsEarned)}</td>
          <td style={gridCell}>{txt(ciGi)}</td>
          <td style={gridCell}>
            {head.sgpa != null ? (
              txt(head.sgpa)
            ) : (
              <span style={{ color: "red", fontWeight: 700 }}>-</span>
            )}
          </td>
          <td style={gridCell}>
            {head.cgpa != null ? (
              txt(head.cgpa)
            ) : (
              <span style={{ color: "red", fontWeight: 700 }}>-</span>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function FooterBlock({
  row,
  memoDate,
  withNote,
  withSignature,
}: {
  row: AnyRow;
  memoDate: string;
  withNote?: boolean;
  withSignature?: boolean;
}) {
  const medium = txt(row.group_code) === "MA(K)" ? "Kannada" : "English";
  return (
    <div style={{ padding: "5px 0" }}>
      <p style={{ margin: 0, textAlign: "left" }}>
        Medium of Instruction :{" "}
        <span style={{ fontWeight: 500 }}>{medium}</span>
      </p>
      <p style={{ margin: "4px 0", textAlign: "left" }}>
        Date : <span style={{ fontWeight: 700 }}>{fmtMemoDate(memoDate)}</span>
      </p>
      {withNote && (
        <p style={note}>
          Note :{" "}
          <span>
            Sharnbasva University is not responsible for any inadvertent error
            that may have crept into results being published on internet or
            given in provisional result sheet. The results published on internet
            / provisional result sheet are for immediate reference to the
            examinees, <u>which shall not be the final grade card</u>.
          </span>
        </p>
      )}
      {withSignature && (
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontFamily: "cursive", fontSize: 18 }}>SG</p>
            <p style={{ margin: 0 }}>Registrar (Evaluation)</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GradeScaleTable({
  grades,
  regulationId,
}: {
  grades: AnyRow[];
  regulationId: unknown;
}) {
  const list = filteredGrades(grades, regulationId);
  if (list.length === 0) return null;
  return (
    <>
      <h5 style={{ margin: "8px 0 4px" }}>Grade Point Scale</h5>
      <table style={scaleTable}>
        <thead>
          <tr>
            <th style={gridHead}>Level</th>
            {list.map((g, i) => (
              <th key={`lvl-${i}`} style={gridHead}>
                {txt(g.description)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={gridHead}>Letter Grade</th>
            {list.map((g, i) => (
              <td key={`lg-${i}`} style={gridCell}>
                {txt(g.grade_name)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={gridHead}>Grade Points</td>
            {list.map((g, i) => (
              <td key={`gp-${i}`} style={gridCell}>
                {txt(g.credit_points)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={gridHead}>Score(marks) Range (%)</td>
            {list.map((g, i) => (
              <td key={`sr-${i}`} style={gridCell}>
                {scoreRange(g)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}

function MarkSheetSubjects({
  rows,
  dataFlag,
}: {
  rows: AnyRow[];
  dataFlag: boolean;
}) {
  const head = rows[0] ?? {};
  return (
    <table style={gridTable}>
      <thead>
        <tr>
          <th style={gridHead}>{dataFlag ? "Course Code" : "Subject Code"}</th>
          <th style={gridHead}>
            {dataFlag ? "Course Title" : "Subject Title"}
          </th>
          {dataFlag && <th style={gridHead}>Credits Assigned</th>}
          <th style={gridHead}>Max Marks</th>
          <th style={gridHead}>{dataFlag ? "CIE" : "Internal Exam"}</th>
          <th style={gridHead}>{dataFlag ? "SEE" : "Final Exam"}</th>
          <th style={gridHead}>
            {dataFlag ? "Marks Obtained" : "Total Marks Obtained"}
          </th>
          {dataFlag && (
            <th style={gridHead}>
              Credits Earned
              <br />
              (C)
            </th>
          )}
          {dataFlag && (
            <th style={gridHead}>
              Grade Points
              <br />
              (G)
            </th>
          )}
          {dataFlag && <th style={gridHead}>Letter Grade</th>}
          <th style={{ ...gridHead, width: "15%" }}>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => (
          <tr key={`${txt(s.subject_code)}-${i}`}>
            <td style={leftCell}>{txt(s.subject_code)}</td>
            <td style={leftCell}>{txt(s.subject_name)}</td>
            {dataFlag && <td style={gridCell}>{txt(s.credits_assigned)}</td>}
            <td style={gridCell}>{txt(s.totalMaxMarks)}</td>
            <td style={gridCell}>{txt(s.internal_marks)}</td>
            <td style={gridCell}>{txt(s.external_marks)}</td>
            <td style={gridCell}>{txt(s.totalMarks)}</td>
            {dataFlag && <td style={gridCell}>{txt(s.credits)}</td>}
            {dataFlag && <td style={gridCell}>{txt(s.grade_points)}</td>}
            {dataFlag && <td style={gridCell}>{txt(s.grade)}</td>}
            <td style={{ ...gridCell, width: "15%" }}>{txt(s.examresult)}</td>
          </tr>
        ))}
        {!dataFlag && (
          <tr>
            <td colSpan={7} style={{ ...leftCell, textAlign: "left" }}>
              Grand Total Out of {txt(head.grandtotalmaxmarks)} :{" "}
              <b>{txt(head.grandtotalmarks)}</b>
              <span style={{ marginLeft: 50 }}>
                <b>{numToWords(Number(head.grandtotalmarks) || 0)}</b>
              </span>
              <br />
              Remarks : <b>{txt(head.pas_division)}</b>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Banner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BANNER}
      alt=""
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}

function Watermark({ row }: { row: AnyRow }) {
  const src = minioSrc(row.org_logo);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={watermark} />
  );
}

function GradeCardPage({
  rows,
  memoDate,
  isRegular,
  isSupply,
  sample,
}: {
  rows: AnyRow[];
  memoDate: string;
  isRegular: boolean;
  isSupply: boolean;
  sample?: boolean;
}) {
  const head = rows[0] ?? {};
  return (
    <div style={{ ...page, position: "relative" }}>
      <div style={sample ? { marginTop: 170 } : undefined}>
        {!sample && <Banner show />}
        <p
          style={
            sample ? titleBlack : { ...titleRed, marginTop: sample ? 0 : -10 }
          }
        >
          GRADE CARD
        </p>
        <hr />
        <ExamSubtitle
          row={head}
          isRegular={isRegular}
          isSupply={isSupply}
          sample={sample}
        />
        <StudentHeader row={head} />
        {!sample && <Watermark row={head} />}
        <GradeCardSubjects rows={rows} padTo={sample ? 12 : undefined} />
        <SgpaSummaryFromList rows={rows} />
        <FooterBlock row={head} memoDate={memoDate} withSignature={!sample} />
      </div>
    </div>
  );
}

function MarkSheetPage({
  rows,
  memoDate,
  isRegular,
  isSupply,
  dataFlag,
  grades,
}: {
  rows: AnyRow[];
  memoDate: string;
  isRegular: boolean;
  isSupply: boolean;
  dataFlag: boolean;
  grades: AnyRow[];
}) {
  const head = rows[0] ?? {};
  return (
    <div style={{ ...page, position: "relative" }}>
      <Banner show />
      <p style={{ ...titleRed, marginTop: -10 }}>PROVISIONAL RESULT SHEET</p>
      <hr />
      <ExamSubtitle row={head} isRegular={isRegular} isSupply={isSupply} />
      <StudentHeader row={head} />
      <Watermark row={head} />
      <MarkSheetSubjects rows={rows} dataFlag={dataFlag} />
      {dataFlag && <SgpaSummaryFromList rows={rows} />}
      {dataFlag && (
        <GradeScaleTable grades={grades} regulationId={head.fk_regulation_id} />
      )}
      <FooterBlock row={head} memoDate={memoDate} withNote />
    </div>
  );
}

/** Angular grade-card-modal non-SUK bulk layout — SEMESTER GRADE REPORT (compact). */
function SemesterGradeReportPage({
  rows,
  memoDate,
  isLast,
}: {
  rows: AnyRow[];
  memoDate: string;
  isLast?: boolean;
}) {
  const head = rows[0] ?? {};
  const photoPath = minioSrc(head.student_photo_path);
  const pad = emptyPad(12 - rows.length);
  const infoRow = (striped: boolean): CSSProperties => ({
    height: 24,
    background: striped ? "#eef4ff" : "#fff",
  });
  const infoThS: CSSProperties = {
    border: 0,
    width: "34%",
    padding: "3px 5px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
  const infoTdS: CSSProperties = {
    border: 0,
    padding: "3px 5px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  };
  const infoColon: CSSProperties = {
    border: 0,
    width: 14,
    padding: "3px 2px",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
  };
  const gridHeadS: CSSProperties = {
    border: "1px solid #000",
    height: 38,
    padding: "2px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: 12,
    fontWeight: 700,
    fontStyle: "italic",
    background: "#fff",
  };
  const gridCellS: CSSProperties = {
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
    borderTop: 0,
    borderBottom: 0,
    height: 35,
    padding: "5px 2px",
    textAlign: "center",
    verticalAlign: "top",
    fontSize: 12,
    fontWeight: 700,
    background: "#fff",
  };
  const leftCellS: CSSProperties = {
    ...gridCellS,
    textAlign: "left",
    textTransform: "uppercase",
  };
  return (
    <div
      style={{ ...semesterPage, pageBreakAfter: isLast ? "auto" : "always" }}
      className="bulkPage"
    >
      <div
        style={{
          height: 8,
          width: "100%",
          background: "#000",
          borderTop: "2px solid #000",
        }}
      />
      <p style={semesterTitle}>SEMESTER GRADE REPORT</p>
      <p style={semesterSubTitle}>{txt(head.exam_name)}</p>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 4,
          marginBottom: 4,
        }}
      >
        <div style={{ flex: 1 }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", border: 0 }}
          >
            <tbody>
              <tr style={infoRow(false)}>
                <th style={infoThS}>Examination</th>
                <td style={infoColon}>:</td>
                <td style={{ ...infoTdS, textTransform: "none" }}>
                  {txt(head.exam_name)}
                </td>
              </tr>
              <tr style={infoRow(true)}>
                <th style={infoThS}>REF.No.</th>
                <td style={infoColon}>:</td>
                <td style={{ ...infoTdS, textTransform: "none" }}>
                  {txt(head.ref_no)}
                </td>
              </tr>
              <tr style={infoRow(false)}>
                <th style={infoThS}>Name</th>
                <td style={infoColon}>:</td>
                <td style={infoTdS}>{txt(head.student_name)}</td>
              </tr>
              <tr style={infoRow(true)}>
                <th style={infoThS}>Father&apos;s Name</th>
                <td style={infoColon}>:</td>
                <td style={infoTdS}>{txt(head.father_name)}</td>
              </tr>
              <tr style={infoRow(false)}>
                <th style={infoThS}>Mother&apos;s Name</th>
                <td style={infoColon}>:</td>
                <td style={{ ...infoTdS, textTransform: "none" }}>
                  {txt(head.mother_name)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          style={{ width: 80, textAlign: "left", flexShrink: 0, paddingTop: 2 }}
        >
          <div
            style={{
              fontSize: 8,
              lineHeight: 1,
              fontWeight: 700,
              marginBottom: 2,
              whiteSpace: "nowrap",
            }}
          >
            RollNo: {txt(head.hallticket_number)}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPath || DEFAULT_STUDENT}
            alt=""
            style={{
              display: "block",
              height: 72,
              width: 76,
              objectFit: "cover",
              border: "2px solid #000",
            }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_STUDENT;
            }}
          />
        </div>
      </div>
      <table
        style={{
          width: "calc(100% - 12px)",
          margin: "0 6px",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          border: "1px solid #000",
          color: "#000",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...gridHeadS, width: "22%" }}>Subject Code</th>
            <th style={{ ...gridHeadS, width: "59%" }}>Subject</th>
            <th style={{ ...gridHeadS, width: "8%" }}>Credits</th>
            <th style={{ ...gridHeadS, width: "11%" }}>
              Grade
              <br />
              Awarded
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={`${txt(s.subject_code)}-${i}`}>
              <td style={leftCellS}>{txt(s.subject_code)}</td>
              <td style={leftCellS}>{txt(s.subject_name)}</td>
              <td style={gridCellS}>{txt(s.credits)}</td>
              <td style={gridCellS}>{txt(s.grade)}</td>
            </tr>
          ))}
          {pad.map((i) => (
            <tr key={`pad-${i}`}>
              <td style={gridCellS}>&nbsp;</td>
              <td style={gridCellS}>&nbsp;</td>
              <td style={gridCellS}>&nbsp;</td>
              <td style={gridCellS}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          display: "flex",
          margin: "12px 8px 0",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          S.G.P.A &nbsp;: &nbsp;{txt(head.sgpa)}
          <br />
          The date of decleration of result &nbsp;: &nbsp;
          {fmtMemoDateSlash(memoDate)}
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          Result &nbsp;: &nbsp;{txt(head.result)}
        </div>
      </div>
    </div>
  );
}

function SamplePreviewChrome({
  onBack,
  onPrint,
  children,
}: {
  onBack: () => void;
  onPrint: () => void;
  children: ReactNode;
}) {
  // Angular: .main-div / .grade-card width ~50% centered on screen.
  return (
    <div data-print-root className="min-h-screen bg-[#f5f5f5]">
      <div className="flex justify-center gap-2 py-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-8 min-w-24"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="h-8 min-w-24 bg-blue-600 text-white hover:bg-blue-700"
          onClick={onPrint}
        >
          Print
        </Button>
      </div>
      <div
        data-print-pages
        className="mx-auto mb-4 w-full max-w-[650px] bg-white shadow-sm"
      >
        {children}
      </div>
    </div>
  );
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useGradeMemoPrint(params: {
  studentGroups: AnyRow[][];
  gradesRows: AnyRow[];
  memoDate: string;
  orgCode: string;
  isRegular: boolean;
  isSupply: boolean;
  dataFlag: boolean;
}): {
  printMode: GradeMemoPrintMode | null;
  triggerPrint: (mode: GradeMemoPrintMode) => void;
  printView: ReactNode;
  canPrint: boolean;
} {
  const {
    studentGroups,
    gradesRows,
    memoDate,
    orgCode,
    isRegular,
    isSupply,
    dataFlag,
  } = params;
  const { mode: autoPrintMode, triggerPrint: triggerAutoPrint } =
    usePrintMode<GradeMemoPrintMode>();
  // Angular SampleFormat / printBulkSampleGradeCard → grade-card-modal (preview, not auto-print)
  const [previewMode, setPreviewMode] = useState<
    "sample" | "bulkSample" | null
  >(null);

  const isSuk = orgCode.toUpperCase() === "SUK";
  const printMode = previewMode ?? autoPrintMode;

  const triggerPrint = useCallback(
    (mode: GradeMemoPrintMode) => {
      if (mode === "sample" || mode === "bulkSample") {
        setPreviewMode(mode);
        return;
      }
      triggerAutoPrint(mode);
    },
    [triggerAutoPrint],
  );

  const closePreview = useCallback(() => setPreviewMode(null), []);
  const printFromPreview = useCallback(() => {
    if (typeof document === "undefined") return;
    const root = document.querySelector("[data-print-pages]");
    if (!root) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Semester Grade Report</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: 'Times New Roman', Times, serif; }
  .bulkPage { page-break-after: always; box-sizing: border-box; width: 100%; }
  .bulkPage:last-child { page-break-after: auto; }
  @page { size: A4; margin: 10mm; }
  @media print {
    html, body { background: #fff !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>${root.innerHTML}</body></html>`;
    printHtmlInIframe(html);
  }, []);

  const groups =
    printMode === "gradeCard" ||
    printMode === "markSheet" ||
    printMode === "sample"
      ? studentGroups.slice(0, 1)
      : studentGroups;

  let printView: ReactNode = null;
  if (printMode && groups.length > 0) {
    const isSample = printMode === "sample" || printMode === "bulkSample";
    const isMark = printMode === "markSheet" || printMode === "bulkMarkSheet";

    const pages = groups.map((rows, idx) => {
      if (isSample && !isSuk) {
        return (
          <SemesterGradeReportPage
            key={idx}
            rows={rows}
            memoDate={memoDate}
            isLast={idx === groups.length - 1}
          />
        );
      }
      if (isMark) {
        return (
          <MarkSheetPage
            key={idx}
            rows={rows}
            memoDate={memoDate}
            isRegular={isRegular}
            isSupply={isSupply}
            dataFlag={dataFlag}
            grades={gradesRows}
          />
        );
      }
      return (
        <GradeCardPage
          key={idx}
          rows={rows}
          memoDate={memoDate}
          isRegular={isRegular}
          isSupply={isSupply}
          sample={isSample}
        />
      );
    });

    printView = isSample ? (
      <SamplePreviewChrome onBack={closePreview} onPrint={printFromPreview}>
        {pages}
      </SamplePreviewChrome>
    ) : (
      <div data-print-root>{pages}</div>
    );
  }

  return {
    printMode,
    triggerPrint,
    printView,
    canPrint: studentGroups.length > 0,
  };
}

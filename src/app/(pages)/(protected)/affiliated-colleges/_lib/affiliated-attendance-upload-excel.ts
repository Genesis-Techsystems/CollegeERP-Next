import * as XLSX from "xlsx";

type AnyRow = Record<string, unknown>;

export type AffiliatedAttendanceExcelDownloadResult =
  | { ok: true }
  | { ok: false; message: string };

function pickFirstRow(group: unknown): AnyRow | null {
  if (Array.isArray(group)) {
    const first = group[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as AnyRow;
    }
    return null;
  }
  if (group && typeof group === "object") return group as AnyRow;
  return null;
}

function sanitizeExcelFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

function downloadXlsx(
  fileName: string,
  rows: string[][],
): AffiliatedAttendanceExcelDownloadResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "Download is only available in the browser." };
  }
  if (rows.length === 0 || rows[0]?.length === 0) {
    return { ok: false, message: "No template columns available to export." };
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Student Attendence Data");

  const safeBase = sanitizeExcelFileName(fileName);
  const outName = safeBase.toLowerCase().endsWith(".xlsx")
    ? safeBase
    : `${safeBase.replace(/\.xls$/i, "")}.xlsx`;

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = outName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return { ok: true };
}

function findAttendanceStudentGroup(
  sampleExcelData: unknown[][],
): AnyRow[] | null {
  const primary = sampleExcelData[2];
  if (!Array.isArray(primary) || primary.length === 0) return null;
  return primary as AnyRow[];
}

/**
 * Angular `download()` on college-student-attendance-upload —
 * headers from `sampleExcelData[0][0]`, students from `sampleExcelData[2]`.
 */
export function downloadAffiliatedStudentAttendanceTemplateExcel(
  sampleExcelData: unknown[][],
  fileName: string,
): AffiliatedAttendanceExcelDownloadResult {
  const headerObj = pickFirstRow(sampleExcelData[0]);
  if (!headerObj) {
    return {
      ok: false,
      message: "Template headers missing. Reload the page and try again.",
    };
  }

  const students = findAttendanceStudentGroup(sampleExcelData);
  if (!students || students.length === 0) {
    return { ok: false, message: "No Students" };
  }

  const metadataKeys = Object.keys(headerObj).filter(
    (key) => key !== "subjectcodes" && key !== "subjectCodes",
  );
  const subjectCodes = String(
    headerObj.subjectcodes ?? headerObj.subjectCodes ?? "",
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const headers = [...metadataKeys, ...subjectCodes];

  const finalData: string[][] = [headers];
  const totalClassesRow = ["Total Classes Taken", ...Array(headers.length - 1).fill("")];
  finalData.push(totalClassesRow);

  const studentMap = new Map<string, string[]>();

  for (const student of students) {
    const hallticket = String(
      student.StudentHallticket ??
        student.studentHallticket ??
        student.hallticketno ??
        "",
    );
    if (!hallticket) continue;

    if (studentMap.has(hallticket)) {
      const existingRow = studentMap.get(hallticket)!;
      const subjectCode = String(student.subject_code ?? student.subjectcode ?? "");
      const subjectIndex = headers.indexOf(subjectCode);
      if (subjectIndex !== -1) {
        existingRow[subjectIndex] =
          String(student.assignment_status ?? "") === "Missing" ? "NA" : "";
      }
      continue;
    }

    const row: string[] = [];
    for (const key of metadataKeys) {
      row.push(String(student[key] ?? "NA"));
    }
    for (const subjectCode of subjectCodes) {
      const currentCode = String(student.subject_code ?? student.subjectcode ?? "");
      if (currentCode === subjectCode) {
        row.push(
          String(student.assignment_status ?? "") === "Missing" ? "NA" : "",
        );
      } else {
        row.push("");
      }
    }
    studentMap.set(hallticket, row);
  }

  for (const row of studentMap.values()) {
    finalData.push(row);
  }

  return downloadXlsx(fileName, finalData);
}

export type AffiliatedAttendancePivotRow = {
  sno: number;
  hallticketno: string;
  academicyear: string;
  courseyearcode: string;
  regulationcode: string;
  fromdate: string;
  todate: string;
  [subjectCode: string]: string | number;
};

/** Angular `getStagingData()` — pivot flat staging rows into hallticket × subject matrix. */
export function pivotAffiliatedAttendanceStagingRows(
  stagingRows: AnyRow[],
): { rows: AffiliatedAttendancePivotRow[]; subjectCodes: string[] } {
  const transformed: Record<string, AffiliatedAttendancePivotRow> = {};
  const subjectsSet = new Set<string>();

  for (const item of stagingRows) {
    const hallticketno = String(item.hallticketno ?? item.hallTicketNumber ?? "");
    const subjectcode = String(item.subjectcode ?? item.subjectCode ?? "");
    if (!hallticketno) continue;
    if (!transformed[hallticketno]) {
      transformed[hallticketno] = {
        sno: Number(item.srno ?? item.sno ?? 0),
        hallticketno,
        academicyear: String(item.academicyear ?? item.academicYear ?? ""),
        courseyearcode: String(item.courseyearcode ?? item.courseYearCode ?? ""),
        regulationcode: String(item.regulationcode ?? item.regulationCode ?? ""),
        fromdate: String(item.fromdate ?? item.fromDate ?? ""),
        todate: String(item.todate ?? item.toDate ?? ""),
      };
    }
    if (subjectcode) {
      transformed[hallticketno][subjectcode] = "Y";
      subjectsSet.add(subjectcode);
    }
  }

  const subjectCodes = Array.from(subjectsSet);
  for (const row of Object.values(transformed)) {
    for (const code of subjectCodes) {
      if (row[code] == null) row[code] = "N";
    }
  }

  return {
    rows: Object.values(transformed),
    subjectCodes,
  };
}

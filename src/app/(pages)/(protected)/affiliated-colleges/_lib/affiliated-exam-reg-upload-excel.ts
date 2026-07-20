import * as XLSX from "xlsx";

type AnyRow = Record<string, unknown>;

export type AffiliatedExamRegExcelDownloadResult =
  | { ok: true }
  | { ok: false; message: string };

function sanitizeExcelFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

/**
 * Browser download — same Blob approach as subject upload
 * (`XLSX.writeFile` is unreliable in this Next build).
 */
function downloadXlsx(
  fileName: string,
  rows: string[][],
): AffiliatedExamRegExcelDownloadResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "Download is only available in the browser." };
  }
  if (rows.length === 0 || rows[0]?.length === 0) {
    return { ok: false, message: "No template columns available to export." };
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Student Subject Data");

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

function pickHeaderRow(sampleExcelData: unknown[]): AnyRow | null {
  const group0 = sampleExcelData[0];
  if (Array.isArray(group0)) {
    const first = group0[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as AnyRow;
    }
    return null;
  }
  if (group0 && typeof group0 === "object") return group0 as AnyRow;
  return null;
}

/** Angular uses `sampleExcelData[1]`; fall back to first student-like group. */
function pickStudentRows(sampleExcelData: unknown[]): AnyRow[] {
  const primary = sampleExcelData[1];
  if (Array.isArray(primary)) {
    return primary.filter(
      (row): row is AnyRow =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  // Some responses put students after headers in later groups
  for (let i = 1; i < sampleExcelData.length; i++) {
    const group = sampleExcelData[i];
    if (!Array.isArray(group) || group.length === 0) continue;
    const first = group[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const row = first as AnyRow;
      if (
        "HallticketNo" in row ||
        "hallticketno" in row ||
        "hallticketNo" in row ||
        "subject_code" in row ||
        "subjectcode" in row
      ) {
        return group.filter(
          (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
        );
      }
    }
  }
  return [];
}

/**
 * Angular `download()` on college-student-exam-fee-registration.
 * Downloads whenever `sampleExcelData.length > 0` (headers-only is OK).
 */
export function downloadAffiliatedExamRegistrationTemplateExcel(
  sampleExcelData: unknown[][],
  fileName: string,
): AffiliatedExamRegExcelDownloadResult {
  // Angular: if (this.sampleExcelData && this.sampleExcelData.length > 0)
  if (!sampleExcelData || sampleExcelData.length === 0) {
    return { ok: false, message: "No Students" };
  }

  const headerObj = pickHeaderRow(sampleExcelData);
  if (!headerObj) {
    return {
      ok: false,
      message: "Template headers missing. Reload the page and try again.",
    };
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

  const students = pickStudentRows(sampleExcelData);
  const studentMap = new Map<string, string[]>();

  for (const student of students) {
    // Angular uses HallticketNo as map key (including undefined → "undefined")
    const hallticket = String(
      student.HallticketNo ??
        student.hallticketNo ??
        student.hallticketno ??
        student.HallTicketNo ??
        "",
    );

    if (studentMap.has(hallticket)) {
      const existingRow = studentMap.get(hallticket)!;
      const subjectCode = String(
        student.subject_code ?? student.subjectcode ?? "",
      );
      const subjectIndex = headers.indexOf(subjectCode);
      if (subjectIndex !== -1) {
        existingRow[subjectIndex] =
          String(student.assignment_status ?? "") === "Missing" ? "NA" : "Y";
      }
      continue;
    }

    const row: string[] = [];
    for (const key of metadataKeys) {
      const val = student[key];
      // Angular: student[key] || "NA"
      row.push(val != null && String(val) !== "" ? String(val) : "NA");
    }
    for (const subjectCode of subjectCodes) {
      const currentCode = String(
        student.subject_code ?? student.subjectcode ?? "",
      );
      if (currentCode === subjectCode) {
        row.push(
          String(student.assignment_status ?? "") === "Missing" ? "NA" : "Y",
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

export type AffiliatedExamRegPivotRow = {
  sno: number;
  hallticketno: string;
  academicyear: string;
  courseyearcode: string;
  regulationcode: string;
  [subjectCode: string]: string | number;
};

/** Case-insensitive field read — staging may use `hallticketno` or `HallticketNo`. */
function pickStagingField(item: AnyRow, ...names: string[]): unknown {
  for (const name of names) {
    if (item[name] != null && String(item[name]).trim() !== "") {
      return item[name];
    }
  }
  const lower = new Map(
    Object.keys(item).map((k) => [k.toLowerCase(), item[k]] as const),
  );
  for (const name of names) {
    const v = lower.get(name.toLowerCase());
    if (v != null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/** Angular `getStagingData()` — hallticket × subject matrix. */
export function pivotAffiliatedExamRegStagingRows(stagingRows: AnyRow[]): {
  rows: AffiliatedExamRegPivotRow[];
  subjectCodes: string[];
} {
  const transformed: Record<string, AffiliatedExamRegPivotRow> = {};
  const subjectsSet = new Set<string>();

  for (const item of stagingRows) {
    const hallticketno = String(
      pickStagingField(
        item,
        "hallticketno",
        "HallticketNo",
        "HallTicketNo",
        "hallTicketNumber",
        "hall_ticket_number",
        "StudentHallticket",
        "studentHallticket",
      ) ?? "",
    );
    const subjectcode = String(
      pickStagingField(item, "subjectcode", "subject_code", "subjectCode") ??
        "",
    );

    // Angular does not skip empty hallticket — still group the row
    if (!transformed[hallticketno]) {
      transformed[hallticketno] = {
        sno: Number(pickStagingField(item, "srno", "sno", "Sno", "SNo") ?? 0),
        hallticketno,
        academicyear: String(
          pickStagingField(
            item,
            "academicyear",
            "academicYear",
            "AcademicYear",
          ) ?? "",
        ),
        courseyearcode: String(
          pickStagingField(
            item,
            "courseyearcode",
            "courseYearCode",
            "CourseYearCode",
          ) ?? "",
        ),
        regulationcode: String(
          pickStagingField(
            item,
            "regulationcode",
            "regulationCode",
            "RegulationCode",
          ) ?? "",
        ),
      };
    }
    // Angular: transformedData[hallticketno][item.subjectcode] = 'Y'
    transformed[hallticketno][subjectcode] = "Y";
    if (subjectcode) subjectsSet.add(subjectcode);
  }

  const subjectCodes = Array.from(subjectsSet).filter(Boolean);
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
